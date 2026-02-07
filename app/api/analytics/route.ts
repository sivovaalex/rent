export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';

// GET /api/analytics — аналитика для владельца
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  if (auth.user.role !== 'owner' && auth.user.role !== 'admin') {
    return errorResponse('Доступ только для владельцев', 403);
  }

  const months = parseInt(request.nextUrl.searchParams.get('months') || '12');
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

  const userId = auth.userId;

  // Все товары владельца
  const ownerItems = await prisma.item.findMany({
    where: { ownerId: userId },
    select: { id: true, title: true, photos: true, pricePerDay: true },
  });

  const itemIds = ownerItems.map(i => i.id);

  if (itemIds.length === 0) {
    return successResponse({
      revenueByMonth: [],
      topItems: [],
      calendarOccupancy: 0,
      conversionRate: 0,
      totalRevenue: 0,
      totalBookings: 0,
      activeBookings: 0,
      totalItems: 0,
    });
  }

  // Все бронирования по товарам владельца за период
  const bookings = await prisma.booking.findMany({
    where: {
      itemId: { in: itemIds },
      createdAt: { gte: startDate },
      status: { not: 'cancelled' },
    },
    select: {
      id: true,
      itemId: true,
      rentalPrice: true,
      commission: true,
      totalPrice: true,
      startDate: true,
      endDate: true,
      status: true,
      createdAt: true,
    },
  });

  // 1. Доход по месяцам (rentalPrice — доход владельца, без комиссии)
  const revenueMap: Record<string, number> = {};
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    revenueMap[key] = 0;
  }

  for (const b of bookings) {
    if (b.status === 'paid' || b.status === 'active' || b.status === 'completed') {
      const d = b.createdAt;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (key in revenueMap) {
        revenueMap[key] += b.rentalPrice;
      }
    }
  }

  const revenueByMonth = Object.entries(revenueMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, revenue]) => {
      const [y, m] = month.split('-');
      const label = new Date(parseInt(y), parseInt(m) - 1).toLocaleDateString('ru-RU', { month: 'short', year: '2-digit' });
      return { month, label, revenue: Math.round(revenue * 100) / 100 };
    });

  // 2. Топ-5 популярных товаров (по кол-ву бронирований)
  const itemBookingCount: Record<string, { count: number; revenue: number }> = {};
  for (const b of bookings) {
    if (!itemBookingCount[b.itemId]) {
      itemBookingCount[b.itemId] = { count: 0, revenue: 0 };
    }
    itemBookingCount[b.itemId].count++;
    if (b.status === 'paid' || b.status === 'active' || b.status === 'completed') {
      itemBookingCount[b.itemId].revenue += b.rentalPrice;
    }
  }

  const topItems = Object.entries(itemBookingCount)
    .sort(([, a], [, b]) => b.count - a.count)
    .slice(0, 5)
    .map(([itemId, data]) => {
      const item = ownerItems.find(i => i.id === itemId);
      return {
        itemId,
        title: item?.title ?? 'Удалён',
        photo: item?.photos?.[0],
        bookings: data.count,
        revenue: Math.round(data.revenue * 100) / 100,
      };
    });

  // 3. Заполняемость календаря (% дней занятых из последних 30 дней)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const activeBookings = await prisma.booking.findMany({
    where: {
      itemId: { in: itemIds },
      status: { in: ['paid', 'active', 'completed'] },
      startDate: { lte: now },
      endDate: { gte: thirtyDaysAgo },
    },
    select: { startDate: true, endDate: true, itemId: true },
  });

  // Считаем уникальные пары (товар, день) за последние 30 дней
  const occupiedDays = new Set<string>();
  const totalPossibleDays = itemIds.length * 30;
  for (const b of activeBookings) {
    const start = new Date(Math.max(b.startDate.getTime(), thirtyDaysAgo.getTime()));
    const end = new Date(Math.min(b.endDate.getTime(), now.getTime()));
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      occupiedDays.add(`${b.itemId}_${d.toISOString().slice(0, 10)}`);
    }
  }
  const calendarOccupancy = totalPossibleDays > 0
    ? Math.round((occupiedDays.size / totalPossibleDays) * 100)
    : 0;

  // 4. Конверсия просмотров в бронирования
  // У нас нет модели просмотров, поэтому считаем конверсию как:
  // (количество бронирований / количество товаров) — средняя конверсия
  // Это упрощённая метрика, в будущем можно добавить счётчик просмотров
  const totalBookingsCount = bookings.length;
  const conversionRate = ownerItems.length > 0
    ? Math.round((totalBookingsCount / ownerItems.length) * 100) / 100
    : 0;

  // Суммарные показатели
  const totalRevenue = bookings
    .filter(b => b.status === 'paid' || b.status === 'active' || b.status === 'completed')
    .reduce((sum, b) => sum + b.rentalPrice, 0);

  const currentActive = bookings.filter(b => b.status === 'active').length;

  return successResponse({
    revenueByMonth,
    topItems,
    calendarOccupancy,
    conversionRate,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    totalBookings: totalBookingsCount,
    activeBookings: currentActive,
    totalItems: ownerItems.length,
  });
}
