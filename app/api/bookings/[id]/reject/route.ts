export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, rejectBookingSchema } from '@/lib/validations';
import { notifyBookingRejected } from '@/lib/notifications';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, rejectBookingSchema);
    if (!validation.success) return validation.error;

    const { reason } = validation.data;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!booking) {
      return errorResponse('Бронирование не найдено', 404);
    }

    if (!booking.item || booking.item.ownerId !== authResult.userId) {
      return errorResponse('Доступ запрещён', 403);
    }

    if (booking.status !== 'pending_approval') {
      return errorResponse('Бронирование не ожидает одобрения', 400);
    }

    await prisma.booking.update({
      where: { id },
      data: {
        status: 'cancelled',
        rejectionReason: reason,
        rejectedAt: new Date(),
      },
    });

    // Notify renter about rejection
    notifyBookingRejected(booking.renterId, {
      itemTitle: booking.item.title,
      reason,
    }).catch(console.error);

    return successResponse({ success: true });
  } catch (error) {
    console.error('POST /bookings/[id]/reject Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
