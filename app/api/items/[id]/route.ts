import { MongoClient, Db, ObjectId } from 'mongodb';
import { NextResponse, NextRequest } from 'next/server';

const client = new MongoClient(process.env.MONGODB_URI!);
let db: Db | null = null;

async function connectDB(): Promise<Db> {
  if (!db) {
    await client.connect();
    db = client.db('arendapro');
  }
  return db;
}

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const db = await connectDB();
  const { id } = await context.params;

  try {
    const item = await db.collection('items').findOne({ _id: new ObjectId(id) });

    if (!item) {
      return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
    }

    const owner = await db.collection('users').findOne({ _id: item.owner_id });
    if (owner) {
      item.owner_name = owner.name;
      item.owner_rating = owner.rating;
      item.owner_phone = owner.phone;
      item.owner_createdAt = owner.createdAt;
    }

    const reviews = await db.collection('reviews')
      .find({ item_id: new ObjectId(id) })
      .sort({ createdAt: -1 })
      .toArray();

    for (const review of reviews) {
      const user = await db.collection('users').findOne({ _id: review.user_id });
      if (user) {
        review.user_name = user.name;
        review.user_photo = user.photo;
      }

      const replies = await db.collection('review_replies')
        .find({ review_id: review._id })
        .toArray();

      if (replies.length > 0) {
        review.reply = replies[0];
      }
    }

    item.reviews = reviews;

    return NextResponse.json({ item });
  } catch (error) {
    console.error('Ошибка получения лота:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const db = await connectDB();
  const { id } = await context.params;
  const body = await request.json();
  const userId = request.headers.get('x-user-id');

  try {
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const item = await db.collection('items').findOne({ _id: new ObjectId(id) });

    if (!item) {
      return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
    }

    if (item.owner_id !== userId) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const {
      category,
      subcategory,
      title,
      description,
      price_per_day,
      price_per_month,
      deposit,
      address,
      photos,
      attributes
    } = body;

    const updateData = {
      category,
      subcategory,
      title,
      description,
      price_per_day: parseFloat(price_per_day),
      price_per_month: parseFloat(price_per_month),
      deposit: parseFloat(deposit),
      address,
      photos: photos || [],
      attributes: attributes || {},
      updatedAt: new Date()
    };

    await db.collection('items').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка обновления лота:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const db = await connectDB();
  const { id } = await context.params;
  const userId = request.headers.get('x-user-id');

  try {
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const item = await db.collection('items').findOne({ _id: new ObjectId(id) });

    if (!item) {
      return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
    }

    if (item.owner_id !== userId) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    await db.collection('items').deleteOne({ _id: new ObjectId(id) });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления лота:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
