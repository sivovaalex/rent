export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return errorResponse('Текущий и новый пароль обязательны', 400);
    }

    if (newPassword.length < 6) {
      return errorResponse('Новый пароль должен содержать минимум 6 символов', 400);
    }

    // Verify current password
    const user = await prisma.user.findUnique({
      where: { id: authResult.userId },
      select: { passwordHash: true },
    });

    if (!user?.passwordHash) {
      return errorResponse('Невозможно сменить пароль для данного аккаунта', 400);
    }

    const isValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValid) {
      return errorResponse('Неверный текущий пароль', 400);
    }

    // Hash and update
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: authResult.userId },
      data: { passwordHash },
    });

    return successResponse({ success: true, message: 'Пароль успешно изменён' });
  } catch (error) {
    console.error('Change password error:', error);
    return errorResponse('Внутренняя ошибка сервера', 500);
  }
}
