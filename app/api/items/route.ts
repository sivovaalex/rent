export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import { requireVerified, transformItem, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, createItemSchema } from '@/lib/validations';
import { logError, apiLogger } from '@/lib/logger';
import { boundingBox, haversineDistance } from '@/lib/geo-utils';

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
      // Hide items from blocked owners
      where.owner = { isBlocked: false };
    }

    // City filter (by address text)
    const city = url.searchParams.get('city');
    if (city) {
      where.address = { contains: city, mode: 'insensitive' };
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

    // Geo filter — bounding box pre-filter
    const lat = url.searchParams.get('lat');
    const lon = url.searchParams.get('lon');
    const radius = url.searchParams.get('radius');
    const userLat = lat ? parseFloat(lat) : null;
    const userLon = lon ? parseFloat(lon) : null;
    const radiusKm = radius ? parseFloat(radius) : null;

    if (userLat !== null && userLon !== null && radiusKm) {
      const box = boundingBox(userLat, userLon, radiusKm);
      where.latitude = { gte: box.minLat, lte: box.maxLat };
      where.longitude = { gte: box.minLon, lte: box.maxLon };
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
      take: 100, // больше для карты
      include: {
        owner: {
          select: { id: true, name: true, rating: true, phone: true, trustBadges: true, trustScore: true },
        },
      },
    });

    // Post-filter by exact Haversine distance + add distance field
    let transformedItems = items.map(transformItem);

    if (userLat !== null && userLon !== null && radiusKm) {
      transformedItems = transformedItems
        .map((item: any) => {
          if (item.latitude && item.longitude) {
            const dist = haversineDistance(userLat, userLon, item.latitude, item.longitude);
            return { ...item, distance: Math.round(dist * 100) / 100 };
          }
          return item;
        })
        .filter((item: any) => !item.distance || item.distance <= radiusKm)
        .sort((a: any, b: any) => (a.distance ?? Infinity) - (b.distance ?? Infinity));
    }

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
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        photos: data.photos,
        attributes: data.attributes,
        approvalMode: data.approval_mode ?? null,
        approvalThreshold: data.approval_threshold ?? null,
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
