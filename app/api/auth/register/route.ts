import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const { name, email, password, phone, role } = body;

    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] }
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь с таким email или телефоном уже существует' }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role: role || 'renter'
      }
    });

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

    return NextResponse.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
