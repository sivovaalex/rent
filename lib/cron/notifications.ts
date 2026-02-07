/**
 * Cron job: notification tasks
 * Daily run via Vercel Cron + inline checks from API routes
 */

import { prisma } from '@/lib/prisma';
import {
  notifyChatUnread,
  notifyModerationPendingItem,
  notifyModerationPendingUser,
  notifyRentalReturnReminder,
  notifyReviewReminder,
} from '@/lib/notifications';
import { autoRejectExpiredBookings } from '@/lib/approval';

interface CronResult {
  chatUnread: number;
  moderationReminders: number;
  returnReminders: number;
  reviewReminders: number;
  autoRejected: number;
  errors: string[];
}

/**
 * Atomically claim a notification slot.
 * Returns true if this call created the log (= should send).
 * Returns false if already sent (unique constraint violation).
 */
async function claimNotificationSlot(
  entityType: string,
  entityId: string,
  eventType: string,
  recipientId: string
): Promise<boolean> {
  try {
    await prisma.notificationLog.create({
      data: { entityType, entityId, eventType, recipientId },
    });
    return true;
  } catch {
    return false;
  }
}

// --- TASK 1: Chat Unread (30 min) ---
export async function processChatUnread(): Promise<number> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  let sent = 0;

  // Clean up logs for conversations that have been read
  const existingChatLogs = await prisma.notificationLog.findMany({
    where: { entityType: 'message_batch', eventType: 'chat_unread' },
  });

  for (const log of existingChatLogs) {
    const [recipientId, bookingId] = log.entityId.split(':');
    if (!recipientId || !bookingId) continue;

    const stillUnread = await prisma.message.count({
      where: {
        bookingId,
        senderId: { not: recipientId },
        isRead: false,
      },
    });

    if (stillUnread === 0) {
      await prisma.notificationLog.delete({ where: { id: log.id } }).catch(() => {});
    }
  }

  // Find unread messages older than 30 min, grouped by booking+sender
  const unreadGroups = await prisma.message.groupBy({
    by: ['bookingId', 'senderId'],
    where: {
      isRead: false,
      createdAt: { lte: thirtyMinAgo },
    },
    _count: { id: true },
  });

  for (const group of unreadGroups) {
    const booking = await prisma.booking.findUnique({
      where: { id: group.bookingId },
      include: {
        item: { select: { ownerId: true, title: true } },
      },
    });

    if (!booking) continue;

    // Recipient is the other participant (not the sender)
    const recipientId =
      group.senderId === booking.renterId
        ? booking.item.ownerId
        : booking.renterId;

    const entityId = `${recipientId}:${group.bookingId}`;

    const shouldSend = await claimNotificationSlot(
      'message_batch',
      entityId,
      'chat_unread',
      recipientId
    );

    if (shouldSend) {
      await notifyChatUnread(recipientId, {
        bookingId: group.bookingId,
        itemTitle: booking.item.title,
        unreadCount: group._count.id,
      }).catch(console.error);
      sent++;
    }
  }

  return sent;
}

// --- TASK 2: Moderation Reminders (30 min) ---
export async function processModerationReminders(): Promise<number> {
  const thirtyMinAgo = new Date(Date.now() - 30 * 60 * 1000);
  let sent = 0;

  // Get all admins/moderators
  const admins = await prisma.user.findMany({
    where: { role: { in: ['admin', 'moderator'] }, isBlocked: false },
    select: { id: true },
  });

  if (admins.length === 0) return 0;

  // Pending items older than 30 min
  const pendingItems = await prisma.item.findMany({
    where: {
      status: 'pending',
      createdAt: { lte: thirtyMinAgo },
    },
    select: { id: true, title: true },
  });

  for (const item of pendingItems) {
    for (const admin of admins) {
      const shouldSend = await claimNotificationSlot(
        'item',
        item.id,
        'moderation_pending_item',
        admin.id
      );
      if (shouldSend) {
        await notifyModerationPendingItem(admin.id, {
          itemId: item.id,
          itemTitle: item.title,
        }).catch(console.error);
        sent++;
      }
    }
  }

  // Pending user verifications older than 30 min
  const pendingUsers = await prisma.user.findMany({
    where: {
      verificationStatus: 'pending',
      verificationSubmittedAt: { lte: thirtyMinAgo, not: null },
    },
    select: { id: true, name: true },
  });

  for (const user of pendingUsers) {
    for (const admin of admins) {
      const shouldSend = await claimNotificationSlot(
        'user',
        user.id,
        'verification_pending_reminder',
        admin.id
      );
      if (shouldSend) {
        await notifyModerationPendingUser(admin.id, {
          userId: user.id,
          userName: user.name,
        }).catch(console.error);
        sent++;
      }
    }
  }

  return sent;
}

// --- TASK 3: Rental Return Reminders (1 day before endDate) ---
async function processReturnReminders(): Promise<number> {
  let sent = 0;

  const now = new Date();
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'active',
      endDate: {
        gte: tomorrowStart,
        lte: tomorrowEnd,
      },
    },
    include: {
      item: { select: { ownerId: true, title: true } },
      renter: { select: { id: true, name: true } },
    },
  });

  for (const booking of bookings) {
    // Notify renter
    const shouldNotifyRenter = await claimNotificationSlot(
      'booking',
      booking.id,
      'rental_return_reminder',
      booking.renterId
    );
    if (shouldNotifyRenter) {
      await notifyRentalReturnReminder(booking.renterId, {
        bookingId: booking.id,
        itemTitle: booking.item.title,
        isOwner: false,
      }).catch(console.error);
      sent++;
    }

    // Notify owner
    const shouldNotifyOwner = await claimNotificationSlot(
      'booking',
      booking.id,
      'rental_return_reminder',
      booking.item.ownerId
    );
    if (shouldNotifyOwner) {
      await notifyRentalReturnReminder(booking.item.ownerId, {
        bookingId: booking.id,
        itemTitle: booking.item.title,
        renterName: booking.renter.name,
        isOwner: true,
      }).catch(console.error);
      sent++;
    }
  }

  return sent;
}

// --- TASK 4: Review Reminders (24h after completion) ---
async function processReviewReminders(): Promise<number> {
  let sent = 0;

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'completed',
      completedAt: {
        lte: twentyFourHoursAgo,
        not: null,
      },
    },
    include: {
      item: { select: { ownerId: true, title: true } },
      renter: { select: { id: true } },
      reviews: { select: { type: true, userId: true } },
    },
  });

  for (const booking of bookings) {
    const hasRenterReview = booking.reviews.some(
      (r) => r.type === 'renter_review'
    );
    const hasOwnerReview = booking.reviews.some(
      (r) => r.type === 'owner_review'
    );

    // Remind renter if no renter_review
    if (!hasRenterReview) {
      const shouldSend = await claimNotificationSlot(
        'booking',
        booking.id,
        'review_reminder',
        booking.renterId
      );
      if (shouldSend) {
        await notifyReviewReminder(booking.renterId, {
          bookingId: booking.id,
          itemTitle: booking.item.title,
        }).catch(console.error);
        sent++;
      }
    }

    // Remind owner if no owner_review
    if (!hasOwnerReview) {
      const shouldSend = await claimNotificationSlot(
        'booking',
        booking.id,
        'review_reminder',
        booking.item.ownerId
      );
      if (shouldSend) {
        await notifyReviewReminder(booking.item.ownerId, {
          bookingId: booking.id,
          itemTitle: booking.item.title,
        }).catch(console.error);
        sent++;
      }
    }
  }

  return sent;
}

// --- MAIN COORDINATOR ---
export async function runNotificationCron(): Promise<CronResult> {
  const result: CronResult = {
    chatUnread: 0,
    moderationReminders: 0,
    returnReminders: 0,
    reviewReminders: 0,
    autoRejected: 0,
    errors: [],
  };

  try {
    result.chatUnread = await processChatUnread();
  } catch (err) {
    result.errors.push(`chatUnread: ${err}`);
    console.error('[CRON] chatUnread error:', err);
  }

  try {
    result.moderationReminders = await processModerationReminders();
  } catch (err) {
    result.errors.push(`moderationReminders: ${err}`);
    console.error('[CRON] moderationReminders error:', err);
  }

  try {
    result.returnReminders = await processReturnReminders();
  } catch (err) {
    result.errors.push(`returnReminders: ${err}`);
    console.error('[CRON] returnReminders error:', err);
  }

  try {
    result.reviewReminders = await processReviewReminders();
  } catch (err) {
    result.errors.push(`reviewReminders: ${err}`);
    console.error('[CRON] reviewReminders error:', err);
  }

  try {
    result.autoRejected = await autoRejectExpiredBookings();
  } catch (err) {
    result.errors.push(`autoReject: ${err}`);
    console.error('[CRON] autoReject error:', err);
  }

  console.log('[CRON] Notification cron completed:', result);
  return result;
}
