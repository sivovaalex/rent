export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireAuth, transformBooking, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, createBookingSchema } from '@/lib/validations';
import { COMMISSION_RATE } from '@/lib/constants';
import { logError, logBooking } from '@/lib/logger';
import { notifyNewBooking, notifyBookingApprovalRequest } from '@/lib/notifications';
import { getApprovalDecision } from '@/lib/approval';
import { createPayment, isYooKassaConfigured } from '@/lib/yookassa';
import { logPayment } from '@/lib/payment-log';
import { detectSuspiciousActivity } from '@/lib/fraud-detection';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: itemId } = await context.params;

  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
      include: { owner: { select: { isBlocked: true } } },
    });

    if (!item) {
      return errorResponse('Лот не найден', 404);
    }

    if (item.status !== 'approved') {
      return errorResponse('Лот недоступен для бронирования', 400);
    }

    if (item.owner.isBlocked) {
      return errorResponse('Лот недоступен для бронирования', 400);
    }

    if (item.ownerId === authResult.userId) {
      return errorResponse('Нельзя забронировать собственный лот', 400);
    }

    // Fraud detection
    const fraudCheck = await detectSuspiciousActivity(authResult.userId);
    if (fraudCheck.isSuspicious) {
      console.warn(`[FRAUD] Suspicious activity for user ${authResult.userId}:`, fraudCheck.reasons);
      if (fraudCheck.reasons.length >= 2) {
        return errorResponse('Ваш аккаунт требует дополнительной верификации', 403);
      }
    }

    const validation = await validateBody(request, createBookingSchema);
    if (!validation.success) return validation.error;

    const { start_date, end_date, rental_type, is_insured } = validation.data;

    const start = new Date(start_date);
    const end = new Date(end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping bookings (include pending_approval)
    const existingBookings = await prisma.booking.findMany({
      where: {
        itemId,
        status: { in: ['pending_approval', 'pending_payment', 'paid', 'active'] },
        OR: [
          {
            AND: [
              { startDate: { lte: end } },
              { endDate: { gte: start } },
            ],
          },
        ],
      },
    });

    if (existingBookings.length > 0) {
      return errorResponse('Выбранные даты уже заняты', 400);
    }

    // Calculate prices
    let rentalPrice = 0;
    if (rental_type === 'day') {
      rentalPrice = item.pricePerDay * days;
    } else if (rental_type === 'month') {
      const months = Math.ceil(days / 30);
      rentalPrice = item.pricePerMonth * months;
    }

    const deposit = item.deposit;
    const commission = Math.round(rentalPrice * COMMISSION_RATE * 100) / 100;
    const insurance = is_insured ? Math.round(rentalPrice * 0.10 * 100) / 100 : 0;
    const total = Math.round((rentalPrice + deposit + commission + insurance) * 100) / 100;
    const prepayment = Math.round(rentalPrice * 0.30 * 100) / 100;

    // Get renter name for notification
    const renter = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: { name: true },
    });

    // Check approval decision
    const decision = await getApprovalDecision(itemId, authResult.userId);

    if (decision.shouldAutoApprove) {
      if (isYooKassaConfigured()) {
        // Real payment: create booking as pending_payment, redirect to YooKassa
        const booking = await prisma.booking.create({
          data: {
            itemId,
            renterId: authResult.userId,
            startDate: start,
            endDate: end,
            rentalType: rental_type,
            rentalPrice,
            deposit,
            commission,
            insurance,
            totalPrice: total,
            prepayment: commission, // Model B: online prepayment = commission
            isInsured: is_insured,
            status: 'pending_payment',
            approvedAt: new Date(),
          },
        });

        try {
          const payment = await createPayment({
            amount: commission,
            bookingId: booking.id,
            description: `Комиссия за аренду: ${item.title}`,
          });

          await prisma.booking.update({
            where: { id: booking.id },
            data: { yookassaPaymentId: payment.id },
          });

          logBooking('create', booking.id, { itemId, renterId: authResult.userId, totalPrice: total, paymentId: payment.id });
          logPayment({ userId: authResult.userId, bookingId: booking.id, action: 'initiated', amount: commission, provider: 'yookassa', metadata: { paymentId: payment.id } });

          notifyNewBooking(item.ownerId, {
            itemId: item.id,
            itemTitle: item.title,
            renterName: renter?.name || 'Пользователь',
            startDate: start.toLocaleDateString('ru-RU'),
            endDate: end.toLocaleDateString('ru-RU'),
            totalPrice: total,
          }).catch((err) => console.error('Failed to send new booking notification:', err));

          return successResponse({
            success: true,
            booking: transformBooking(booking),
            paymentUrl: payment.confirmation?.confirmation_url,
          });
        } catch (paymentError) {
          // Payment creation failed — cancel the booking
          await prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'cancelled', rejectionReason: 'Ошибка создания платежа' },
          });
          logPayment({ userId: authResult.userId, bookingId: booking.id, action: 'failed', amount: commission, provider: 'yookassa', metadata: { error: String(paymentError) } });
          console.error('YooKassa payment creation failed:', paymentError);
          return errorResponse('Ошибка создания платежа. Попробуйте позже.', 502);
        }
      } else {
        // Fallback: mock payment (no YooKassa credentials)
        const booking = await prisma.booking.create({
          data: {
            itemId,
            renterId: authResult.userId,
            startDate: start,
            endDate: end,
            rentalType: rental_type,
            rentalPrice,
            deposit,
            commission,
            insurance,
            totalPrice: total,
            prepayment,
            isInsured: is_insured,
            status: 'paid',
            depositStatus: 'held',
            paymentId: `MOCK_${crypto.randomUUID()}`,
            paidAt: new Date(),
            approvedAt: new Date(),
          },
        });

        logBooking('create', booking.id, { itemId, renterId: authResult.userId, totalPrice: total });
        logPayment({ userId: authResult.userId, bookingId: booking.id, action: 'mock', amount: commission, provider: 'mock', metadata: { paymentId: booking.paymentId } });

        notifyNewBooking(item.ownerId, {
          itemId: item.id,
          itemTitle: item.title,
          renterName: renter?.name || 'Пользователь',
          startDate: start.toLocaleDateString('ru-RU'),
          endDate: end.toLocaleDateString('ru-RU'),
          totalPrice: total,
        }).catch((err) => console.error('Failed to send new booking notification:', err));

        return successResponse({
          success: true,
          booking: transformBooking(booking),
        });
      }
    } else {
      // Manual approval: create as pending_approval with 24h deadline
      const approvalDeadline = new Date();
      approvalDeadline.setHours(approvalDeadline.getHours() + 24);

      const booking = await prisma.booking.create({
        data: {
          itemId,
          renterId: authResult.userId,
          startDate: start,
          endDate: end,
          rentalType: rental_type,
          rentalPrice,
          deposit,
          commission,
          insurance,
          totalPrice: total,
          prepayment,
          isInsured: is_insured,
          status: 'pending_approval',
          approvalDeadline,
        },
      });

      logBooking('create', booking.id, { itemId, renterId: authResult.userId, totalPrice: total, status: 'pending_approval' });

      notifyBookingApprovalRequest(item.ownerId, {
        bookingId: booking.id,
        itemTitle: item.title,
        renterName: renter?.name || 'Пользователь',
        startDate: start.toLocaleDateString('ru-RU'),
        endDate: end.toLocaleDateString('ru-RU'),
        totalPrice: total,
      }).catch((err) => console.error('Failed to send approval request notification:', err));

      return successResponse({
        success: true,
        booking: transformBooking(booking),
        message: 'Запрос на бронирование отправлен владельцу. Ожидайте подтверждения в течение 24 часов.',
      });
    }
  } catch (error) {
    logError(error as Error, { path: '/api/items/[id]/book', method: 'POST', itemId });
    return errorResponse('Ошибка сервера', 500);
  }
}
