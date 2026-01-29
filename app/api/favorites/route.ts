import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';

// GET /api/favorites — список ID избранных товаров
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const favorites = await prisma.favorite.findMany({
    where: { userId: auth.userId },
    select: { itemId: true },
  });

  return successResponse({ favoriteIds: favorites.map(f => f.itemId) });
}

// POST /api/favorites — добавить в избранное
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { itemId } = await request.json();
  if (!itemId) return errorResponse('itemId обязателен');

  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return errorResponse('Товар не найден', 404);

  await prisma.favorite.upsert({
    where: { userId_itemId: { userId: auth.userId, itemId } },
    create: { userId: auth.userId, itemId },
    update: {},
  });

  return successResponse({ success: true }, 201);
}

// DELETE /api/favorites — удалить из избранного
export async function DELETE(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { itemId } = await request.json();
  if (!itemId) return errorResponse('itemId обязателен');

  await prisma.favorite.deleteMany({
    where: { userId: auth.userId, itemId },
  });

  return successResponse({ success: true });
}
