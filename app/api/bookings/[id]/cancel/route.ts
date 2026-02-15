export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { notifyBookingCancelled } from '@/lib/notifications';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bookings/{id}/cancel
 * Cancel a booking (by renter or owner) while in pending_approval or pending_payment status
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    let reason = '';
    try {
      const body = await request.json();
      reason = body.reason || '';
    } catch {
      // Empty body is fine
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!booking) {
      return errorResponse('Бронирование не найдено', 404);
    }

    const isRenter = booking.renterId === authResult.userId;
    const isOwner = booking.item?.ownerId === authResult.userId;

    if (!isRenter && !isOwner) {
      return errorResponse('Доступ запрещён', 403);
    }

    if (booking.status !== 'pending_approval' && booking.status !== 'pending_payment') {
      return errorResponse('Отмена возможна только для бронирований в статусе ожидания', 400);
    }

    const cancelReason = reason || (isRenter ? 'Отменено арендатором' : 'Отменено владельцем');

    await prisma.booking.update({
      where: { id },
      data: {
        status: 'cancelled',
        rejectionReason: cancelReason,
        rejectedAt: new Date(),
      },
    });

    // Notify the other party
    const notifyUserId = isRenter ? booking.item!.ownerId : booking.renterId;
    notifyBookingCancelled(notifyUserId, {
      itemTitle: booking.item!.title,
      reason: cancelReason,
    }).catch(console.error);

    return successResponse({ success: true });
  } catch (error) {
    console.error('POST /bookings/[id]/cancel Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
