export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { safeUser, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, verifySmsSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, verifySmsSchema);
    if (!validation.success) return validation.error;

    const { phone, code, name } = validation.data;

    // Verify SMS code
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

    // Get request body for additional fields
    const body = await request.clone().json();

    // Find or create user
    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      let passwordHash: string | null = null;
      if (body.password) {
        passwordHash = await bcrypt.hash(body.password, 10);
      }

      user = await prisma.user.create({
        data: {
          phone,
          name: name || 'Пользователь',
          email: body.email || null,
          passwordHash,
          role: body.role || 'renter',
        },
      });
    }

    // Delete used SMS code
    await prisma.smsCode.delete({ where: { phone } });

    return successResponse({
      success: true,
      user: safeUser(user),
    });
  } catch (error) {
    console.error('POST /auth/sms/verify Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
