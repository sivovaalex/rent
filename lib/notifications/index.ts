/**
 * Unified notification service
 * Sends notifications via Email, Telegram, and VK based on user preferences
 */

import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import { sendTelegramMessage } from './telegram';
import { sendVkMessage } from './vk';
import {
  NotificationEvent,
  NotificationEventType,
  getMessengerText,
  getEmailSubject,
  getEmailHtml,
} from './templates';

export type { NotificationEventType, NotificationEvent };

interface NotificationResult {
  email: boolean;
  telegram: boolean;
  vk: boolean;
}

/**
 * Send notification to a user via all enabled channels
 */
export async function sendNotification(
  userId: string,
  event: NotificationEvent
): Promise<NotificationResult> {
  const result: NotificationResult = {
    email: false,
    telegram: false,
    vk: false,
  };

  try {
    // Get user with notification preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        notifyEmail: true,
        notifyTelegram: true,
        notifyVk: true,
        telegramChatId: true,
        vkId: true,
      },
    });

    if (!user) {
      console.error(`[NOTIFICATIONS] User not found: ${userId}`);
      return result;
    }

    const messengerText = getMessengerText(event);

    // Send notifications in parallel
    const promises: Promise<void>[] = [];

    // Email
    if (user.notifyEmail && user.email) {
      promises.push(
        sendEmail({
          to: user.email,
          subject: getEmailSubject(event),
          text: messengerText,
          html: getEmailHtml(event),
        }).then((success) => {
          result.email = success;
        })
      );
    }

    // Telegram
    if (user.notifyTelegram && user.telegramChatId) {
      promises.push(
        sendTelegramMessage(user.telegramChatId, messengerText).then((success) => {
          result.telegram = success;
        })
      );
    }

    // VK
    if (user.notifyVk && user.vkId) {
      promises.push(
        sendVkMessage(user.vkId, messengerText).then((success) => {
          result.vk = success;
        })
      );
    }

    await Promise.all(promises);

    console.log(
      `[NOTIFICATIONS] Sent ${event.type} to user ${userId}:`,
      `email=${result.email}, telegram=${result.telegram}, vk=${result.vk}`
    );

    return result;
  } catch (error) {
    console.error(`[NOTIFICATIONS] Error sending notification:`, error);
    return result;
  }
}

/**
 * Helper function to send item moderation notification
 */
export async function notifyItemModeration(
  userId: string,
  itemId: string,
  itemTitle: string,
  approved: boolean,
  reason?: string
): Promise<NotificationResult> {
  return sendNotification(userId, {
    type: approved ? 'item_approved' : 'item_rejected',
    data: { itemId, itemTitle, reason },
  });
}

/**
 * Helper function to send verification notification
 */
export async function notifyVerification(
  userId: string,
  approved: boolean,
  reason?: string
): Promise<NotificationResult> {
  return sendNotification(userId, {
    type: approved ? 'verification_approved' : 'verification_rejected',
    data: { reason },
  });
}

/**
 * Helper function to send new booking notification to owner
 */
export async function notifyNewBooking(
  ownerId: string,
  data: {
    itemId: string;
    itemTitle: string;
    renterName: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
  }
): Promise<NotificationResult> {
  return sendNotification(ownerId, {
    type: 'booking_new',
    data,
  });
}

/**
 * Helper function to send booking confirmation to renter
 */
export async function notifyBookingConfirmed(
  renterId: string,
  data: {
    itemId: string;
    itemTitle: string;
    startDate: string;
    endDate: string;
  }
): Promise<NotificationResult> {
  return sendNotification(renterId, {
    type: 'booking_confirmed',
    data,
  });
}

/**
 * Helper function to send booking cancellation notification
 */
export async function notifyBookingCancelled(
  userId: string,
  data: {
    itemTitle: string;
    reason?: string;
  }
): Promise<NotificationResult> {
  return sendNotification(userId, {
    type: 'booking_cancelled',
    data,
  });
}

/**
 * Helper function to send booking completion notification
 */
export async function notifyBookingCompleted(
  userId: string,
  data: {
    itemTitle: string;
  }
): Promise<NotificationResult> {
  return sendNotification(userId, {
    type: 'booking_completed',
    data,
  });
}
