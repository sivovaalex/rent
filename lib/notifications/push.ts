import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@arenada.pro';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  actions?: Array<{ action: string; title: string }>;
}

export type PushCategory = 'bookings' | 'chat' | 'moderation' | 'reviews' | 'reminders';

/**
 * Отправляет push-уведомление пользователю.
 * Проверяет: notifyPush включён + категория разрешена + есть подписки.
 */
export async function sendPushNotification(
  userId: string,
  payload: PushPayload,
  category?: PushCategory
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return false;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        notifyPush: true,
        pushBookings: true,
        pushChat: true,
        pushModeration: true,
        pushReviews: true,
        pushReminders: true,
      },
    });

    if (!user || !user.notifyPush) return false;

    // Проверяем категорию
    if (category) {
      const categoryMap: Record<PushCategory, boolean> = {
        bookings: user.pushBookings,
        chat: user.pushChat,
        moderation: user.pushModeration,
        reviews: user.pushReviews,
        reminders: user.pushReminders,
      };
      if (!categoryMap[category]) return false;
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId },
    });

    if (subscriptions.length === 0) return false;

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            JSON.stringify(payload)
          );
        } catch (err: unknown) {
          // 410 Gone или 404 — подписка протухла, удаляем
          if (err && typeof err === 'object' && 'statusCode' in err) {
            const statusCode = (err as { statusCode: number }).statusCode;
            if (statusCode === 410 || statusCode === 404) {
              await prisma.pushSubscription.delete({ where: { id: sub.id } });
            }
          }
          throw err;
        }
      })
    );

    return results.some((r) => r.status === 'fulfilled');
  } catch (err) {
    console.error('sendPushNotification error:', err);
    return false;
  }
}
