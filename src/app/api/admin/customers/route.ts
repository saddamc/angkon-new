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
  ids: Set<string>;
  names: string[];
  emails: Set<string>;
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

    // ── Union-find: link records that share an account, phone or email ─────
    const parent = new Map<string, string>();
    const find = (x: string): string => {
      if (!parent.has(x)) parent.set(x, x);
      let root = x;
      while (parent.get(root) !== root) root = parent.get(root)!;
      parent.set(x, root);
      return root;
    };
    const union = (a: string, b: string) => {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent.set(ra, rb);
    };

    const keysFor = (userId: string, phone: string, email: string) => {
      const keys: string[] = [];
      if (userId) keys.push(`u:${userId}`);
      if (phone) keys.push(`p:${phone}`);
      if (email) keys.push(`e:${email}`);
      return keys;
    };
    const link = (keys: string[]) => {
      keys.forEach((k) => find(k));
      for (let i = 1; i < keys.length; i++) union(keys[0], keys[i]);
    };

    const userKeys = users.map((u) =>
      keysFor(String(u._id), normalizePhone(u.phone), normalizeEmail(u.email)),
    );
    userKeys.forEach(link);

    const orderKeys = orders.map((o) => {
      const keys = keysFor(
        o.userId ? String(o.userId) : "",
        normalizePhone(o.customer?.phone),
        normalizeEmail(o.customer?.email),
      );
      // Order with no identifiers at all: keep it as its own anonymous customer
      return keys.length ? keys : [`o:${o.orderNumber}`];
    });
    orderKeys.forEach(link);

    const groups = new Map<string, Group>();
    const groupOf = (key: string): Group => {
      const root = find(key);
      let g = groups.get(root);
      if (!g) {
        g = {
          ids: new Set(),
          names: [],
          emails: new Set(),
          phones: new Set(),
          addresses: [],
          orders: [],
        };
        groups.set(root, g);
      }
      return g;
    };

    // Registered accounts (including those who never ordered)
    users.forEach((u, i) => {
      const g = groupOf(userKeys[i][0]);
      g.ids.add(String(u._id));
      if (u.name) g.names.push(u.name);
      if (u.email) g.emails.add(normalizeEmail(u.email));
      if (u.phone) g.phones.add(normalizePhone(u.phone));
      (u.addresses || []).forEach((a) => {
        g.addresses.push({ address: a.address, city: a.district || a.city, postalCode: a.postalCode || "" });
      });
      g.user = {
        emailVerified: !!u.emailVerified,
        source: u.source || "register",
        createdAt: u.createdAt,
        hasPassword: !!u.password,
      };
    });

    // Orders (oldest data is overwritten by newest since list is newest-first → use first seen as "latest")
    orders.forEach((o, i) => {
      const g = groupOf(orderKeys[i][0]);
      const c = o.customer;
      if (c?.fullName) g.names.push(c.fullName);
      if (c?.email) g.emails.add(normalizeEmail(c.email));
      if (c?.phone) g.phones.add(normalizePhone(c.phone));
      if (c?.address) {
        g.addresses.push({
          address: c.address,
          city: c.district || c.city || "",
          postalCode: c.postalCode || "",
        });
      }
      g.orders.push({
        id: String(o._id),
        number: o.orderNumber,
        status: o.orderStatus,
        paymentMethod: o.paymentMethod,
        paymentStatus: o.paymentStatus,
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
      const emails = Array.from(g.emails).filter(Boolean);

      return {
        key: Array.from(g.ids)[0] || phones[0] || emails[0] || g.orders[0]?.number || "",
        name: g.names[0] || "Guest",
        email: emails[0] || "",
        phone: phones[0] || "",
        otherPhones: phones.slice(1),
        otherEmails: emails.slice(1),
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
