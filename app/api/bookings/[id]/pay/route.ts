export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { createPayment, isYooKassaConfigured } from '@/lib/yookassa';
import { logPayment } from '@/lib/payment-log';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bookings/[id]/pay
 * Initiate (or re-initiate) payment for a pending_payment booking.
 * Used when renter returns to pay after approval, or retries a failed payment.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    if (!isYooKassaConfigured()) {
      return errorResponse('Платёжная система не настроена', 503);
    }

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!booking) return errorResponse('Бронирование не найдено', 404);
    if (booking.renterId !== authResult.userId) return errorResponse('Доступ запрещён', 403);
    if (booking.status !== 'pending_payment') return errorResponse('Бронирование не ожидает оплаты', 400);

    try {
      const payment = await createPayment({
        amount: Number(booking.commission),
        bookingId: booking.id,
        description: `Комиссия за аренду: ${booking.item?.title || 'Лот'}`,
      });

      await prisma.booking.update({
        where: { id },
        data: { yookassaPaymentId: payment.id },
      });

      logPayment({ userId: authResult.userId, bookingId: booking.id, action: 'initiated', amount: Number(booking.commission), provider: 'yookassa', metadata: { paymentId: payment.id, trigger: 'retry_pay' } });

      return successResponse({
        success: true,
        paymentUrl: payment.confirmation?.confirmation_url,
      });
    } catch (paymentError) {
      logPayment({ userId: authResult.userId, bookingId: booking.id, action: 'failed', amount: Number(booking.commission), provider: 'yookassa', metadata: { error: String(paymentError), trigger: 'retry_pay' } });
      console.error('POST /bookings/[id]/pay Error:', paymentError);
      return errorResponse('Ошибка создания платежа', 500);
    }
  } catch (error) {
    console.error('POST /bookings/[id]/pay Error:', error);
    return errorResponse('Ошибка создания платежа', 500);
  }
}
