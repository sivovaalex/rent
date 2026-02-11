/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

import { detectSuspiciousActivity } from '@/lib/fraud-detection';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

describe('detectSuspiciousActivity', () => {
  const userId = 'user-1';
  const oldAccountDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const newAccountDate = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

  it('should return not suspicious for normal activity', async () => {
    prismaMock.booking.count
      .mockResolvedValueOnce(1)   // recent bookings: 1
      .mockResolvedValueOnce(0)   // cancelled bookings: 0
      .mockResolvedValueOnce(3);  // total bookings: 3

    prismaMock.user.findUnique.mockResolvedValue({
      createdAt: oldAccountDate,
    });

    const result = await detectSuspiciousActivity(userId);

    expect(result.isSuspicious).toBe(false);
    expect(result.reasons).toHaveLength(0);
  });

  it('should flag too many bookings in 1 hour', async () => {
    prismaMock.booking.count
      .mockResolvedValueOnce(6)   // recent bookings: 6 (> 5)
      .mockResolvedValueOnce(0)   // cancelled bookings: 0
      .mockResolvedValueOnce(10); // total bookings: 10

    prismaMock.user.findUnique.mockResolvedValue({
      createdAt: oldAccountDate,
    });

    const result = await detectSuspiciousActivity(userId);

    expect(result.isSuspicious).toBe(true);
    expect(result.reasons).toContain('Too many bookings in 1 hour');
  });

  it('should flag new account with immediate bookings', async () => {
    prismaMock.booking.count
      .mockResolvedValueOnce(1)   // recent bookings: 1
      .mockResolvedValueOnce(0)   // cancelled bookings: 0
      .mockResolvedValueOnce(1);  // total bookings: 1

    prismaMock.user.findUnique.mockResolvedValue({
      createdAt: newAccountDate,  // < 24 hours
    });

    const result = await detectSuspiciousActivity(userId);

    expect(result.isSuspicious).toBe(true);
    expect(result.reasons).toContain('New account with immediate bookings');
  });

  it('should flag high cancellation rate', async () => {
    prismaMock.booking.count
      .mockResolvedValueOnce(0)   // recent bookings: 0
      .mockResolvedValueOnce(5)   // cancelled bookings: 5
      .mockResolvedValueOnce(8);  // total bookings: 8 (5/8 = 62.5% > 50%)

    prismaMock.user.findUnique.mockResolvedValue({
      createdAt: oldAccountDate,
    });

    const result = await detectSuspiciousActivity(userId);

    expect(result.isSuspicious).toBe(true);
    expect(result.reasons).toContain('High cancellation rate');
  });

  it('should not flag cancellation rate with few bookings', async () => {
    prismaMock.booking.count
      .mockResolvedValueOnce(0)   // recent bookings: 0
      .mockResolvedValueOnce(3)   // cancelled bookings: 3
      .mockResolvedValueOnce(4);  // total bookings: 4 (< 5 threshold)

    prismaMock.user.findUnique.mockResolvedValue({
      createdAt: oldAccountDate,
    });

    const result = await detectSuspiciousActivity(userId);

    expect(result.isSuspicious).toBe(false);
  });

  it('should return multiple reasons when multiple checks fail', async () => {
    prismaMock.booking.count
      .mockResolvedValueOnce(7)   // recent bookings: 7 (> 5)
      .mockResolvedValueOnce(6)   // cancelled bookings: 6
      .mockResolvedValueOnce(10); // total bookings: 10 (6/10 = 60% > 50%)

    prismaMock.user.findUnique.mockResolvedValue({
      createdAt: newAccountDate, // new account
    });

    const result = await detectSuspiciousActivity(userId);

    expect(result.isSuspicious).toBe(true);
    expect(result.reasons.length).toBeGreaterThanOrEqual(2);
  });
});
