import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdminOnly, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody } from '@/lib/validations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const blockUserSchema = z.object({
  blocked: z.boolean(),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: targetUserId } = await context.params;

  try {
    const authResult = await requireAdminOnly(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, blockUserSchema);
    if (!validation.success) return validation.error;

    const { blocked, reason } = validation.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return errorResponse('Пользователь не найден', 404);
    }

    // Don't allow blocking admins
    if (targetUser.role === 'admin') {
      return errorResponse('Нельзя заблокировать администратора', 400);
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        isBlocked: blocked,
        blockReason: blocked ? reason : null,
        blockedAt: blocked ? new Date() : null,
        blockedBy: blocked ? authResult.userId : null,
      },
    });

    return successResponse({ success: true });
  } catch (error) {
    console.error('POST /admin/users/[id]/block Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
