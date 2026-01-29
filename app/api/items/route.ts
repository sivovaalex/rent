import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireVerified, transformItem, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, createItemSchema } from '@/lib/validations';
import { logError, apiLogger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const subcategory = url.searchParams.get('subcategory');
    const search = url.searchParams.get('search');
    const minPrice = url.searchParams.get('minPrice');
    const maxPrice = url.searchParams.get('maxPrice');
    const sort = url.searchParams.get('sort') || 'newest';
    const owner_id = url.searchParams.get('owner_id');
    const show_all_statuses = url.searchParams.get('show_all_statuses') === 'true';

    const where: Prisma.ItemWhereInput = {};

    // Filter by owner or show only approved
    if (owner_id) {
      where.ownerId = owner_id;
      if (show_all_statuses) {
        where.status = { in: ['approved', 'pending', 'rejected', 'draft'] };
      } else {
        where.status = 'approved';
      }
    } else {
      where.status = 'approved';
    }

    // Category filter
    if (category && category !== 'all') {
      where.category = category as any;
    }
    if (subcategory && subcategory !== 'all') {
      where.subcategory = subcategory;
    }

    // Search filter
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Price filter
    if (minPrice || maxPrice) {
      where.pricePerDay = {};
      if (minPrice) where.pricePerDay.gte = parseFloat(minPrice);
      if (maxPrice) where.pricePerDay.lte = parseFloat(maxPrice);
    }

    // Sorting
    let orderBy: Prisma.ItemOrderByWithRelationInput = {};
    if (sort === 'newest') orderBy = { createdAt: 'desc' };
    if (sort === 'price_asc') orderBy = { pricePerDay: 'asc' };
    if (sort === 'price_desc') orderBy = { pricePerDay: 'desc' };
    if (sort === 'rating') orderBy = { rating: 'desc' };

    const items = await prisma.item.findMany({
      where,
      orderBy,
      take: 50,
      include: {
        owner: {
          select: { id: true, name: true, rating: true, phone: true, trustBadges: true, trustScore: true },
        },
      },
    });

    const transformedItems = items.map(transformItem);

    return successResponse({ items: transformedItems });
  } catch (error) {
    logError(error as Error, { path: '/api/items', method: 'GET' });
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireVerified(request);
    if ('error' in authResult) return authResult.error;

    const validation = await validateBody(request, createItemSchema);
    if (!validation.success) return validation.error;

    const data = validation.data;

    const item = await prisma.item.create({
      data: {
        ownerId: authResult.userId,
        category: data.category,
        subcategory: data.subcategory || null,
        title: data.title,
        description: data.description,
        pricePerDay: data.price_per_day ?? data.pricePerDay!,
        pricePerMonth: data.price_per_month ?? data.pricePerMonth!,
        deposit: data.deposit,
        address: data.address,
        photos: data.photos,
        attributes: data.attributes,
        status: 'pending',
      },
    });

    return successResponse({
      success: true,
      item: transformItem(item),
    });
  } catch (error) {
    logError(error as Error, { path: '/api/items', method: 'POST' });
    return errorResponse('Ошибка сервера', 500);
  }
}
