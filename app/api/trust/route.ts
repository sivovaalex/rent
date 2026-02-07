export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { recalculateTrust } from '@/lib/trust';

// GET /api/trust?userId=xxx — получить метрики доверия пользователя
export async function GET(request: NextRequest) {
  const targetUserId = request.nextUrl.searchParams.get('userId');
  if (!targetUserId) {
    return errorResponse('userId обязателен', 400);
  }

  const user = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: {
      trustScore: true,
      completedDeals: true,
      cancelledDeals: true,
      confirmationRate: true,
      avgResponseMinutes: true,
      trustBadges: true,
      trustUpdatedAt: true,
      rating: true,
      isVerified: true,
    },
  });

  if (!user) {
    return errorResponse('Пользователь не найден', 404);
  }

  return successResponse(user);
}

// POST /api/trust — пересчитать метрики (для текущего пользователя или по userId для admin)
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const body = await request.json().catch(() => ({}));
  const targetUserId = (auth.user.role === 'admin' && body.userId)
    ? body.userId
    : auth.userId;

  const result = await recalculateTrust(targetUserId);
  if (!result) {
    return errorResponse('Пользователь не найден', 404);
  }

  return successResponse(result);
}
