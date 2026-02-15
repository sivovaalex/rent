export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, registerSchema } from '@/lib/validations';
import { sendEmailVerificationEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, registerSchema);
    if (!validation.success) return validation.error;

    const { name, email, phone, password, role } = validation.data;

    // Check for existing user
    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return errorResponse('Пользователь с таким email уже существует', 400);
      }
      return errorResponse('Пользователь с таким телефоном уже существует', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        passwordHash,
        role,
        emailVerified: false,
      },
    });

    // Generate email verification token (24h expiry)
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await prisma.emailVerificationToken.create({
      data: {
        email,
        token,
        expiresAt,
      },
    });

    // Send verification email (non-blocking)
    sendEmailVerificationEmail(email, token, name).catch((err) => {
      console.error('[REGISTER] Failed to send verification email:', err);
    });

    return successResponse({
      success: true,
      message: 'Регистрация успешна! Проверьте почту для подтверждения email.',
      emailVerificationRequired: true,
    });
  } catch (error) {
    console.error('POST /auth/register Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
