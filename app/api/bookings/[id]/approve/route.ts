import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth, transformBooking, errorResponse, successResponse } from '@/lib/api-utils';
import { notifyBookingApproved } from '@/lib/notifications';

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

    if (!booking.item || booking.item.ownerId !== authResult.userId) {
      return errorResponse('Доступ запрещён', 403);
    }

    if (booking.status !== 'pending_approval') {
      return errorResponse('Бронирование не ожидает одобрения', 400);
    }

    // Approve: move to paid with mock payment
    const updated = await prisma.booking.update({
      where: { id },
      data: {
        status: 'paid',
        depositStatus: 'held',
        paymentId: `MOCK_${crypto.randomUUID()}`,
        paidAt: new Date(),
        approvedAt: new Date(),
      },
      include: {
        item: {
          include: {
            owner: { select: { id: true, name: true, phone: true } },
          },
        },
        renter: { select: { id: true, name: true, phone: true, email: true } },
        reviews: true,
      },
    });

    // Notify renter about approval
    notifyBookingApproved(booking.renterId, {
      itemTitle: booking.item.title,
      startDate: booking.startDate.toLocaleDateString('ru-RU'),
      endDate: booking.endDate.toLocaleDateString('ru-RU'),
    }).catch(console.error);

    return successResponse({
      success: true,
      booking: transformBooking(updated),
    });
  } catch (error) {
    console.error('POST /bookings/[id]/approve Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
