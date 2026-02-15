export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, createReviewSchema } from '@/lib/validations';
import { recalculateTrust } from '@/lib/trust';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId');
    const type = url.searchParams.get('type') || 'renter_review';

    if (!userId) {
      return errorResponse('userId обязателен', 400);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {};

    if (type === 'owner_review') {
      // Reviews about a renter (from owners)
      where.type = 'owner_review';
      where.booking = { renterId: userId };
    } else {
      // Reviews about items owned by this user (from renters)
      where.type = 'renter_review';
      where.item = { ownerId: userId };
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, name: true, photo: true } },
        reply: true,
        item: { select: { id: true, title: true } },
      },
    });

    return successResponse({
      reviews: reviews.map((r) => ({
        _id: r.id,
        bookingId: r.bookingId,
        itemId: r.itemId,
        userId: r.userId,
        userName: r.user.name,
        userPhoto: r.user.photo,
        itemTitle: r.item?.title,
        rating: r.rating,
        text: r.text,
        photos: r.photos,
        type: r.type,
        reply: r.reply ? {
          _id: r.reply.id,
          reviewId: r.reply.reviewId,
          ownerId: r.reply.ownerId,
          text: r.reply.text,
          createdAt: r.reply.createdAt,
        } : undefined,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    console.error('GET /reviews Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, createReviewSchema);
    if (!validation.success) return validation.error;

    const { booking_id, item_id, rating, text, photos, type } = validation.data;

    // Get booking with item info
    const booking = await prisma.booking.findUnique({
      where: { id: booking_id },
      include: { item: true },
    });

    if (!booking) {
      return errorResponse('Бронирование не найдено', 400);
    }

    // Authorization depends on review type
    if (type === 'renter_review') {
      if (booking.renterId !== authResult.userId) {
        return errorResponse('Бронирование не принадлежит вам', 400);
      }
    } else if (type === 'owner_review') {
      if (booking.item?.ownerId !== authResult.userId) {
        return errorResponse('Вы не являетесь владельцем лота', 403);
      }
    }

    // Check booking is completed or end date passed
    const endDate = new Date(booking.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (booking.status !== 'completed' && endDate >= today) {
      return errorResponse('Отзыв можно оставить только после завершения аренды', 400);
    }

    // Check for existing review of this type (compound unique)
    const existingReview = await prisma.review.findUnique({
      where: { bookingId_type: { bookingId: booking_id, type } },
    });

    if (existingReview) {
      return errorResponse('Вы уже оставили отзыв для этого бронирования', 400);
    }

    // Use item from booking (already loaded via include)
    const item = booking.item;
    if (!item || item.id !== item_id) {
      return errorResponse('Лот не найден', 400);
    }

    // Create review (with P2002 duplicate handling)
    let review;
    try {
      review = await prisma.review.create({
        data: {
          bookingId: booking_id,
          itemId: item_id,
          userId: authResult.userId,
          rating,
          text: text.trim(),
          photos: photos || [],
          type,
        },
      });
    } catch (createError: any) {
      if (createError?.code === 'P2002') {
        return errorResponse('Вы уже оставили отзыв для этого бронирования', 400);
      }
      throw createError;
    }

    // Update ratings based on type
    try {
      if (type === 'renter_review') {
        // Update item rating and owner rating using SQL aggregate
        const avgData = await prisma.review.aggregate({
          where: { itemId: item_id, type: 'renter_review' },
          _avg: { rating: true },
        });

        if (avgData._avg.rating !== null) {
          const roundedRating = Math.round(avgData._avg.rating * 100) / 100;

          await prisma.$transaction([
            prisma.user.update({
              where: { id: item.ownerId },
              data: { rating: roundedRating },
            }),
            prisma.item.update({
              where: { id: item_id },
              data: { rating: roundedRating },
            }),
          ]);
        }

        recalculateTrust(item.ownerId).catch(console.error);
      } else if (type === 'owner_review') {
        // Update renter's rating using SQL aggregate
        const avgData = await prisma.review.aggregate({
          where: {
            type: 'owner_review',
            booking: { renterId: booking.renterId },
          },
          _avg: { rating: true },
        });

        if (avgData._avg.rating !== null) {
          const roundedRating = Math.round(avgData._avg.rating * 100) / 100;

          await prisma.user.update({
            where: { id: booking.renterId },
            data: { rating: roundedRating },
          });
        }

        recalculateTrust(booking.renterId).catch(console.error);
      }
    } catch (ratingError) {
      console.error('Ошибка обновления рейтинга:', ratingError);
    }

    return successResponse({
      success: true,
      review: {
        _id: review.id,
        booking_id: review.bookingId,
        item_id: review.itemId,
        user_id: review.userId,
        rating: review.rating,
        text: review.text,
        photos: review.photos,
        type: review.type,
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    console.error('POST /reviews Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
