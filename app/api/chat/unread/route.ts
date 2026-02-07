export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, successResponse } from '@/lib/api-utils';

// GET /api/chat/unread — общее число непрочитанных сообщений
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { userId } = auth;

  const count = await prisma.message.count({
    where: {
      senderId: { not: userId },
      isRead: false,
      booking: {
        OR: [
          { renterId: userId },
          { item: { ownerId: userId } },
        ],
      },
    },
  });

  return successResponse({ unreadCount: count });
}
