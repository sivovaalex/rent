import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { safeUser, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, registerSchema } from '@/lib/validations';

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
      },
    });

    return successResponse({ success: true, user: safeUser(user) });
  } catch (error) {
    console.error('POST /auth/register Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
