export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth, transformBooking, errorResponse, successResponse } from '@/lib/api-utils';
import { notifyBookingApproved, notifyPaymentRequired } from '@/lib/notifications';
import { createPayment, isYooKassaConfigured } from '@/lib/yookassa';
import { logPayment } from '@/lib/payment-log';

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

    if (isYooKassaConfigured()) {
      // Real payment: move to pending_payment, create YooKassa payment
      const updated = await prisma.booking.update({
        where: { id },
        data: {
          status: 'pending_payment',
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

      try {
        const payment = await createPayment({
          amount: booking.commission,
          bookingId: booking.id,
          description: `Комиссия за аренду: ${booking.item!.title}`,
        });

        await prisma.booking.update({
          where: { id },
          data: { yookassaPaymentId: payment.id },
        });

        logPayment({ userId: booking.renterId, bookingId: booking.id, action: 'initiated', amount: booking.commission, provider: 'yookassa', metadata: { paymentId: payment.id, trigger: 'approve' } });

        // Notify renter: approved, please pay commission
        notifyPaymentRequired(booking.renterId, {
          itemTitle: booking.item!.title,
          commission: booking.commission,
          paymentUrl: payment.confirmation?.confirmation_url || '',
        }).catch(console.error);

        return successResponse({
          success: true,
          booking: transformBooking(updated),
          paymentUrl: payment.confirmation?.confirmation_url,
        });
      } catch (paymentError) {
        logPayment({ userId: booking.renterId, bookingId: booking.id, action: 'failed', amount: booking.commission, provider: 'yookassa', metadata: { error: String(paymentError), trigger: 'approve' } });
        console.error('YooKassa payment creation failed on approve:', paymentError);
        // Revert to pending_approval so owner can try again
        await prisma.booking.update({
          where: { id },
          data: { status: 'pending_approval', approvedAt: null },
        });
        return errorResponse('Ошибка создания платежа. Попробуйте позже.', 502);
      }
    } else {
      // Fallback: mock payment
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

      logPayment({ userId: booking.renterId, bookingId: booking.id, action: 'mock', amount: booking.commission, provider: 'mock', metadata: { trigger: 'approve' } });

      notifyBookingApproved(booking.renterId, {
        itemTitle: booking.item!.title,
        startDate: booking.startDate.toLocaleDateString('ru-RU'),
        endDate: booking.endDate.toLocaleDateString('ru-RU'),
      }).catch(console.error);

      return successResponse({
        success: true,
        booking: transformBooking(updated),
      });
    }
  } catch (error) {
    console.error('POST /bookings/[id]/approve Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
