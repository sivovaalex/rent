export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { transformItem, errorResponse, successResponse } from '@/lib/api-utils';
import { boundingBox } from '@/lib/geo-utils';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    // Fetch the source item
    const item = await prisma.item.findUnique({
      where: { id },
    });

    if (!item || item.status !== 'approved') {
      return successResponse({ items: [] });
    }

    const price = Number(item.pricePerDay);

    const where: Prisma.ItemWhereInput = {
      id: { not: item.id },
      status: 'approved',
      category: item.category,
      owner: { isBlocked: false },
    };

    // Price range ±50%
    if (price > 0) {
      where.pricePerDay = {
        gte: price * 0.5,
        lte: price * 1.5,
      };
    }

    // Geo filter: 30 km radius if coordinates available
    if (item.latitude && item.longitude) {
      const box = boundingBox(Number(item.latitude), Number(item.longitude), 30);
      where.latitude = { gte: box.minLat, lte: box.maxLat };
      where.longitude = { gte: box.minLon, lte: box.maxLon };
    }

    let items = await prisma.item.findMany({
      where,
      orderBy: { rating: 'desc' },
      take: 6,
      include: {
        owner: {
          select: { id: true, name: true, rating: true, phone: true, trustBadges: true, trustScore: true },
        },
      },
    });

    // If too few results with strict filters, relax price constraint
    if (items.length < 3) {
      const relaxedWhere: Prisma.ItemWhereInput = {
        id: { not: item.id },
        status: 'approved',
        category: item.category,
        owner: { isBlocked: false },
      };

      items = await prisma.item.findMany({
        where: relaxedWhere,
        orderBy: { rating: 'desc' },
        take: 6,
        include: {
          owner: {
            select: { id: true, name: true, rating: true, phone: true, trustBadges: true, trustScore: true },
          },
        },
      });
    }

    return successResponse({ items: items.map(transformItem) });
  } catch (error) {
    console.error('GET /items/[id]/similar Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
