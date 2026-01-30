import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody } from '@/lib/validations';

const subscribeSchema = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

// POST — сохранить push-подписку
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, subscribeSchema);
    if (!validation.success) return validation.error;

    const { endpoint, p256dh, auth } = validation.data;

    await prisma.pushSubscription.upsert({
      where: {
        userId_endpoint: { userId: authResult.userId, endpoint },
      },
      update: { p256dh, auth },
      create: {
        userId: authResult.userId,
        endpoint,
        p256dh,
        auth,
      },
    });

    // Включаем push-уведомления автоматически
    await prisma.user.update({
      where: { id: authResult.userId },
      data: { notifyPush: true },
    });

    return successResponse({ success: true });
  } catch (error) {
    console.error('POST /api/push/subscribe Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}

// DELETE — удалить push-подписку
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, unsubscribeSchema);
    if (!validation.success) return validation.error;

    const { endpoint } = validation.data;

    await prisma.pushSubscription.deleteMany({
      where: { userId: authResult.userId, endpoint },
    });

    // Если не осталось подписок — выключаем push
    const remaining = await prisma.pushSubscription.count({
      where: { userId: authResult.userId },
    });
    if (remaining === 0) {
      await prisma.user.update({
        where: { id: authResult.userId },
        data: { notifyPush: false },
      });
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error('DELETE /api/push/subscribe Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
