export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { sendPushNotification } from '@/lib/notifications/push';

// POST /api/push/test — отправить тестовое push-уведомление себе
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const sent = await sendPushNotification(
      authResult.userId,
      {
        title: 'Арендол — проверка уведомлений',
        body: 'Push-уведомления работают! Вы будете получать уведомления о бронированиях и сообщениях.',
        url: '/#profile',
        tag: 'push-test',
      },
      'bookings' // категория не блокируется — она включена по умолчанию
    );

    if (!sent) {
      return errorResponse('Не удалось отправить уведомление. Убедитесь, что push включены в настройках браузера.', 400);
    }

    return successResponse({ sent: true });
  } catch (error) {
    console.error('POST /api/push/test Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
