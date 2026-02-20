export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, requireAdmin, errorResponse, successResponse } from '@/lib/api-utils';
import type { SupportCategory } from '@/types';

function transformTicket(ticket: {
  id: string;
  userId: string;
  category: string;
  subject: string;
  status: string;
  unreadByAdmin: boolean;
  unreadByUser: boolean;
  closedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  user?: { id: string; name: string; photo: string | null } | null;
  _count?: { messages: number };
}) {
  return {
    _id: ticket.id,
    userId: ticket.userId,
    category: ticket.category as SupportCategory,
    subject: ticket.subject,
    status: ticket.status,
    unreadByAdmin: ticket.unreadByAdmin,
    unreadByUser: ticket.unreadByUser,
    closedAt: ticket.closedAt,
    createdAt: ticket.createdAt,
    updatedAt: ticket.updatedAt,
    user: ticket.user
      ? { _id: ticket.user.id, name: ticket.user.name, photo: ticket.user.photo ?? undefined }
      : null,
    messageCount: ticket._count?.messages ?? 0,
  };
}

// GET /api/support — list tickets
export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { userId, user } = auth;
  const isAdmin = user.role === 'admin' || user.role === 'moderator';
  const { searchParams } = new URL(request.url);

  if (isAdmin) {
    const status = searchParams.get('status') || undefined;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = status ? { status: status as 'open' | 'in_progress' | 'closed' } : {};

    const [tickets, total] = await Promise.all([
      prisma.supportTicket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          user: { select: { id: true, name: true, photo: true } },
          _count: { select: { messages: true } },
        },
      }),
      prisma.supportTicket.count({ where }),
    ]);

    return successResponse({ tickets: tickets.map(transformTicket), total });
  }

  // Regular user — own tickets only
  const tickets = await prisma.supportTicket.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
      _count: { select: { messages: true } },
    },
  });

  return successResponse({ tickets: tickets.map(transformTicket), total: tickets.length });
}

// POST /api/support — create ticket
export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ('error' in auth) return auth.error;

  const { userId } = auth;

  let body: { subject?: unknown; category?: unknown; message?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse('Неверный формат запроса', 400);
  }

  const { subject, category, message } = body;

  if (!subject || typeof subject !== 'string' || subject.trim().length < 5) {
    return errorResponse('Тема должна содержать не менее 5 символов', 400);
  }
  if (subject.trim().length > 255) {
    return errorResponse('Тема слишком длинная', 400);
  }
  if (!category || !['technical', 'other'].includes(category as string)) {
    return errorResponse('Неверная категория', 400);
  }
  if (!message || typeof message !== 'string' || message.trim().length < 10) {
    return errorResponse('Сообщение должно содержать не менее 10 символов', 400);
  }

  const ticket = await prisma.supportTicket.create({
    data: {
      userId,
      subject: subject.trim(),
      category: category as SupportCategory,
      messages: {
        create: {
          userId,
          text: (message as string).trim(),
          isAdmin: false,
        },
      },
    },
    include: {
      _count: { select: { messages: true } },
    },
  });

  return successResponse({ ticket: transformTicket(ticket) }, 201);
}
