import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';

function generateSMSCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// PUT /api/auth - Верификация SMS кода и регистрация
export async function PUT(request: NextRequest) {
  const body = await request.json();

  try {
    const { phone, code, name, email, password, role } = body;

    if (!phone || !code || !name) {
      return NextResponse.json({ error: 'Телефон, код и имя обязательны' }, { status: 400 });
    }

    const smsRecord = await prisma.smsCode.findUnique({ where: { phone } });

    if (!smsRecord || smsRecord.code !== code) {
      return NextResponse.json({ error: 'Неверный код' }, { status: 400 });
    }

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          name,
          email: email || null,
          passwordHash: password ? await bcrypt.hash(password, 10) : null,
          role: role || 'renter'
        }
      });
    } else {
      if (!user.passwordHash && password) {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: await bcrypt.hash(password, 10) }
        });
      }
    }

    await prisma.smsCode.delete({ where: { phone } });

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
    console.error('Ошибка верификации SMS:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PATCH /api/auth - Вход по email и паролю
export async function PATCH(request: NextRequest) {
  const body = await request.json();

  try {
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: 'Неверные данные' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return NextResponse.json({ error: 'Неверные данные' }, { status: 401 });
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

    return NextResponse.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('Ошибка входа:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/auth - Отправка SMS кода
export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const { phone } = body;

    if (!phone) {
      return NextResponse.json({ error: 'Телефон обязателен' }, { status: 400 });
    }

    const code = generateSMSCode();

    await prisma.smsCode.upsert({
      where: { phone },
      update: { code, createdAt: new Date(), expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      create: { phone, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) }
    });

    console.log(`📱 SMS код для ${phone}: ${code}`);

    return NextResponse.json({ success: true, message: 'Код отправлен' });
  } catch (error) {
    console.error('Ошибка отправки SMS:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
