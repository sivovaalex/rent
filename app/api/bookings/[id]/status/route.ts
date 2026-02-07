import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api-utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/bookings/[id]/status
 * Lightweight status check for polling from payment result page.
 * No auth required — bookingId (UUID) acts as a secret token.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const booking = await prisma.booking.findUnique({
      where: { id },
      select: { id: true, status: true, paidAt: true },
    });

    if (!booking) return errorResponse('Бронирование не найдено', 404);

    return successResponse({
      status: booking.status,
      paidAt: booking.paidAt,
    });
  } catch (error) {
    console.error('GET /bookings/[id]/status Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
