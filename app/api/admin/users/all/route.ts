export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOnly, safeUser, errorResponse, successResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminOnly(request);
    if ('error' in authResult) return authResult.error;

    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });

    const safeUsers = users.map(safeUser);

    return successResponse({ users: safeUsers });
  } catch (error) {
    console.error('GET /admin/users/all Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
