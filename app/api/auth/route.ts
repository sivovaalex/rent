import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { generateSMSCode, safeUser, errorResponse, successResponse } from '@/lib/api-utils';
import { signToken } from '@/lib/jwt';
import { validateBody, sendSmsSchema, loginSchema } from '@/lib/validations';
import { authRateLimiter, rateLimitResponse, getClientIP } from '@/lib/rate-limit';

// POST /api/auth - Отправка SMS кода
export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  const rateLimitResult = authRateLimiter.check(`sms:${ip}`);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.resetTime);
  }

  try {
    const validation = await validateBody(request, sendSmsSchema);
    if (!validation.success) return validation.error;

    const { phone } = validation.data;
    const code = generateSMSCode();

    await prisma.smsCode.upsert({
      where: { phone },
      update: {
        code,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
      create: {
        phone,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    console.log(`📱 SMS код для ${phone}: ${code}`);

    return successResponse({ success: true, message: 'Код отправлен' });
  } catch (error) {
    console.error('POST /auth Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}

// PUT /api/auth - Верификация SMS кода и регистрация
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone, code, name, email, password, role } = body;

    if (!phone || !code) {
      return errorResponse('Телефон и код обязательны', 400);
    }

    const smsRecord = await prisma.smsCode.findUnique({ where: { phone } });

    if (!smsRecord) {
      return errorResponse('Код не найден. Запросите новый код.', 400);
    }

    if (smsRecord.code !== code) {
      return errorResponse('Неверный код', 400);
    }

    if (new Date() > smsRecord.expiresAt) {
      await prisma.smsCode.delete({ where: { phone } });
      return errorResponse('Код истёк. Запросите новый код.', 400);
    }

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          phone,
          name: name || 'Пользователь',
          email: email || null,
          passwordHash: password ? await bcrypt.hash(password, 10) : null,
          role: role || 'renter',
        },
      });
    } else if (!user.passwordHash && password) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: await bcrypt.hash(password, 10) },
      });
    }

    await prisma.smsCode.delete({ where: { phone } });

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      email: user.email || '',
      role: user.role,
    });

    return successResponse({
      success: true,
      user: safeUser(user),
      token,
    });
  } catch (error) {
    console.error('PUT /auth Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}

// PATCH /api/auth - Вход по email и паролю
export async function PATCH(request: NextRequest) {
  // Rate limiting
  const ip = getClientIP(request);
  const rateLimitResult = authRateLimiter.check(`login:${ip}`);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.resetTime);
  }

  try {
    const validation = await validateBody(request, loginSchema);
    if (!validation.success) return validation.error;

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return errorResponse('Неверные данные', 401);
    }

    if (user.isBlocked) {
      return errorResponse('Аккаунт заблокирован', 403);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return errorResponse('Неверные данные', 401);
    }

    // Generate JWT token
    const token = await signToken({
      userId: user.id,
      email: user.email || '',
      role: user.role,
    });

    return successResponse({
      success: true,
      user: safeUser(user),
      token,
    });
  } catch (error) {
    console.error('PATCH /auth Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
