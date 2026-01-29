import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { notifyBookingCompleted } from '@/lib/notifications';
import { recalculateTrust } from '@/lib/trust';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!booking) {
      return errorResponse('Бронирование не найдено', 404);
    }

    // Only owner can confirm return
    if (!booking.item || booking.item.ownerId !== authResult.userId) {
      return errorResponse('Доступ запрещён', 403);
    }

    if (booking.status === 'completed') {
      return errorResponse('Бронирование уже завершено', 400);
    }

    await prisma.booking.update({
      where: { id },
      data: {
        status: 'completed',
        depositStatus: 'returned',
        completedAt: new Date(),
      },
    });

    console.log(`💰 Залог ${booking.deposit} ₽ возвращён арендатору`);

    // Recalculate trust for both owner and renter
    recalculateTrust(booking.item.ownerId).catch(console.error);
    recalculateTrust(booking.renterId).catch(console.error);

    // Send notification to renter about booking completion
    notifyBookingCompleted(booking.renterId, {
      itemTitle: booking.item.title,
    }).catch((err) => console.error('Failed to send booking completion notification:', err));

    return successResponse({ success: true });
  } catch (error) {
    console.error('POST /bookings/[id]/confirm-return Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
