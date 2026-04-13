/**
 * @file pagination.ts
 * Pure utility for generating pagination button ranges with ellipsis gaps.
 */

/**
 * Builds an array of page numbers and `"ellipsis"` markers for a compact
 * pagination bar. Always includes the first and last page, with a window
 * of ±1 around the current page.
 *
 * @param current - The currently active page (1-based).
 * @param total   - Total number of pages.
 * @returns An ordered array, e.g. `[1, "ellipsis", 4, 5, 6, "ellipsis", 20]`.
 */
export function buildPaginationItems(
  current: number,
  total: number,
): (number | "ellipsis")[] {
  if (total <= 0) return [];
  if (total === 1) return [1];
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const delta = 1;
  const left = Math.max(2, current - delta);
  const right = Math.min(total - 1, current + delta);

  const out: (number | "ellipsis")[] = [1];
  if (left > 2) out.push("ellipsis");
  for (let p = left; p <= right; p++) {
    out.push(p);
  }
  if (right < total - 1) out.push("ellipsis");
  out.push(total);
  return out;
}
