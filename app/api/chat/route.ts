export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';

// GET /api/chat — список диалогов текущего пользователя
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { userId } = auth;

  // Найти все бронирования где пользователь — арендатор или владелец товара
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { renterId: userId },
        { item: { ownerId: userId } },
      ],
    },
    include: {
      item: {
        select: { title: true, photos: true, ownerId: true, owner: { select: { id: true, name: true, photo: true } } },
      },
      renter: {
        select: { id: true, name: true, photo: true },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { text: true, createdAt: true, senderId: true },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  });

  // Подсчитать непрочитанные для каждого бронирования
  const unreadCounts = await prisma.message.groupBy({
    by: ['bookingId'],
    where: {
      senderId: { not: userId },
      isRead: false,
      bookingId: { in: bookings.map(b => b.id) },
    },
    _count: { id: true },
  });

  const unreadMap = new Map(unreadCounts.map(u => [u.bookingId, u._count.id]));

  const conversations = bookings
    .filter(b => b.messages.length > 0 || b.status !== 'cancelled')
    .map(b => {
      const isOwner = b.item.ownerId === userId;
      const otherUser = isOwner ? b.renter : b.item.owner;

      return {
        bookingId: b.id,
        itemTitle: b.item.title,
        itemPhoto: b.item.photos[0] ?? undefined,
        otherUser: {
          _id: otherUser.id,
          name: otherUser.name,
          photo: otherUser.photo ?? undefined,
        },
        lastMessage: b.messages[0]
          ? {
              text: b.messages[0].text,
              createdAt: b.messages[0].createdAt,
              senderId: b.messages[0].senderId,
            }
          : undefined,
        unreadCount: unreadMap.get(b.id) ?? 0,
      };
    });

  // Сортировка: сначала с непрочитанными, потом по дате последнего сообщения
  conversations.sort((a, b) => {
    if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
    if (a.unreadCount === 0 && b.unreadCount > 0) return 1;
    const aTime = a.lastMessage ? new Date(a.lastMessage.createdAt).getTime() : 0;
    const bTime = b.lastMessage ? new Date(b.lastMessage.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return successResponse({ conversations });
}
