export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api-utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        itemId: id,
        status: { in: ['pending_approval', 'pending_payment', 'paid', 'active'] },
      },
    });

    const dates: string[] = [];

    for (const booking of bookings) {
      const start = new Date(booking.startDate);
      const end = new Date(booking.endDate);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        dates.push(d.toISOString().split('T')[0]);
      }
    }

    // Remove duplicates
    const uniqueDates = [...new Set(dates)];

    return successResponse({ dates: uniqueDates });
  } catch (error) {
    console.error('GET /items/[id]/blocked-booking-dates Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
