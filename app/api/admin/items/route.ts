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
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 200);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);

    const where: any = {};
    if (status === 'pending') {
      where.status = 'pending';
    }

    const [items, total] = await Promise.all([
      prisma.item.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          owner: { select: { id: true, name: true, phone: true } },
        },
      }),
      prisma.item.count({ where }),
    ]);

    const transformedItems = items.map(transformItem);

    return successResponse({ items: transformedItems, total, limit, offset });
  } catch (error) {
    console.error('GET /admin/items Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
