import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody } from '@/lib/validations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

const verifyUserSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z.string().optional(),
});

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: targetUserId } = await context.params;

  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, verifyUserSchema);
    if (!validation.success) return validation.error;

    const { action, reason } = validation.data;

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
    });

    if (!targetUser) {
      return errorResponse('Пользователь не найден', 404);
    }

    await prisma.user.update({
      where: { id: targetUserId },
      data: {
        verificationStatus: action === 'approve' ? 'verified' : 'rejected',
        isVerified: action === 'approve',
        verifiedAt: action === 'approve' ? new Date() : null,
        verifiedBy: action === 'approve' ? authResult.userId : null,
        rejectionReason: action === 'reject' ? reason : null,
      },
    });

    return successResponse({ success: true });
  } catch (error) {
    console.error('POST /admin/users/[id]/verify Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
