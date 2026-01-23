/**
 * Application constants
 */

// Commission rate (15%)
export const COMMISSION_RATE = 0.15;

// Commission multiplier for price calculation (1 + COMMISSION_RATE)
export const COMMISSION_MULTIPLIER = 1 + COMMISSION_RATE;

/**
 * Calculate price with commission
 * @param price - base price
 * @returns price with commission, rounded to 2 decimal places
 */
export function withCommission(price: number): number {
  return Math.round(price * COMMISSION_MULTIPLIER * 100) / 100;
}

/**
 * Calculate commission amount
 * @param price - base price
 * @returns commission amount, rounded to 2 decimal places
 */
export function calculateCommission(price: number): number {
  return Math.round(price * COMMISSION_RATE * 100) / 100;
}

/**
 * Format price for display
 * @param price - price value
 * @returns formatted price string
 */
export function formatPrice(price: number): string {
  const rounded = Math.round(price * 100) / 100;
  // If whole number, don't show decimals
  if (rounded === Math.floor(rounded)) {
    return rounded.toString();
  }
  return rounded.toFixed(2);
}
