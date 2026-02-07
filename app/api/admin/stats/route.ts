export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdminOnly, errorResponse, successResponse } from '@/lib/api-utils';
import { inlineModerationCheck } from '@/lib/cron/inline-checks';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdminOnly(request);
    if ('error' in authResult) return authResult.error;

    // Fire-and-forget: remind admins about pending items/users > 30 min
    inlineModerationCheck().catch(console.error);

    const [
      totalUsers,
      totalItems,
      totalBookings,
      pendingVerifications,
      pendingItems,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.item.count(),
      prisma.booking.count(),
      prisma.user.count({ where: { verificationStatus: 'pending' } }),
      prisma.item.count({ where: { status: 'pending' } }),
    ]);

    // Calculate total revenue from completed bookings
    const completedBookings = await prisma.booking.findMany({
      where: { status: 'completed' },
      select: { commission: true },
    });

    const totalRevenue = completedBookings.reduce(
      (sum, b) => sum + (b.commission || 0),
      0
    );

    return successResponse({
      totalUsers,
      totalItems,
      totalBookings,
      pendingVerifications,
      pendingItems,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
    });
  } catch (error) {
    console.error('GET /admin/stats Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
