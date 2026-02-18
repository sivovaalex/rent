export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, chatMessageSchema } from '@/lib/validations';
import { apiRateLimiter, rateLimitResponse, getClientIP } from '@/lib/rate-limit';
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
      item: { select: { ownerId: true, title: true, photos: true, owner: { select: { id: true, name: true, photo: true, isBlocked: true } } } },
      renter: { select: { id: true, name: true, photo: true, isBlocked: true } },
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

  // Check if other participant is blocked
  const otherBlocked = isOwner ? booking.renter.isBlocked : booking.item.owner.isBlocked;
  if (otherBlocked) {
    return errorResponse('Чат недоступен: другой участник заблокирован', 403);
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
    include: {
      item: { select: { ownerId: true } },
      renter: { select: { isBlocked: true } },
    },
  });

  if (!booking) {
    return errorResponse('Бронирование не найдено', 404);
  }

  if (booking.renterId !== userId && booking.item.ownerId !== userId) {
    return errorResponse('Нет доступа к этому чату', 403);
  }

  // Check if other participant is blocked
  const isPostOwner = booking.item.ownerId === userId;
  if (isPostOwner) {
    // Owner sending — check if renter is blocked
    if (booking.renter.isBlocked) {
      return errorResponse('Чат недоступен: другой участник заблокирован', 403);
    }
  } else {
    // Renter sending — need to check if owner is blocked
    const owner = await prisma.user.findUnique({
      where: { id: booking.item.ownerId },
      select: { isBlocked: true },
    });
    if (owner?.isBlocked) {
      return errorResponse('Чат недоступен: другой участник заблокирован', 403);
    }
  }

  // Rate limit by user
  const ip = getClientIP(request);
  const rateLimitResult = apiRateLimiter.check(`chat:${userId}:${ip}`);
  if (!rateLimitResult.success) {
    return rateLimitResponse(rateLimitResult.resetTime);
  }

  // Validate message body via Zod
  const validation = await validateBody(request, chatMessageSchema);
  if (!validation.success) return validation.error;
  const { text } = validation.data;

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
