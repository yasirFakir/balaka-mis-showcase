/**
 * Formats a number into a compact representation (e.g., 1.2K, 1.5M).
 */
export function formatCompactNumber(number: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(number);
}
