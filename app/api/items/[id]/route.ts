import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

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
          select: { id: true, name: true, rating: true, phone: true, createdAt: true }
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { name: true, photo: true } },
            reply: true
          }
        }
      }
    });

    if (!item) {
      return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
    }

    const transformedItem = {
      _id: item.id,
      ...item,
      owner_id: item.ownerId,
      owner_name: item.owner.name,
      owner_rating: item.owner.rating,
      owner_phone: item.owner.phone,
      owner_createdAt: item.owner.createdAt,
      price_per_day: item.pricePerDay,
      price_per_month: item.pricePerMonth,
      reviews: item.reviews.map(r => ({
        _id: r.id,
        ...r,
        user_id: r.userId,
        item_id: r.itemId,
        booking_id: r.bookingId,
        user_name: r.user.name,
        user_photo: r.user.photo,
        reply: r.reply
      }))
    };

    return NextResponse.json({ item: transformedItem });
  } catch (error) {
    console.error('Ошибка получения лота:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const body = await request.json();
  const userId = request.headers.get('x-user-id');

  try {
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) {
      return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
    }

    if (item.ownerId !== userId) {
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

    await prisma.item.update({
      where: { id },
      data: {
        category,
        subcategory,
        title,
        description,
        pricePerDay: parseFloat(price_per_day),
        pricePerMonth: parseFloat(price_per_month),
        deposit: parseFloat(deposit),
        address,
        photos: photos || [],
        attributes: attributes || {}
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка обновления лота:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const userId = request.headers.get('x-user-id');

  try {
    if (!userId) {
      return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
    }

    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) {
      return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
    }

    if (item.ownerId !== userId) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    await prisma.item.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления лота:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
