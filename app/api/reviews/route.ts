import { NextResponse, NextRequest } from 'next/server';
import { MongoClient, Db } from 'mongodb';
import crypto from 'crypto';

const client = new MongoClient(process.env.MONGODB_URI!);
let db: Db | null = null;

async function connectDB(): Promise<Db> {
  if (!db) {
    await client.connect();
    db = client.db('arendapro');
  }
  return db;
}

export async function POST(request: NextRequest) {
  try {
    const database = await connectDB();
    const body = await request.json();
    const userIdHeader = request.headers.get('x-user-id');

    if (!userIdHeader) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const { booking_id, item_id, rating, text, photos = [] } = body;

    if (!booking_id || !item_id || !rating || !text) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
    }

    const booking = await database.collection('bookings').findOne({
      _id: booking_id,
      renter_id: userIdHeader,
      status: 'completed'
    });

    if (!booking) {
      return NextResponse.json({
        error: 'Бронирование не найдено, не завершено или не принадлежит текущему пользователю'
      }, { status: 400 });
    }

    const existingReview = await database.collection('reviews').findOne({ booking_id: booking_id });
    if (existingReview) {
      return NextResponse.json({
        error: 'Вы уже оставили отзыв для этого бронирования'
      }, { status: 400 });
    }

    const item = await database.collection('items').findOne({ _id: item_id });
    if (!item) {
      return NextResponse.json({ error: 'Лот не найден' }, { status: 400 });
    }

    if (!item.owner_id) {
      return NextResponse.json({ error: 'У лота отсутствует владелец' }, { status: 400 });
    }

    const reviewId = crypto.randomUUID();

    const review = {
      _id: reviewId,
      booking_id: booking_id,
      item_id: item_id,
      user_id: userIdHeader,
      rating: parseInt(String(rating)),
      text: text.trim(),
      photos: Array.isArray(photos) ? photos : [],
      createdAt: new Date()
    };

    const result = await database.collection('reviews').insertOne(review as any);
    if (!result.insertedId) {
      throw new Error('Не удалось сохранить отзыв');
    }

    try {
      const allReviews = await database.collection('reviews').find({ item_id: item_id }).toArray();
      if (allReviews.length > 0) {
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        const roundedRating = parseFloat(avgRating.toFixed(2));

        await database.collection('users').updateOne(
          { _id: item.owner_id },
          { $set: { rating: roundedRating } }
        );

        await database.collection('items').updateOne(
          { _id: item_id },
          { $set: { rating: roundedRating } }
        );
      }
    } catch (ratingError) {
      console.error('Ошибка обновления рейтинга:', ratingError);
    }

    const responseReview = {
      ...review
    };

    return NextResponse.json({ success: true, review: responseReview });

  } catch (error) {
    console.error('Ошибка создания отзыва:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Ошибка сервера при создании отзыва'
    }, { status: 500 });
  }
}
