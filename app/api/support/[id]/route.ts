export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';
import type { SupportCategory, SupportStatus } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function transformMessage(m: {
  id: string;
  ticketId: string;
  userId: string | null;
  isAdmin: boolean;
  text: string;
  createdAt: Date;
  user?: { id: string; name: string; photo: string | null } | null;
}) {
  return {
    _id: m.id,
    ticketId: m.ticketId,
    userId: m.userId,
    isAdmin: m.isAdmin,
    text: m.text,
    createdAt: m.createdAt,
    user: m.user
      ? { _id: m.user.id, name: m.user.name, photo: m.user.photo ?? undefined }
      : null,
  };
}

// GET /api/support/[id] — ticket with messages
export async function GET(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { userId, user } = auth;
  const { id } = await params;
  const isAdmin = user.role === 'admin' || user.role === 'moderator';

  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, photo: true } },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { id: true, name: true, photo: true } },
        },
      },
    },
  });

  if (!ticket) return errorResponse('Обращение не найдено', 404);

  if (!isAdmin && ticket.userId !== userId) {
    return errorResponse('Нет доступа', 403);
  }

  // Mark as read
  if (isAdmin && ticket.unreadByAdmin) {
    await prisma.supportTicket.update({ where: { id }, data: { unreadByAdmin: false } });
  } else if (!isAdmin && ticket.unreadByUser) {
    await prisma.supportTicket.update({ where: { id }, data: { unreadByUser: false } });
  }

  return successResponse({
    ticket: {
      _id: ticket.id,
      userId: ticket.userId,
      category: ticket.category as SupportCategory,
      subject: ticket.subject,
      status: ticket.status as SupportStatus,
      unreadByAdmin: ticket.unreadByAdmin,
      unreadByUser: ticket.unreadByUser,
      closedAt: ticket.closedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      user: ticket.user
        ? { _id: ticket.user.id, name: ticket.user.name, photo: ticket.user.photo ?? undefined }
        : null,
    },
    messages: ticket.messages.map(transformMessage),
  });
}

// PATCH /api/support/[id] — update status (admin/moderator only)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { user } = auth;
  const { id } = await params;

  if (user.role !== 'admin' && user.role !== 'moderator') {
    return errorResponse('Доступ запрещён', 403);
  }

  let body: { status?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Неверный формат запроса', 400);
  }

  const { status } = body;
  if (!status || !['open', 'in_progress', 'closed'].includes(status as string)) {
    return errorResponse('Неверный статус', 400);
  }

  const ticket = await prisma.supportTicket.findUnique({ where: { id } });
  if (!ticket) return errorResponse('Обращение не найдено', 404);

  const updated = await prisma.supportTicket.update({
    where: { id },
    data: {
      status: status as SupportStatus,
      closedAt: status === 'closed' ? new Date() : null,
    },
  });

  return successResponse({
    ticket: {
      _id: updated.id,
      userId: updated.userId,
      category: updated.category as SupportCategory,
      subject: updated.subject,
      status: updated.status as SupportStatus,
      unreadByAdmin: updated.unreadByAdmin,
      unreadByUser: updated.unreadByUser,
      closedAt: updated.closedAt,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    },
  });
}
