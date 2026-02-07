export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { z } from 'zod';

const confirmHandoverSchema = z.object({
  depositConfirmed: z.boolean(),
  remainderConfirmed: z.boolean(),
});

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/bookings/[id]/confirm-handover
 * Both renter and owner confirm deposit & remainder exchange at meeting.
 * When all 4 confirmations are true, booking transitions to 'active'.
 */
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!booking) return errorResponse('Бронирование не найдено', 404);

    const isRenter = booking.renterId === authResult.userId;
    const isOwner = booking.item?.ownerId === authResult.userId;

    if (!isRenter && !isOwner) return errorResponse('Доступ запрещён', 403);
    if (booking.status !== 'paid') return errorResponse('Бронирование не в статусе оплачено', 400);

    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse('Некорректный запрос', 400);
    }

    const validation = confirmHandoverSchema.safeParse(body);
    if (!validation.success) return errorResponse('Некорректные данные', 400);

    const { depositConfirmed, remainderConfirmed } = validation.data;

    const updateData: Record<string, boolean> = {};
    if (isRenter) {
      updateData.depositConfirmedByRenter = depositConfirmed;
      updateData.remainderConfirmedByRenter = remainderConfirmed;
    }
    if (isOwner) {
      updateData.depositConfirmedByOwner = depositConfirmed;
      updateData.remainderConfirmedByOwner = remainderConfirmed;
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: updateData,
    });

    // Check if both sides confirmed everything
    const renterDeposit = isRenter ? depositConfirmed : updated.depositConfirmedByRenter;
    const ownerDeposit = isOwner ? depositConfirmed : updated.depositConfirmedByOwner;
    const renterRemainder = isRenter ? remainderConfirmed : updated.remainderConfirmedByRenter;
    const ownerRemainder = isOwner ? remainderConfirmed : updated.remainderConfirmedByOwner;

    const allConfirmed = renterDeposit && ownerDeposit && renterRemainder && ownerRemainder;

    if (allConfirmed) {
      await prisma.booking.update({
        where: { id },
        data: {
          status: 'active',
          depositStatus: 'held',
          handoverConfirmedAt: new Date(),
        },
      });
    }

    return successResponse({
      success: true,
      allConfirmed,
    });
  } catch (error) {
    console.error('POST /bookings/[id]/confirm-handover Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
