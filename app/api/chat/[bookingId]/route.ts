import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { inlineChatUnreadCheck } from '@/lib/cron/inline-checks';

interface RouteParams {
  params: Promise<{ bookingId: string }>;
}

// GET /api/chat/[bookingId] — сообщения конкретного бронирования
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { bookingId } = await params;
  const { userId } = auth;

  // Проверить что пользователь — участник бронирования
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      item: { select: { ownerId: true, title: true, photos: true, owner: { select: { id: true, name: true, photo: true } } } },
      renter: { select: { id: true, name: true, photo: true } },
    },
  });

  if (!booking) {
    return errorResponse('Бронирование не найдено', 404);
  }

  const isRenter = booking.renterId === userId;
  const isOwner = booking.item.ownerId === userId;

  if (!isRenter && !isOwner) {
    return errorResponse('Нет доступа к этому чату', 403);
  }

  // Загрузить сообщения
  const messages = await prisma.message.findMany({
    where: { bookingId },
    orderBy: { createdAt: 'asc' },
    include: {
      sender: { select: { id: true, name: true, photo: true } },
    },
  });

  // Отметить как прочитанные сообщения от другого пользователя
  await prisma.message.updateMany({
    where: {
      bookingId,
      senderId: { not: userId },
      isRead: false,
    },
    data: { isRead: true },
  });

  const otherUser = isOwner ? booking.renter : booking.item.owner;

  return successResponse({
    bookingId,
    itemTitle: booking.item.title,
    itemPhoto: booking.item.photos[0] ?? undefined,
    otherUser: {
      _id: otherUser.id,
      name: otherUser.name,
      photo: otherUser.photo ?? undefined,
    },
    messages: messages.map(m => ({
      _id: m.id,
      bookingId: m.bookingId,
      senderId: m.senderId,
      senderName: m.sender.name,
      text: m.text,
      isRead: m.isRead,
      createdAt: m.createdAt,
    })),
  });
}

// POST /api/chat/[bookingId] — отправить сообщение
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { bookingId } = await params;
  const { userId, user } = auth;

  // Проверить участие в бронировании
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { item: { select: { ownerId: true } } },
  });

  if (!booking) {
    return errorResponse('Бронирование не найдено', 404);
  }

  if (booking.renterId !== userId && booking.item.ownerId !== userId) {
    return errorResponse('Нет доступа к этому чату', 403);
  }

  const body = await request.json();
  const text = body.text?.trim();

  if (!text || text.length === 0) {
    return errorResponse('Сообщение не может быть пустым');
  }

  if (text.length > 2000) {
    return errorResponse('Сообщение слишком длинное (макс. 2000 символов)');
  }

  const message = await prisma.message.create({
    data: {
      bookingId,
      senderId: userId,
      text,
    },
  });

  // Fire-and-forget: check for unread messages > 30 min across all chats
  inlineChatUnreadCheck().catch(console.error);

  return successResponse({
    _id: message.id,
    bookingId: message.bookingId,
    senderId: message.senderId,
    senderName: user.name,
    text: message.text,
    isRead: message.isRead,
    createdAt: message.createdAt,
  }, 201);
}
