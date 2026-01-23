import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, safeUser, errorResponse, successResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) return authResult.error;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    const where: any = {};
    if (status === 'pending') {
      where.verificationStatus = 'pending';
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const safeUsers = users.map(safeUser);

    return successResponse({ users: safeUsers });
  } catch (error) {
    console.error('GET /admin/users Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
