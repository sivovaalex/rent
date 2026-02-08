export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, safeUser, errorResponse, successResponse } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const { user } = authResult;

    if (!user.isVerified) {
      return errorResponse('Требуется верификация для становления арендодателем', 403);
    }

    if (user.role !== 'renter') {
      return errorResponse('Вы уже являетесь арендодателем или имеете другую роль', 400);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'owner' },
    });

    return successResponse({
      success: true,
      user: safeUser(updatedUser),
    });
  } catch (error) {
    console.error('POST /api/profile/become-owner Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
