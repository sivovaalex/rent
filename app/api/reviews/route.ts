import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, createReviewSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, createReviewSchema);
    if (!validation.success) return validation.error;

    const { booking_id, item_id, rating, text, photos } = validation.data;

    // Check booking exists and belongs to user
    const booking = await prisma.booking.findFirst({
      where: {
        id: booking_id,
        renterId: authResult.userId,
      },
    });

    if (!booking) {
      return errorResponse('Бронирование не найдено или не принадлежит вам', 400);
    }

    // Check if review period has passed (booking end date)
    const endDate = new Date(booking.endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (booking.status !== 'completed' && endDate >= today) {
      return errorResponse('Отзыв можно оставить только после завершения аренды', 400);
    }

    // Check for existing review
    const existingReview = await prisma.review.findFirst({
      where: { bookingId: booking_id },
    });

    if (existingReview) {
      return errorResponse('Вы уже оставили отзыв для этого бронирования', 400);
    }

    // Get item to update owner rating
    const item = await prisma.item.findUnique({ where: { id: item_id } });

    if (!item) {
      return errorResponse('Лот не найден', 400);
    }

    // Create review
    const review = await prisma.review.create({
      data: {
        bookingId: booking_id,
        itemId: item_id,
        userId: authResult.userId,
        rating,
        text: text.trim(),
        photos: photos || [],
      },
    });

    // Update ratings
    try {
      const allReviews = await prisma.review.findMany({
        where: { itemId: item_id },
        select: { rating: true },
      });

      if (allReviews.length > 0) {
        const avgRating =
          allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        const roundedRating = Math.round(avgRating * 100) / 100;

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
        createdAt: review.createdAt,
      },
    });
  } catch (error) {
    console.error('POST /reviews Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
