/** Page numbers and ellipsis markers for compact numeric pagination. */
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
