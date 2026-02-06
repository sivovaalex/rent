import { prisma } from '@/lib/prisma';
import type { ApprovalMode } from '@prisma/client';

interface ApprovalDecision {
  shouldAutoApprove: boolean;
  approvalMode: ApprovalMode;
  threshold?: number;
}

/**
 * Determine whether a booking should be auto-approved or require manual approval.
 * Priority: item.approvalMode ?? owner.defaultApprovalMode
 */
export async function getApprovalDecision(
  itemId: string,
  renterId: string
): Promise<ApprovalDecision> {
  const item = await prisma.item.findUnique({
    where: { id: itemId },
    include: {
      owner: {
        select: {
          defaultApprovalMode: true,
          defaultApprovalThreshold: true,
        },
      },
    },
  });

  if (!item) throw new Error('Item not found');

  // Item-level override takes priority over owner default
  const approvalMode = item.approvalMode ?? item.owner.defaultApprovalMode;
  const threshold = item.approvalThreshold ?? item.owner.defaultApprovalThreshold;

  switch (approvalMode) {
    case 'auto_approve':
      return { shouldAutoApprove: true, approvalMode };

    case 'manual':
      return { shouldAutoApprove: false, approvalMode };

    case 'rating_based': {
      const renter = await prisma.user.findUnique({
        where: { id: renterId },
        select: { rating: true },
      });
      const meetsThreshold = (renter?.rating ?? 5.0) >= threshold;
      return { shouldAutoApprove: meetsThreshold, approvalMode, threshold };
    }

    case 'verified_only': {
      const renter = await prisma.user.findUnique({
        where: { id: renterId },
        select: { isVerified: true },
      });
      return { shouldAutoApprove: !!renter?.isVerified, approvalMode };
    }

    default:
      return { shouldAutoApprove: true, approvalMode: 'auto_approve' };
  }
}

/**
 * Auto-reject bookings where the approval deadline has passed (24h timeout).
 * Called on every GET /api/bookings to avoid needing CRON.
 */
export async function autoRejectExpiredBookings(): Promise<number> {
  const expired = await prisma.booking.findMany({
    where: {
      status: 'pending_approval',
      approvalDeadline: { lte: new Date() },
    },
    include: { item: { select: { title: true } } },
  });

  if (expired.length === 0) return 0;

  for (const booking of expired) {
    await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: 'cancelled',
        rejectionReason: 'Время ожидания подтверждения истекло (24 часа)',
        rejectedAt: new Date(),
      },
    });

    // Notification will be sent lazily — import here to avoid circular deps
    try {
      const { notifyBookingRejected } = await import('@/lib/notifications');
      notifyBookingRejected(booking.renterId, {
        itemTitle: booking.item?.title || 'Лот',
        reason: 'Владелец не ответил в течение 24 часов',
      }).catch(console.error);
    } catch {
      // notifications module may not be available in all environments
    }
  }

  return expired.length;
}
