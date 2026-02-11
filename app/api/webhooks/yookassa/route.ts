export const dynamic = 'force-dynamic';
/**
 * YooKassa Payment Webhook
 * Receives payment status notifications from YooKassa
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isYooKassaIP, YooKassaWebhookEvent } from '@/lib/yookassa';
import { notifyBookingConfirmed } from '@/lib/notifications';
import { logBooking, logError } from '@/lib/logger';
import { logPayment } from '@/lib/payment-log';

export async function POST(request: NextRequest) {
  try {
    // Validate source IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    const ip = forwardedFor?.split(',')[0]?.trim() || 'unknown';

    if (!isYooKassaIP(ip)) {
      console.warn(`[YOOKASSA WEBHOOK] Rejected request from IP: ${ip}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const event: YooKassaWebhookEvent = await request.json();

    console.log(`[YOOKASSA WEBHOOK] Received ${event.event} for payment ${event.object.id}`);

    const paymentId = event.object.id;
    const bookingId = event.object.metadata?.bookingId;

    if (!bookingId) {
      console.error('[YOOKASSA WEBHOOK] No bookingId in payment metadata');
      return NextResponse.json({ ok: true });
    }

    // Find booking
    const booking = await prisma.booking.findFirst({
      where: {
        OR: [
          { yookassaPaymentId: paymentId },
          { id: bookingId },
        ],
      },
      include: { item: true },
    });

    if (!booking) {
      console.error(`[YOOKASSA WEBHOOK] Booking not found: ${bookingId}`);
      return NextResponse.json({ ok: true });
    }

    if (event.event === 'payment.succeeded') {
      if (booking.status === 'pending_payment') {
        await prisma.booking.update({
          where: { id: booking.id },
          data: {
            status: 'paid',
            paymentId: paymentId,
            yookassaPaymentId: paymentId,
            paidAt: new Date(),
          },
        });

        logBooking('pay', booking.id, { paymentId, amount: event.object.amount.value });
        logPayment({ userId: booking.renterId, bookingId: booking.id, action: 'succeeded', amount: parseFloat(event.object.amount.value), provider: 'yookassa', metadata: { paymentId, webhookEvent: event.event } });

        // Notify renter: payment confirmed
        if (booking.item) {
          notifyBookingConfirmed(booking.renterId, {
            itemId: booking.itemId,
            itemTitle: booking.item.title,
            startDate: booking.startDate.toLocaleDateString('ru-RU'),
            endDate: booking.endDate.toLocaleDateString('ru-RU'),
          }).catch(console.error);
        }

        console.log(`[YOOKASSA WEBHOOK] Booking ${booking.id} marked as paid`);
      } else {
        console.log(`[YOOKASSA WEBHOOK] Booking ${booking.id} already in status ${booking.status}, skipping`);
      }
    }

    if (event.event === 'payment.canceled') {
      console.log(`[YOOKASSA WEBHOOK] Payment canceled for booking ${booking.id}`);
      logBooking('update', booking.id, { event: 'payment_canceled', paymentId });
      logPayment({ userId: booking.renterId, bookingId: booking.id, action: 'failed', amount: parseFloat(event.object.amount.value), provider: 'yookassa', metadata: { paymentId, webhookEvent: event.event } });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    logError(error as Error, { path: '/api/webhooks/yookassa', method: 'POST' });
    // Always return 200 to prevent retries
    return NextResponse.json({ ok: true });
  }
}
