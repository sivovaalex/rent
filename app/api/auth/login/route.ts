import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { safeUser, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, loginSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, loginSchema);
    if (!validation.success) return validation.error;

    const { email, password } = validation.data;

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.passwordHash) {
      return errorResponse('Неверные данные', 401);
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return errorResponse('Неверные данные', 401);
    }

    return successResponse({ success: true, user: safeUser(user) });
  } catch (error) {
    console.error('POST /auth/login Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
