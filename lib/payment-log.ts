/**
 * Payment logging utility.
 * All payment operations (create, succeed, fail, refund) are logged
 * for audit trail and fraud investigation.
 */

import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

export interface PaymentLogData {
  userId: string;
  bookingId?: string;
  action: 'initiated' | 'succeeded' | 'failed' | 'refunded' | 'mock';
  amount: number;
  provider: 'yookassa' | 'mock';
  metadata?: Record<string, string | number | boolean | null>;
}

/**
 * Log a payment operation to the database.
 * Non-blocking — errors are caught and logged to console.
 */
export async function logPayment(data: PaymentLogData): Promise<void> {
  try {
    await prisma.paymentLog.create({
      data: {
        userId: data.userId,
        bookingId: data.bookingId || null,
        action: data.action,
        amount: data.amount,
        provider: data.provider,
        metadata: data.metadata ? (data.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      },
    });
  } catch (error) {
    console.error('[PAYMENT_LOG] Failed to log payment:', error, data);
  }
}
