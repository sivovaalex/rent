import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, moderateItemSchema } from '@/lib/validations';
import { notifyItemModeration } from '@/lib/notifications';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: itemId } = await context.params;

  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, moderateItemSchema);
    if (!validation.success) return validation.error;

    const { status, rejection_reason } = validation.data;

    const item = await prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return errorResponse('Лот не найден', 404);
    }

    await prisma.$transaction([
      prisma.item.update({
        where: { id: itemId },
        data: {
          status,
          rejectionReason: status === 'rejected' ? rejection_reason : null,
          moderatedAt: new Date(),
          moderatedBy: authResult.userId,
        },
      }),
      prisma.verificationHistory.create({
        data: {
          userId: item.ownerId,
          editorId: authResult.userId,
          action: status === 'approved' ? 'approve' : 'reject',
          reason: rejection_reason || null,
          entityType: 'item',
          entityId: itemId,
          entityName: item.title,
        },
      }),
    ]);

    // Send notification to item owner
    notifyItemModeration(
      item.ownerId,
      item.id,
      item.title,
      status === 'approved',
      rejection_reason
    ).catch((err) => console.error('Failed to send moderation notification:', err));

    return successResponse({ success: true });
  } catch (error) {
    console.error('POST /admin/items/[id]/moderate Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
