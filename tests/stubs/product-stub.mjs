import { state } from "./db-state.mjs";

/**
 * Stand-in for `src/models/Product.ts` backed by an in-memory array.
 *
 * `Product.collection.find()` applies a real Mongo query filter so the tests
 * exercise `buildCatalogVisibilityFilter()` itself instead of asserting against
 * a hard-coded expectation. Only the operators the canonical filter uses are
 * supported; anything else throws so an unexpected filter cannot silently
 * pass every document.
 */

function fieldValue(doc, key) {
  return Object.prototype.hasOwnProperty.call(doc, key) ? doc[key] : undefined;
}

function matchesCondition(value, condition) {
  if (condition !== null && typeof condition === "object" && !Array.isArray(condition)) {
    return Object.entries(condition).every(([operator, expected]) => {
      switch (operator) {
        case "$exists":
          return expected ? value !== undefined : value === undefined;
        case "$in":
          return Array.isArray(expected) && expected.includes(value);
        case "$eq":
          return expected === null
            ? value === null || value === undefined
            : value === expected;
        default:
          throw new Error(`product-stub: unsupported Mongo operator "${operator}"`);
      }
    });
  }

  // Mongo equality on `null` matches both an absent field and an explicit null.
  if (condition === null) return value === null || value === undefined;
  return value === condition;
}

/** Minimal recursive Mongo filter matcher. Exported for direct assertions. */
export function matchesFilter(doc, filter) {
  return Object.entries(filter).every(([key, condition]) => {
    if (key === "$and") return condition.every((sub) => matchesFilter(doc, sub));
    if (key === "$or") return condition.some((sub) => matchesFilter(doc, sub));
    return matchesCondition(fieldValue(doc, key), condition);
  });
}

function compare(a, b, direction) {
  if (a === b) return 0;
  const result = a === undefined || a === null ? -1 : b === undefined || b === null ? 1 : a < b ? -1 : 1;
  return direction < 0 ? -result : result;
}

export const Product = {
  collection: {
    find(filter) {
      const cursor = {
        sort(spec) {
          cursor.sortSpec = spec;
          return cursor;
        },
        async toArray() {
          const rows = state.docs.filter((doc) => matchesFilter(doc, filter));
          const sortEntry = cursor.sortSpec ? Object.entries(cursor.sortSpec)[0] : null;
          if (sortEntry) {
            const [key, direction] = sortEntry;
            rows.sort((a, b) => compare(a[key], b[key], direction));
          }
          return rows.map((row) => ({ ...row }));
        },
      };
      cursor.sortSpec = null;
      return cursor;
    },
  },
};
