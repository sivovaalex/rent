import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, transformItem, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, updateItemSchema } from '@/lib/validations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const item = await prisma.item.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, rating: true, phone: true, createdAt: true, trustBadges: true, trustScore: true },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, photo: true } },
            reply: true,
          },
        },
      },
    });

    if (!item) {
      return errorResponse('Лот не найден', 404);
    }

    const transformedItem = {
      ...transformItem(item),
      owner_createdAt: item.owner.createdAt,
      reviews: item.reviews.map((r) => ({
        _id: r.id,
        ...r,
        user_id: r.userId,
        item_id: r.itemId,
        booking_id: r.bookingId,
        user_name: r.user.name,
        user_photo: r.user.photo,
        reply: r.reply,
      })),
    };

    return successResponse({ item: transformedItem });
  } catch (error) {
    console.error('GET /items/[id] Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) {
      return errorResponse('Лот не найден', 404);
    }

    if (item.ownerId !== authResult.userId) {
      return errorResponse('Доступ запрещён', 403);
    }

    const validation = await validateBody(request, updateItemSchema);
    if (!validation.success) return validation.error;

    const data = validation.data;
    const updateData: any = {};

    if (data.title) updateData.title = data.title;
    if (data.description) updateData.description = data.description;
    if (data.category) updateData.category = data.category;
    if (data.subcategory !== undefined) updateData.subcategory = data.subcategory;
    if (data.address) updateData.address = data.address;
    if (data.photos) updateData.photos = data.photos;
    if (data.attributes) updateData.attributes = data.attributes;

    // Handle price fields (support both snake_case and camelCase)
    if (data.price_per_day !== undefined) updateData.pricePerDay = data.price_per_day;
    if (data.pricePerDay !== undefined) updateData.pricePerDay = data.pricePerDay;
    if (data.price_per_month !== undefined) updateData.pricePerMonth = data.price_per_month;
    if (data.pricePerMonth !== undefined) updateData.pricePerMonth = data.pricePerMonth;
    if (data.deposit !== undefined) updateData.deposit = data.deposit;

    await prisma.item.update({
      where: { id },
      data: updateData,
    });

    return successResponse({ success: true });
  } catch (error) {
    console.error('PATCH /items/[id] Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) {
      return errorResponse('Лот не найден', 404);
    }

    if (item.ownerId !== authResult.userId) {
      return errorResponse('Доступ запрещён', 403);
    }

    await prisma.item.delete({ where: { id } });

    return successResponse({ success: true });
  } catch (error) {
    console.error('DELETE /items/[id] Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
