export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, transformItem, errorResponse, successResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin(request);
    if ('error' in authResult) return authResult.error;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    const where: any = {};
    if (status === 'pending') {
      where.status = 'pending';
    }

    const items = await prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: { select: { id: true, name: true, phone: true } },
      },
    });

    const transformedItems = items.map(transformItem);

    return successResponse({ items: transformedItems });
  } catch (error) {
    console.error('GET /admin/items Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
