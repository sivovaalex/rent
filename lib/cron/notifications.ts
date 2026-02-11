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

  if (existingChatLogs.length > 0) {
    const logPairs = existingChatLogs
      .map(log => {
        const [recipientId, bookingId] = log.entityId.split(':');
        return { logId: log.id, recipientId, bookingId };
      })
      .filter(p => p.recipientId && p.bookingId);

    const cleanupBookingIds = [...new Set(logPairs.map(p => p.bookingId!))];

    // Batch: 1 groupBy instead of N individual count queries
    const unreadMsgGroups = await prisma.message.groupBy({
      by: ['bookingId', 'senderId'],
      where: {
        bookingId: { in: cleanupBookingIds },
        isRead: false,
      },
    });

    // Log should be deleted if no unread messages exist for that recipient
    const logIdsToDelete = logPairs
      .filter(p => {
        return !unreadMsgGroups.some(
          g => g.bookingId === p.bookingId && g.senderId !== p.recipientId
        );
      })
      .map(p => p.logId);

    // Batch delete instead of N individual deletes
    if (logIdsToDelete.length > 0) {
      await prisma.notificationLog.deleteMany({
        where: { id: { in: logIdsToDelete } },
      });
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

  if (unreadGroups.length === 0) return sent;

  // Batch load all bookings at once (1 query instead of N)
  const bookingIds = [...new Set(unreadGroups.map(g => g.bookingId))];
  const bookings = await prisma.booking.findMany({
    where: { id: { in: bookingIds } },
    include: {
      item: { select: { ownerId: true, title: true } },
    },
  });
  const bookingMap = new Map(bookings.map(b => [b.id, b]));

  for (const group of unreadGroups) {
    const booking = bookingMap.get(group.bookingId);
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

  const adminIds = admins.map(a => a.id);

  // Pending items older than 30 min
  const pendingItems = await prisma.item.findMany({
    where: {
      status: 'pending',
      createdAt: { lte: thirtyMinAgo },
    },
    select: { id: true, title: true },
  });

  if (pendingItems.length > 0) {
    // Batch: find already-sent notifications (1 query instead of N×M)
    const existingItemLogs = await prisma.notificationLog.findMany({
      where: {
        entityType: 'item',
        eventType: 'moderation_pending_item',
        entityId: { in: pendingItems.map(i => i.id) },
        recipientId: { in: adminIds },
      },
      select: { entityId: true, recipientId: true },
    });
    const existingItemSet = new Set(
      existingItemLogs.map(l => `${l.entityId}:${l.recipientId}`)
    );

    // Filter to new slots only
    const newItemSlots: Array<{ entityType: string; entityId: string; eventType: string; recipientId: string }> = [];
    const itemSlotMeta: Array<{ recipientId: string; itemId: string; itemTitle: string }> = [];

    for (const item of pendingItems) {
      for (const admin of admins) {
        if (!existingItemSet.has(`${item.id}:${admin.id}`)) {
          newItemSlots.push({
            entityType: 'item',
            entityId: item.id,
            eventType: 'moderation_pending_item',
            recipientId: admin.id,
          });
          itemSlotMeta.push({ recipientId: admin.id, itemId: item.id, itemTitle: item.title });
        }
      }
    }

    // Batch create (1 query instead of N×M)
    if (newItemSlots.length > 0) {
      await prisma.notificationLog.createMany({ data: newItemSlots, skipDuplicates: true });
      for (const meta of itemSlotMeta) {
        await notifyModerationPendingItem(meta.recipientId, {
          itemId: meta.itemId,
          itemTitle: meta.itemTitle,
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

  if (pendingUsers.length > 0) {
    // Batch: find already-sent notifications (1 query instead of N×M)
    const existingUserLogs = await prisma.notificationLog.findMany({
      where: {
        entityType: 'user',
        eventType: 'verification_pending_reminder',
        entityId: { in: pendingUsers.map(u => u.id) },
        recipientId: { in: adminIds },
      },
      select: { entityId: true, recipientId: true },
    });
    const existingUserSet = new Set(
      existingUserLogs.map(l => `${l.entityId}:${l.recipientId}`)
    );

    const newUserSlots: Array<{ entityType: string; entityId: string; eventType: string; recipientId: string }> = [];
    const userSlotMeta: Array<{ recipientId: string; userId: string; userName: string }> = [];

    for (const user of pendingUsers) {
      for (const admin of admins) {
        if (!existingUserSet.has(`${user.id}:${admin.id}`)) {
          newUserSlots.push({
            entityType: 'user',
            entityId: user.id,
            eventType: 'verification_pending_reminder',
            recipientId: admin.id,
          });
          userSlotMeta.push({ recipientId: admin.id, userId: user.id, userName: user.name });
        }
      }
    }

    if (newUserSlots.length > 0) {
      await prisma.notificationLog.createMany({ data: newUserSlots, skipDuplicates: true });
      for (const meta of userSlotMeta) {
        await notifyModerationPendingUser(meta.recipientId, {
          userId: meta.userId,
          userName: meta.userName,
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
