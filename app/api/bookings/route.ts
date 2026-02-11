export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireAuth, transformBooking, errorResponse, successResponse } from '@/lib/api-utils';
import { logError } from '@/lib/logger';
import { autoRejectExpiredBookings } from '@/lib/approval';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    // Auto-reject expired pending_approval bookings
    autoRejectExpiredBookings().catch(console.error);

    const url = new URL(request.url);
    const userType = url.searchParams.get('type');

    let where: Prisma.BookingWhereInput = {};

    if (userType === 'renter') {
      where.renterId = authResult.userId;
    } else if (userType === 'owner') {
      where.item = { ownerId: authResult.userId };
    } else {
      where.OR = [
        { renterId: authResult.userId },
        { item: { ownerId: authResult.userId } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        item: {
          include: {
            owner: { select: { id: true, name: true, phone: true } },
          },
        },
        renter: { select: { id: true, name: true, phone: true, email: true } },
        reviews: {
          select: {
            id: true, bookingId: true, itemId: true, userId: true,
            rating: true, text: true, photos: true, type: true,
            createdAt: true, updatedAt: true,
          },
        },
      },
    });

    const transformedBookings = bookings.map(transformBooking);

    return successResponse({ bookings: transformedBookings });
  } catch (error) {
    logError(error as Error, { path: '/api/bookings', method: 'GET' });
    return errorResponse('Ошибка сервера', 500);
  }
}
