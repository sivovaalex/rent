export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const item = await prisma.item.findUnique({ where: { id } });

    if (!item) {
      return errorResponse('Лот не найден', 404);
    }

    // Check ownership or admin/moderator role
    const isOwner = item.ownerId === authResult.userId;
    const isAdminOrMod = authResult.user.role === 'admin' || authResult.user.role === 'moderator';

    if (!isOwner && !isAdminOrMod) {
      return errorResponse('Доступ запрещён', 403);
    }

    // Admin/moderator can directly approve, owners send to moderation
    const newStatus = isAdminOrMod ? 'approved' : 'pending';

    await prisma.item.update({
      where: { id },
      data: { status: newStatus },
    });

    return successResponse({ success: true });
  } catch (error) {
    console.error('POST /items/[id]/publish Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
