export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import { notifySupportTicketReply } from '@/lib/notifications';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/support/[id]/messages — add message to ticket
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { userId, user } = auth;
  const { id } = await params;
  const isAdmin = user.role === 'admin' || user.role === 'moderator';

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return errorResponse('Обращение не найдено', 404);

  if (!isAdmin && ticket.userId !== userId) {
    return errorResponse('Нет доступа', 403);
  }

  if (ticket.status === 'closed') {
    return errorResponse('Обращение закрыто. Откройте его, чтобы продолжить переписку.', 409);
  }

  let body: { text?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Неверный формат запроса', 400);
  }

  const { text } = body;
  if (!text || typeof text !== 'string' || text.trim().length < 1) {
    return errorResponse('Сообщение не может быть пустым', 400);
  }
  if (text.trim().length > 5000) {
    return errorResponse('Сообщение слишком длинное', 400);
  }

  const [message] = await prisma.$transaction([
    prisma.supportMessage.create({
      data: {
        ticketId: id,
        userId: isAdmin ? null : userId,
        text: text.trim(),
        isAdmin,
      },
      include: {
        user: { select: { id: true, name: true, photo: true } },
      },
    }),
    prisma.supportTicket.update({
      where: { id },
      data: {
        unreadByAdmin: !isAdmin,
        unreadByUser: isAdmin,
      },
    }),
  ]);

  // Notify user if admin replied
  if (isAdmin) {
    notifySupportTicketReply(ticket.userId, ticket.subject).catch(console.error);
  }

  return successResponse(
    {
      message: {
        _id: message.id,
        ticketId: message.ticketId,
        userId: message.userId,
        isAdmin: message.isAdmin,
        text: message.text,
        createdAt: message.createdAt,
        user: message.user
          ? { _id: message.user.id, name: message.user.name, photo: message.user.photo ?? undefined }
          : null,
      },
    },
    201,
  );
}
