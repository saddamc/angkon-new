/**
 * Single source of truth for the desktop orders table column track.
 *
 * The header (`orders-table.tsx`) and every row (`order-row.tsx`) must use the
 * exact same track, otherwise columns drift apart. The Payment and Fulfillment
 * columns are intentionally wider than the rest: they carry stacked badges,
 * consignment codes and action buttons that otherwise overlap neighbouring
 * cells.
 */
export const ORDER_TABLE_GRID =
  "grid-cols-[28px_minmax(130px,1fr)_minmax(145px,1fr)_minmax(160px,1.05fr)_124px_204px_98px_114px_80px]";

/** Minimum width of the desktop table before it scrolls horizontally. */
export const ORDER_TABLE_MIN_WIDTH = "lg:min-w-[1210px]";
