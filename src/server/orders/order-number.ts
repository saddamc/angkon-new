import { Counter } from "@/models/Counter";

/**
 * Human-readable, collision-free order numbers.
 *
 * Format: `ANG-YYMMDD-NNNN` (Asia/Dhaka calendar day, atomic daily sequence).
 * The previous `Date.now() + random` scheme could collide; a duplicate key then
 * surfaced as a 500 and the checkout replied "success" for an order that was
 * never saved.
 */

const DHAKA_DATE = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Dhaka",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function orderDayStamp(now = new Date()): string {
  // en-CA formats as YYYY-MM-DD, so this is timezone-stable.
  const iso = DHAKA_DATE.format(now);
  return `${iso.slice(2, 4)}${iso.slice(5, 7)}${iso.slice(8, 10)}`;
}

export function formatOrderNumber(dayStamp: string, seq: number): string {
  return `ANG-${dayStamp}-${String(seq).padStart(4, "0")}`;
}

export async function nextOrderNumber(now = new Date()): Promise<string> {
  const day = orderDayStamp(now);
  const counter = await Counter.findByIdAndUpdate(
    `order:${day}`,
    { $inc: { seq: 1 } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

  const seq = Number(counter?.seq || 1);
  return formatOrderNumber(day, seq);
}
