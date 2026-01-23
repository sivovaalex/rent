import { NextResponse, NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const userId = request.headers.get('x-user-id');

  try {
    if (!userId) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }

    const safeUser = {
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      rating: user.rating,
      is_verified: user.isVerified,
      verification_status: user.verificationStatus,
      createdAt: user.createdAt
    };

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
