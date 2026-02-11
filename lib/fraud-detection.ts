/**
 * Fraud detection for booking operations.
 * Checks for suspicious activity patterns before allowing booking creation.
 */

import { prisma } from '@/lib/prisma';

export interface FraudCheckResult {
  isSuspicious: boolean;
  reasons: string[];
}

export async function detectSuspiciousActivity(userId: string): Promise<FraudCheckResult> {
  const reasons: string[] = [];

  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  // Parallel queries for efficiency
  const [recentBookings, user, cancelledBookings, totalBookings] = await Promise.all([
    // 1. Too many bookings in the last hour
    prisma.booking.count({
      where: {
        renterId: userId,
        createdAt: { gte: oneHourAgo },
      },
    }),
    // 2. Account age check
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    }),
    // 3. Cancelled bookings count
    prisma.booking.count({
      where: {
        renterId: userId,
        status: 'cancelled',
      },
    }),
    // 4. Total bookings count
    prisma.booking.count({
      where: { renterId: userId },
    }),
  ]);

  // Check 1: Too many bookings in 1 hour
  if (recentBookings > 5) {
    reasons.push('Too many bookings in 1 hour');
  }

  // Check 2: New account with immediate bookings
  if (user) {
    const accountAge = Date.now() - user.createdAt.getTime();
    const isNewAccount = accountAge < 24 * 60 * 60 * 1000; // < 24 hours

    if (isNewAccount && recentBookings > 0) {
      reasons.push('New account with immediate bookings');
    }
  }

  // Check 3: High cancellation rate
  if (totalBookings > 5 && cancelledBookings / totalBookings > 0.5) {
    reasons.push('High cancellation rate');
  }

  return {
    isSuspicious: reasons.length > 0,
    reasons,
  };
}
