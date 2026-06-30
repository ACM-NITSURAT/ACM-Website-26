/**
 * Formats a number to a compact string (e.g., 14230 -> 14.2K)
 * using the Intl.NumberFormat API.
 */
export function formatCompactNumber(number: number): string {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(number);
}
