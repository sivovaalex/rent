import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, checklistSchema } from '@/lib/validations';

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

    // Check if user is owner or renter
    const isRenter = booking.renterId === authResult.userId;
    const isOwner = booking.item.ownerId === authResult.userId;

    if (!isRenter && !isOwner) {
      return errorResponse('Доступ запрещён', 403);
    }

    const validation = await validateBody(request, checklistSchema);
    if (!validation.success) return validation.error;

    const { type, photos, notes } = validation.data;

    const updateData = type === 'handover'
      ? {
          handoverPhotos: photos,
          handoverConfirmedAt: new Date(),
          handoverNotes: notes,
        }
      : {
          returnPhotos: photos,
          returnConfirmedAt: new Date(),
          returnNotes: notes,
        };

    await prisma.booking.update({
      where: { id },
      data: updateData,
    });

    return successResponse({ success: true });
  } catch (error) {
    console.error('POST /bookings/[id]/checklist Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
