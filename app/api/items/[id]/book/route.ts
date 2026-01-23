import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireVerified, transformBooking, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, createBookingSchema } from '@/lib/validations';
import { COMMISSION_RATE } from '@/lib/constants';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: itemId } = await context.params;

  try {
    const authResult = await requireVerified(request);
    if ('error' in authResult) return authResult.error;

    const item = await prisma.item.findUnique({ where: { id: itemId } });

    if (!item) {
      return errorResponse('Лот не найден', 404);
    }

    if (item.status !== 'approved') {
      return errorResponse('Лот недоступен для бронирования', 400);
    }

    if (item.ownerId === authResult.userId) {
      return errorResponse('Нельзя забронировать собственный лот', 400);
    }

    const validation = await validateBody(request, createBookingSchema);
    if (!validation.success) return validation.error;

    const { start_date, end_date, rental_type, is_insured } = validation.data;

    const start = new Date(start_date);
    const end = new Date(end_date);
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check for overlapping bookings
    const existingBookings = await prisma.booking.findMany({
      where: {
        itemId,
        status: { in: ['pending_payment', 'paid', 'active'] },
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

    // Create booking with mock payment
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
      },
    });

    console.log(`💳 Мок-платёж создан для бронирования ${booking.id}`);

    return successResponse({
      success: true,
      booking: transformBooking(booking),
    });
  } catch (error) {
    console.error('POST /items/[id]/book Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
