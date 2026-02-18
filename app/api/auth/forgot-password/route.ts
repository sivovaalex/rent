export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email';
import logger from '@/lib/logger';
import crypto from 'crypto';
import { authRateLimiter, rateLimitResponse, getClientIP } from '@/lib/rate-limit';

/**
 * POST /api/auth/forgot-password
 * Request password reset - sends email with reset link
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = getClientIP(request);
    const ipCheck = authRateLimiter.check(`forgot-password:${ip}`);
    if (!ipCheck.success) {
      return rateLimitResponse(ipCheck.resetTime);
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: 'Email обязателен' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Некорректный формат email' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists and has password set
    if (user && user.passwordHash) {
      // Delete any existing reset tokens for this email
      await prisma.passwordResetToken.deleteMany({
        where: { email: normalizedEmail },
      });

      // Generate secure random token
      const token = crypto.randomBytes(32).toString('hex');

      // Token expires in 1 hour
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      // Save token to database
      await prisma.passwordResetToken.create({
        data: {
          email: normalizedEmail,
          token,
          expiresAt,
        },
      });

      // Send email
      const emailSent = await sendPasswordResetEmail(
        normalizedEmail,
        token,
        user.name
      );

      if (!emailSent) {
        logger.error({ email: normalizedEmail }, 'Failed to send password reset email');
      } else {
        logger.info({ email: normalizedEmail }, 'Password reset email sent');
      }
    } else {
      // Log for debugging but don't reveal to user
      logger.info({ email: normalizedEmail }, 'Password reset requested for non-existent or passwordless account');
    }

    // Always return success message
    return NextResponse.json({
      success: true,
      message: 'Если указанный email зарегистрирован в системе, на него будет отправлена ссылка для сброса пароля',
    });
  } catch (error) {
    logger.error({ error }, 'Error in forgot-password endpoint');
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
