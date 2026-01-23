import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userIdHeader = request.headers.get('x-user-id');

    if (!userIdHeader) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { booking_id, item_id, rating, text, photos = [] } = body;

    if (!booking_id || !item_id || !rating || !text) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: booking_id,
        renterId: userIdHeader,
        status: 'completed'
      }
    });

    if (!booking) {
      return NextResponse.json({
        error: 'Бронирование не найдено, не завершено или не принадлежит текущему пользователю'
      }, { status: 400 });
    }

    const existingReview = await prisma.review.findFirst({ where: { bookingId: booking_id } });
    if (existingReview) {
      return NextResponse.json({
        error: 'Вы уже оставили отзыв для этого бронирования'
      }, { status: 400 });
    }

    const item = await prisma.item.findUnique({ where: { id: item_id } });
    if (!item) {
      return NextResponse.json({ error: 'Лот не найден' }, { status: 400 });
    }

    if (!item.ownerId) {
      return NextResponse.json({ error: 'У лота отсутствует владелец' }, { status: 400 });
    }

    const review = await prisma.review.create({
      data: {
        bookingId: booking_id,
        itemId: item_id,
        userId: userIdHeader,
        rating: parseInt(String(rating)),
        text: text.trim(),
        photos: Array.isArray(photos) ? photos : []
      }
    });

    // Обновление рейтинга
    try {
      const allReviews = await prisma.review.findMany({
        where: { itemId: item_id },
        select: { rating: true }
      });

      if (allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        const roundedRating = parseFloat(avgRating.toFixed(2));

        await prisma.$transaction([
          prisma.user.update({
            where: { id: item.ownerId },
            data: { rating: roundedRating }
          }),
          prisma.item.update({
            where: { id: item_id },
            data: { rating: roundedRating }
          })
        ]);
      }
    } catch (ratingError) {
      console.error('Ошибка обновления рейтинга:', ratingError);
    }

    const responseReview = {
      _id: review.id,
      booking_id: review.bookingId,
      item_id: review.itemId,
      user_id: review.userId,
      rating: review.rating,
      text: review.text,
      photos: review.photos,
      createdAt: review.createdAt
    };

    return NextResponse.json({ success: true, review: responseReview });

  } catch (error) {
    console.error('Ошибка создания отзыва:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Ошибка сервера при создании отзыва'
    }, { status: 500 });
  }
}
