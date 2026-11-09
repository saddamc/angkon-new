/**
 * Window labels for the Events Manager header.
 *
 * Dates are computed from the clock. Hard-coding them (the old
 * "Oct 5 – Nov 1") made the page look stale the moment the month turned over.
 */

export type DatePreset = "today" | "7d" | "28d" | "month" | "year";

export function formatWindowLabel(preset: DatePreset, now = new Date()): string {
  const end = new Date(now);
  const start = new Date(now);
  const fmt = (d: Date) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  switch (preset) {
    case "today":
      return "Today (Hourly)";
    case "7d":
      start.setDate(start.getDate() - 6);
      return `Last 7 Days (${fmt(start)} – ${fmt(end)})`;
    case "month":
      start.setDate(1);
      return `This Month (${fmt(start)} – ${fmt(end)})`;
    case "year":
      start.setMonth(0, 1);
      return `This Year (${fmt(start)} – ${fmt(end)})`;
    case "28d":
    default:
      start.setDate(start.getDate() - 27);
      return `Last 28 Days (${fmt(start)} – ${fmt(end)})`;
  }
}
