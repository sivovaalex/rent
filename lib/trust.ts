import { prisma } from '@/lib/prisma';

// ==================== BADGE DEFINITIONS ====================

export interface TrustBadgeDef {
  key: string;
  label: string;
  icon: string; // lucide icon name
  color: string; // tailwind color
  description: string;
}

export const TRUST_BADGES: Record<string, TrustBadgeDef> = {
  verified: {
    key: 'verified',
    label: 'Проверенный',
    icon: 'ShieldCheck',
    color: 'blue',
    description: 'Личность подтверждена документом',
  },
  superhost: {
    key: 'superhost',
    label: 'Суперарендодатель',
    icon: 'Crown',
    color: 'yellow',
    description: '10+ успешных сделок, рейтинг ≥ 4.5, подтверждение ≥ 90%',
  },
  top_owner: {
    key: 'top_owner',
    label: 'Топ владелец',
    icon: 'Trophy',
    color: 'amber',
    description: '25+ успешных сделок и рейтинг ≥ 4.8',
  },
  reliable_renter: {
    key: 'reliable_renter',
    label: 'Надёжный арендатор',
    icon: 'UserCheck',
    color: 'green',
    description: '5+ успешных аренд без отмен',
  },
  fast_reply: {
    key: 'fast_reply',
    label: 'Быстрый ответ',
    icon: 'Zap',
    color: 'purple',
    description: 'Среднее время ответа менее 30 минут',
  },
  newcomer: {
    key: 'newcomer',
    label: 'Новичок',
    icon: 'Sparkles',
    color: 'gray',
    description: 'Менее 3 сделок на платформе',
  },
};

// ==================== TRUST CALCULATION ====================

export async function recalculateTrust(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      rating: true,
      isVerified: true,
    },
  });

  if (!user) return null;

  // Count completed and cancelled deals
  const isOwner = user.role === 'owner' || user.role === 'admin';

  // Owner: bookings on their items. Renter: their own bookings.
  const completedDeals = isOwner
    ? await prisma.booking.count({
        where: {
          item: { ownerId: userId },
          status: 'completed',
        },
      })
    : await prisma.booking.count({
        where: { renterId: userId, status: 'completed' },
      });

  const cancelledDeals = isOwner
    ? await prisma.booking.count({
        where: {
          item: { ownerId: userId },
          status: 'cancelled',
        },
      })
    : await prisma.booking.count({
        where: { renterId: userId, status: 'cancelled' },
      });

  const totalDeals = completedDeals + cancelledDeals;
  // No deals = no cancellations = perfect record (100%), not 0%
  const confirmationRate = totalDeals > 0
    ? Math.round((completedDeals / totalDeals) * 100)
    : 100;

  // Average response time (from chat messages)
  // Calculate as average time between first renter message and first owner reply per booking
  let avgResponseMinutes: number | null = null;
  if (isOwner) {
    const ownerItemIds = await prisma.item.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    const itemIds = ownerItemIds.map(i => i.id);

    if (itemIds.length > 0) {
      const bookingsWithMessages = await prisma.booking.findMany({
        where: { itemId: { in: itemIds } },
        select: { id: true },
      });
      const bookingIds = bookingsWithMessages.map(b => b.id);

      if (bookingIds.length > 0) {
        // For each booking, find first non-owner message and first owner reply after it
        const responseTimes: number[] = [];
        for (const bookingId of bookingIds.slice(0, 50)) { // limit to 50 for perf
          const msgs = await prisma.message.findMany({
            where: { bookingId },
            orderBy: { createdAt: 'asc' },
            select: { senderId: true, createdAt: true },
            take: 10,
          });
          const firstRenterMsg = msgs.find(m => m.senderId !== userId);
          if (firstRenterMsg) {
            const ownerReply = msgs.find(
              m => m.senderId === userId && m.createdAt > firstRenterMsg.createdAt
            );
            if (ownerReply) {
              const diffMs = ownerReply.createdAt.getTime() - firstRenterMsg.createdAt.getTime();
              responseTimes.push(diffMs / 60000);
            }
          }
        }
        if (responseTimes.length > 0) {
          avgResponseMinutes = Math.round(
            responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
          );
        }
      }
    }
  }

  // Calculate trust score (0-100)
  let trustScore = 0;
  trustScore += Math.min(completedDeals * 5, 30); // max 30 from deals
  trustScore += confirmationRate * 0.3; // max 30 from confirmation rate
  trustScore += Math.min(user.rating * 4, 20); // max 20 from rating
  if (user.isVerified) trustScore += 10; // 10 for verification
  if (avgResponseMinutes !== null && avgResponseMinutes < 60) {
    trustScore += Math.min(10, Math.round(10 * (1 - avgResponseMinutes / 60))); // max 10 for speed
  }
  trustScore = Math.min(100, Math.round(trustScore));

  // Calculate badges
  const badges: string[] = [];

  if (user.isVerified) {
    badges.push('verified');
  }

  if (completedDeals < 3) {
    badges.push('newcomer');
  }

  if (isOwner && completedDeals >= 10 && user.rating >= 4.5 && confirmationRate >= 90) {
    badges.push('superhost');
  }

  if (isOwner && completedDeals >= 25 && user.rating >= 4.8) {
    badges.push('top_owner');
  }

  if (!isOwner && completedDeals >= 5 && cancelledDeals === 0) {
    badges.push('reliable_renter');
  }

  if (avgResponseMinutes !== null && avgResponseMinutes < 30) {
    badges.push('fast_reply');
  }

  // Update user
  await prisma.user.update({
    where: { id: userId },
    data: {
      trustScore,
      completedDeals,
      cancelledDeals,
      confirmationRate,
      avgResponseMinutes,
      trustBadges: badges,
      trustUpdatedAt: new Date(),
    },
  });

  return {
    trustScore,
    completedDeals,
    cancelledDeals,
    confirmationRate,
    avgResponseMinutes,
    trustBadges: badges,
  };
}
