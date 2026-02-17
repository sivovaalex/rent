import { describe, it, expect } from 'vitest';
import {
  withCommission,
  withoutCommission,
  calculateCommission,
  formatPrice,
  COMMISSION_RATE,
  COMMISSION_MULTIPLIER,
} from '@/lib/constants';

describe('Pricing constants', () => {
  it('COMMISSION_RATE is 15%', () => {
    expect(COMMISSION_RATE).toBe(0.15);
  });

  it('COMMISSION_MULTIPLIER is 1.15', () => {
    expect(COMMISSION_MULTIPLIER).toBe(1.15);
  });
});

describe('withCommission', () => {
  it('adds 15% commission to a round price', () => {
    expect(withCommission(1000)).toBe(1150);
  });

  it('adds 15% commission to a fractional price', () => {
    expect(withCommission(3000)).toBe(3450);
  });

  it('rounds to 2 decimal places', () => {
    // 333 * 1.15 = 382.95
    expect(withCommission(333)).toBe(382.95);
  });

  it('handles zero', () => {
    expect(withCommission(0)).toBe(0);
  });

  it('handles small values', () => {
    // 1 * 1.15 = 1.15
    expect(withCommission(1)).toBe(1.15);
  });

  it('handles large values', () => {
    expect(withCommission(100000)).toBe(115000);
  });
});

describe('calculateCommission', () => {
  it('calculates 15% of a round price', () => {
    expect(calculateCommission(1000)).toBe(150);
  });

  it('rounds to 2 decimal places', () => {
    // 333 * 0.15 = 49.95
    expect(calculateCommission(333)).toBe(49.95);
  });

  it('handles zero', () => {
    expect(calculateCommission(0)).toBe(0);
  });
});

describe('formatPrice', () => {
  it('formats whole number without decimals', () => {
    expect(formatPrice(1000)).toBe('1000');
  });

  it('formats fractional price with 2 decimals', () => {
    expect(formatPrice(1000.5)).toBe('1000.50');
  });

  it('formats zero', () => {
    expect(formatPrice(0)).toBe('0');
  });

  it('rounds to 2 decimal places', () => {
    expect(formatPrice(999.999)).toBe('1000');
  });
});

describe('withoutCommission', () => {
  it('reverses withCommission for round prices', () => {
    // 1150 / 1.15 = 1000
    expect(withoutCommission(1150)).toBe(1000);
  });

  it('reverses withCommission for 3450', () => {
    // 3450 / 1.15 = 3000
    expect(withoutCommission(3450)).toBe(3000);
  });

  it('reverses withCommission for 575', () => {
    // 575 / 1.15 = 500
    expect(withoutCommission(575)).toBe(500);
  });

  it('handles zero', () => {
    expect(withoutCommission(0)).toBe(0);
  });

  it('roundtrip: withoutCommission(withCommission(x)) ≈ x', () => {
    const testPrices = [100, 500, 1000, 3000, 50000];
    testPrices.forEach((price) => {
      const roundtrip = withoutCommission(withCommission(price));
      expect(Math.abs(roundtrip - price)).toBeLessThanOrEqual(0.01);
    });
  });
});

describe('Price with commission consistency', () => {
  const testPrices = [500, 1000, 1500, 3000, 50000];

  testPrices.forEach((basePrice) => {
    it(`withCommission(${basePrice}) equals basePrice + calculateCommission(${basePrice})`, () => {
      const withComm = withCommission(basePrice);
      const commAmount = calculateCommission(basePrice);
      // withCommission rounds price * 1.15, calculateCommission rounds price * 0.15
      // Due to rounding, we allow 0.01 difference
      expect(Math.abs(withComm - (basePrice + commAmount))).toBeLessThanOrEqual(0.01);
    });
  });

  it('displayed price for 3000/day base should be 3450', () => {
    // This is the key business case: item with base price 3000 should show 3450 to users
    expect(withCommission(3000)).toBe(3450);
    expect(formatPrice(withCommission(3000))).toBe('3450');
  });

  it('displayed price for 500/day base should be 575', () => {
    expect(withCommission(500)).toBe(575);
    expect(formatPrice(withCommission(500))).toBe('575');
  });
});
