export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { requireAdminOnly, safeUser, errorResponse, successResponse } from '@/lib/api-utils';
import { z } from 'zod';

const createUserSchema = z.object({
  name: z.string().min(2, 'Имя должно быть не менее 2 символов'),
  phone: z.string().min(10, 'Некорректный номер телефона'),
  email: z.string().email('Некорректный email').optional().or(z.literal('')),
  password: z.string().min(6, 'Пароль должен быть не менее 6 символов'),
  role: z.enum(['renter', 'owner', 'moderator', 'admin']),
});

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAdminOnly(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const validation = createUserSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse(validation.error.issues[0].message, 400);
    }

    const { name, phone, email, password, role } = validation.data;

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          { phone },
        ],
      },
    });

    if (existingUser) {
      if (email && existingUser.email === email) {
        return errorResponse('Пользователь с таким email уже существует', 400);
      }
      return errorResponse('Пользователь с таким телефоном уже существует', 400);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        phone,
        ...(email ? { email } : {}),
        passwordHash,
        role,
      },
    });

    return successResponse({ success: true, user: safeUser(user) });
  } catch (error) {
    console.error('POST /api/admin/create-user Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
