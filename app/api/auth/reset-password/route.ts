export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordChangedEmail } from '@/lib/email';
import logger from '@/lib/logger';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/reset-password
 * Verify token and set new password
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token, password } = body;

    if (!token) {
      return NextResponse.json(
        { error: 'Токен обязателен' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Новый пароль обязателен' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    // Find token in database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Недействительная или истекшая ссылка для сброса пароля' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      // Delete expired token
      await prisma.passwordResetToken.delete({
        where: { id: resetToken.id },
      });

      return NextResponse.json(
        { error: 'Срок действия ссылки истёк. Запросите новую ссылку для сброса пароля.' },
        { status: 400 }
      );
    }

    // Check if token was already used
    if (resetToken.usedAt) {
      return NextResponse.json(
        { error: 'Эта ссылка уже была использована' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: resetToken.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 10);

    // Update user password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    });

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetToken.id },
      data: { usedAt: new Date() },
    });

    // Send confirmation email
    await sendPasswordChangedEmail(user.email!, user.name);

    logger.info({ userId: user.id, email: user.email }, 'Password reset successfully');

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменён. Теперь вы можете войти с новым паролем.',
    });
  } catch (error) {
    logger.error({ error }, 'Error in reset-password endpoint');
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/reset-password?token=xxx
 * Verify token validity (for UI to show form or error)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json(
        { valid: false, error: 'Токен не указан' },
        { status: 400 }
      );
    }

    // Find token in database
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json(
        { valid: false, error: 'Недействительная ссылка' },
        { status: 400 }
      );
    }

    // Check if token is expired
    if (resetToken.expiresAt < new Date()) {
      return NextResponse.json(
        { valid: false, error: 'Срок действия ссылки истёк' },
        { status: 400 }
      );
    }

    // Check if token was already used
    if (resetToken.usedAt) {
      return NextResponse.json(
        { valid: false, error: 'Ссылка уже была использована' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      valid: true,
      email: resetToken.email,
    });
  } catch (error) {
    logger.error({ error }, 'Error validating reset token');
    return NextResponse.json(
      { valid: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
