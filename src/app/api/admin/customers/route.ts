import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { Order } from "@/models/Order";
import { User } from "@/models/User";

// GET /api/admin/customers — every customer (registered accounts + guest buyers),
// merged by phone / email / account, with lifetime stats computed over ALL orders.
// (Auth is enforced by src/proxy.ts for every /api/admin/* route.)

/** 880 1829-370699 / +8801829370699 / 01829370699 → 01829370699 */
function normalizePhone(raw?: string): string {
  let d = String(raw ?? "").replace(/\D/g, "");
  if (d.startsWith("880")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = `0${d}`;
  return d;
}

function normalizeEmail(raw?: string): string {
  return String(raw ?? "").trim().toLowerCase();
}

/** Orders that never bring in money must not count toward "total spent". */
function isRevenueOrder(status: string, paymentStatus?: string): boolean {
  const s = String(status).toLowerCase();
  if (["cancelled", "canceled", "refunded", "failed", "trash"].includes(s)) return false;
  if (paymentStatus === "failed") return false;
  return true;
}

interface Group {
  key: string;
  ids: Set<string>;
  names: string[];
  email: string;
  phones: Set<string>;
  addresses: { address: string; city: string; postalCode: string }[];
  user?: {
    emailVerified: boolean;
    source: string;
    createdAt: Date;
    hasPassword: boolean;
  };
  orders: {
    id: string;
    number: string;
    status: string;
    paymentMethod: string;
    paymentStatus: string;
    total: number;
    itemCount: number;
    items: { name: string; quantity: number; size?: string }[];
    date: Date;
  }[];
}

export async function GET() {
  try {
    await connectToDatabase();

    const [orders, users] = await Promise.all([
      Order.find({})
        .select("orderNumber userId customer items total orderStatus paymentMethod paymentStatus createdAt")
        .sort({ createdAt: -1 })
        .lean(),
      User.find({ role: "customer" }).lean(),
    ]);

    // Map userId -> user for quick order fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userById = new Map<string, any>();
    users.forEach((u) => {
      userById.set(String(u._id), u);
    });

    // ── Group strictly by unique customer EMAIL (or phone for guest checkouts without email) ──
    const groups = new Map<string, Group>();
    const getOrCreateGroup = (key: string, defaultEmail = ""): Group => {
      let g = groups.get(key);
      if (!g) {
        g = {
          key,
          ids: new Set(),
          names: [],
          email: defaultEmail,
          phones: new Set(),
          addresses: [],
          orders: [],
        };
        groups.set(key, g);
      }
      return g;
    };

    // 1. Seed registered customer accounts strictly by their own email
    users.forEach((u) => {
      const email = normalizeEmail(u.email);
      const key = email ? `email:${email}` : `user:${String(u._id)}`;
      const g = getOrCreateGroup(key, email);
      g.ids.add(String(u._id));
      if (u.name) g.names.push(u.name);
      if (u.phone) g.phones.add(normalizePhone(u.phone));
      (u.addresses || []).forEach((a) => {
        if (a.address) {
          g.addresses.push({ address: a.address, city: a.district || a.city, postalCode: a.postalCode || "" });
        }
      });
      g.user = {
        emailVerified: !!u.emailVerified,
        source: u.source || "register",
        createdAt: u.createdAt,
        hasPassword: !!u.password,
      };
    });

    // 2. Associate each order strictly with its customer email (or phone for guest phone-only checkouts)
    orders.forEach((o) => {
      let email = normalizeEmail(o.customer?.email);
      if (!email && o.userId) {
        const u = userById.get(String(o.userId));
        if (u?.email) email = normalizeEmail(u.email);
      }

      let key: string;
      if (email) {
        key = `email:${email}`;
      } else {
        const phone = normalizePhone(o.customer?.phone);
        key = phone ? `phone:${phone}` : `order:${o.orderNumber}`;
      }

      const g = getOrCreateGroup(key, email);
      if (o.userId) g.ids.add(String(o.userId));
      const c = o.customer;
      if (c?.fullName) g.names.unshift(c.fullName); // newest order name takes priority
      if (c?.phone) g.phones.add(normalizePhone(c.phone));
      if (c?.address) {
        g.addresses.unshift({
          address: c.address,
          city: c.district || c.city || "",
          postalCode: c.postalCode || "",
        });
      }
      g.orders.push({
        id: String(o._id),
        number: o.orderNumber,
        status: o.orderStatus,
        paymentMethod: o.paymentMethod || "cod",
        paymentStatus: o.paymentStatus || "pending",
        total: Number(o.total) || 0,
        itemCount: (o.items || []).reduce((n, it) => n + (it.quantity || 0), 0),
        items: (o.items || []).map((it) => ({ name: it.name, quantity: it.quantity, size: it.size || undefined })),
        date: o.createdAt,
      });
    });

    const customers = Array.from(groups.values()).map((g) => {
      // orders are newest-first already
      const valid = g.orders.filter((o) => isRevenueOrder(o.status, o.paymentStatus));
      const cancelled = g.orders.filter((o) => ["cancelled", "canceled"].includes(o.status));
      const delivered = g.orders.filter((o) => ["delivered", "completed"].includes(o.status));
      const totalSpent = valid.reduce((sum, o) => sum + o.total, 0);

      // Distinct, most-recent-first addresses
      const seen = new Set<string>();
      const addresses = g.addresses.filter((a) => {
        const k = `${a.address}|${a.city}`.toLowerCase();
        if (!a.address || seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      const phones = Array.from(g.phones).filter(Boolean);

      return {
        key: g.key,
        name: g.names[0] || (g.email ? g.email.split("@")[0] : "Guest"),
        email: g.email || "",
        phone: phones[0] || "",
        otherPhones: phones.slice(1),
        otherEmails: [], // Every account is strictly partitioned by email — no mixing
        city: addresses[0]?.city || "",
        address: addresses[0]?.address || "",
        postalCode: addresses[0]?.postalCode || "",
        addresses,
        registered: !!g.user,
        emailVerified: g.user?.emailVerified ?? false,
        source: g.user?.source ?? "guest",
        joinedAt: g.user?.createdAt ?? g.orders[g.orders.length - 1]?.date ?? null,
        totalOrders: g.orders.length,
        validOrders: valid.length,
        deliveredOrders: delivered.length,
        cancelledOrders: cancelled.length,
        totalSpent,
        averageOrderValue: valid.length ? Math.round(totalSpent / valid.length) : 0,
        lastOrderDate: g.orders[0]?.date ?? null,
        orders: g.orders,
      };
    });

    customers.sort((a, b) => b.totalSpent - a.totalSpent || b.totalOrders - a.totalOrders);

    return NextResponse.json(
      { customers, total: customers.length },
      { headers: { "Cache-Control": "no-store, no-cache, must-revalidate" } },
    );
  } catch (err) {
    console.error("Admin customers fetch error:", err);
    return NextResponse.json({ error: "Failed to load customers." }, { status: 500 });
  }
}
