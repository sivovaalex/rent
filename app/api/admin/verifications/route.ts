import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOnly, errorResponse, successResponse } from '@/lib/api-utils';

// GET /api/admin/verifications — история верификаций (только admin)
export async function GET(request: NextRequest) {
  const auth = await requireAdminOnly(request);
  if ('error' in auth) return auth.error;

  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50');
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0');

  const [history, total] = await Promise.all([
    prisma.verificationHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        user: { select: { id: true, name: true, phone: true, email: true, verificationStatus: true, isVerified: true } },
        editor: { select: { id: true, name: true } },
      },
    }),
    prisma.verificationHistory.count(),
  ]);

  return successResponse({
    history: history.map(h => ({
      _id: h.id,
      action: h.action,
      reason: h.reason,
      entityType: h.entityType,
      entityId: h.entityId,
      entityName: h.entityName,
      createdAt: h.createdAt,
      user: {
        _id: h.user.id,
        name: h.user.name,
        phone: h.user.phone,
        email: h.user.email,
        verificationStatus: h.user.verificationStatus,
        isVerified: h.user.isVerified,
      },
      editor: {
        _id: h.editor.id,
        name: h.editor.name,
      },
    })),
    total,
  });
}
