/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn().mockResolvedValue({ userId: 'user-1' }),
  extractTokenFromHeader: vi.fn().mockReturnValue('mock-token'),
}));

vi.mock('@/lib/notifications', () => ({
  notifySupportTicketReply: vi.fn().mockResolvedValue(undefined),
}));

import { extractTokenFromHeader } from '@/lib/jwt';

import { GET as getList, POST as postCreate } from '@/app/api/support/route';
import { GET as getTicket, PATCH as patchStatus } from '@/app/api/support/[id]/route';
import { POST as postMessage } from '@/app/api/support/[id]/messages/route';
import { notifySupportTicketReply } from '@/lib/notifications';

// ======================== HELPERS ========================

const mockUser = {
  id: 'user-1',
  name: 'Тест',
  email: 'test@test.com',
  phone: '+79001234567',
  passwordHash: null,
  role: 'renter' as const,
  rating: 5.0,
  isVerified: false,
  verificationStatus: 'not_verified' as const,
  isBlocked: false,
  emailVerified: true,
  emailVerifiedAt: new Date(),
  photo: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  trustScore: 0,
  completedDeals: 0,
  cancelledDeals: 0,
  confirmationRate: 0,
  avgResponseMinutes: null,
  trustBadges: [],
  defaultApprovalMode: 'auto_approve' as const,
  defaultApprovalThreshold: 4.0,
  verificationSubmittedAt: null,
  documentType: null,
  documentPath: null,
  encryptedDocument: null,
  blockReason: null,
  blockedAt: null,
  blockedBy: null,
  verifiedAt: null,
  verifiedBy: null,
  rejectionReason: null,
  ownerType: null,
  companyName: null,
  inn: null,
  ogrn: null,
  trustUpdatedAt: null,
  notifyEmail: true,
  notifyVk: false,
  notifyTelegram: false,
  notifyPush: false,
  pushBookings: true,
  pushChat: true,
  pushModeration: true,
  pushReviews: true,
  pushReminders: true,
  notifyBookingRequests: true,
  vkId: null,
  telegramChatId: null,
};

const mockAdminUser = { ...mockUser, id: 'admin-1', role: 'admin' as const };
const mockModeratorUser = { ...mockUser, id: 'mod-1', role: 'moderator' as const };

const mockTicket = {
  id: 'ticket-1',
  userId: 'user-1',
  category: 'technical' as const,
  subject: 'Проблема с оплатой',
  status: 'open' as const,
  unreadByAdmin: true,
  unreadByUser: false,
  closedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  user: { id: 'user-1', name: 'Тест', photo: null },
  _count: { messages: 1 },
};

const mockMessage = {
  id: 'msg-1',
  ticketId: 'ticket-1',
  userId: 'user-1',
  isAdmin: false,
  text: 'Не могу оплатить бронирование',
  createdAt: new Date(),
  user: { id: 'user-1', name: 'Тест', photo: null },
};

function makeRequest(method: string, url: string, body?: unknown, userId = 'user-1'): Request {
  return new Request(url, {
    method,
    headers: new Headers({
      'Content-Type': 'application/json',
      Authorization: 'Bearer mock-token',
    }),
    body: body ? JSON.stringify(body) : undefined,
  });
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
  prismaMock.user.findUnique.mockResolvedValue(mockUser);
});

// ======================== GET /api/support (user) ========================

describe('GET /api/support', () => {
  test('user получает только свои тикеты', async () => {
    prismaMock.supportTicket.findMany.mockResolvedValue([mockTicket]);

    const res = await getList(makeRequest('GET', 'http://localhost:3000/api/support') as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.tickets).toHaveLength(1);
    expect(data.tickets[0]._id).toBe('ticket-1');
    expect(data.tickets[0].status).toBe('open');
  });

  test('admin получает все тикеты с count', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockAdminUser);
    prismaMock.supportTicket.findMany.mockResolvedValue([mockTicket]);
    prismaMock.supportTicket.count.mockResolvedValue(1);

    const res = await getList(makeRequest('GET', 'http://localhost:3000/api/support?status=open') as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(1);
    expect(data.tickets[0].user?._id).toBe('user-1');
  });

  test('401 без авторизации', async () => {
    (extractTokenFromHeader as ReturnType<typeof vi.fn>).mockReturnValueOnce(null);

    const res = await getList(makeRequest('GET', 'http://localhost:3000/api/support') as any);
    expect(res.status).toBe(401);
  });
});

// ======================== POST /api/support ========================

describe('POST /api/support', () => {
  test('создаёт тикет с первым сообщением', async () => {
    prismaMock.supportTicket.create.mockResolvedValue({ ...mockTicket, _count: { messages: 1 } });

    const res = await postCreate(
      makeRequest('POST', 'http://localhost:3000/api/support', {
        subject: 'Тема обращения',
        category: 'technical',
        message: 'Подробное описание проблемы здесь',
      }) as any,
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.ticket._id).toBe('ticket-1');
    expect(prismaMock.supportTicket.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          category: 'technical',
          subject: 'Тема обращения',
        }),
      }),
    );
  });

  test('400 если тема слишком короткая (< 5 символов)', async () => {
    const res = await postCreate(
      makeRequest('POST', 'http://localhost:3000/api/support', {
        subject: 'Те',
        category: 'technical',
        message: 'Подробное сообщение',
      }) as any,
    );
    expect(res.status).toBe(400);
  });

  test('400 если сообщение слишком короткое (< 10 символов)', async () => {
    const res = await postCreate(
      makeRequest('POST', 'http://localhost:3000/api/support', {
        subject: 'Нормальная тема',
        category: 'other',
        message: 'Кратко',
      }) as any,
    );
    expect(res.status).toBe(400);
  });

  test('400 при неверной категории', async () => {
    const res = await postCreate(
      makeRequest('POST', 'http://localhost:3000/api/support', {
        subject: 'Нормальная тема',
        category: 'invalid',
        message: 'Подробное сообщение здесь',
      }) as any,
    );
    expect(res.status).toBe(400);
  });
});

// ======================== GET /api/support/[id] ========================

describe('GET /api/support/[id]', () => {
  test('владелец тикета получает тикет с сообщениями', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue({ ...mockTicket, messages: [mockMessage] });
    prismaMock.supportTicket.update.mockResolvedValue(mockTicket);

    const res = await getTicket(
      makeRequest('GET', 'http://localhost:3000/api/support/ticket-1') as any,
      makeParams('ticket-1'),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ticket._id).toBe('ticket-1');
    expect(data.messages).toHaveLength(1);
  });

  test('admin получает чужой тикет', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockAdminUser);
    prismaMock.supportTicket.findUnique.mockResolvedValue({ ...mockTicket, userId: 'other-user', messages: [] });
    prismaMock.supportTicket.update.mockResolvedValue({ ...mockTicket, unreadByAdmin: false });

    const res = await getTicket(
      makeRequest('GET', 'http://localhost:3000/api/support/ticket-1') as any,
      makeParams('ticket-1'),
    );
    expect(res.status).toBe(200);
  });

  test('403 если user пытается получить чужой тикет', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue({ ...mockTicket, userId: 'other-user', messages: [] });

    const res = await getTicket(
      makeRequest('GET', 'http://localhost:3000/api/support/ticket-1') as any,
      makeParams('ticket-1'),
    );
    expect(res.status).toBe(403);
  });

  test('404 если тикет не найден', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue(null);

    const res = await getTicket(
      makeRequest('GET', 'http://localhost:3000/api/support/ticket-999') as any,
      makeParams('ticket-999'),
    );
    expect(res.status).toBe(404);
  });

  test('user — отмечает unreadByUser = false при открытии', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue({
      ...mockTicket,
      unreadByUser: true,
      messages: [],
    });
    prismaMock.supportTicket.update.mockResolvedValue({ ...mockTicket, unreadByUser: false });

    await getTicket(
      makeRequest('GET', 'http://localhost:3000/api/support/ticket-1') as any,
      makeParams('ticket-1'),
    );

    expect(prismaMock.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { unreadByUser: false } }),
    );
  });
});

// ======================== PATCH /api/support/[id] ========================

describe('PATCH /api/support/[id]', () => {
  test('admin закрывает тикет', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockAdminUser);
    prismaMock.supportTicket.findUnique.mockResolvedValue(mockTicket);
    prismaMock.supportTicket.update.mockResolvedValue({ ...mockTicket, status: 'closed', closedAt: new Date() });

    const res = await patchStatus(
      makeRequest('PATCH', 'http://localhost:3000/api/support/ticket-1', { status: 'closed' }) as any,
      makeParams('ticket-1'),
    );
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.ticket.status).toBe('closed');
  });

  test('moderator меняет статус на in_progress', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockModeratorUser);
    prismaMock.supportTicket.findUnique.mockResolvedValue(mockTicket);
    prismaMock.supportTicket.update.mockResolvedValue({ ...mockTicket, status: 'in_progress' });

    const res = await patchStatus(
      makeRequest('PATCH', 'http://localhost:3000/api/support/ticket-1', { status: 'in_progress' }) as any,
      makeParams('ticket-1'),
    );
    expect(res.status).toBe(200);
  });

  test('403 если обычный user пытается изменить статус', async () => {
    const res = await patchStatus(
      makeRequest('PATCH', 'http://localhost:3000/api/support/ticket-1', { status: 'closed' }) as any,
      makeParams('ticket-1'),
    );
    expect(res.status).toBe(403);
  });

  test('400 при неверном статусе', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockAdminUser);

    const res = await patchStatus(
      makeRequest('PATCH', 'http://localhost:3000/api/support/ticket-1', { status: 'invalid' }) as any,
      makeParams('ticket-1'),
    );
    expect(res.status).toBe(400);
  });
});

// ======================== POST /api/support/[id]/messages ========================

describe('POST /api/support/[id]/messages', () => {
  test('user добавляет сообщение — unreadByAdmin становится true', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue(mockTicket);
    prismaMock.supportMessage.create.mockResolvedValue(mockMessage);
    prismaMock.supportTicket.update.mockResolvedValue({ ...mockTicket, unreadByAdmin: true });

    const res = await postMessage(
      makeRequest('POST', 'http://localhost:3000/api/support/ticket-1/messages', { text: 'Уточнение' }) as any,
      makeParams('ticket-1'),
    );
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.message._id).toBe('msg-1');
    expect(data.message.isAdmin).toBe(false);
  });

  test('admin отвечает — isAdmin=true, уведомление отправляется', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockAdminUser);
    prismaMock.supportTicket.findUnique.mockResolvedValue(mockTicket);
    prismaMock.supportMessage.create.mockResolvedValue({ ...mockMessage, isAdmin: true, userId: null, user: null });
    prismaMock.supportTicket.update.mockResolvedValue({ ...mockTicket, unreadByUser: true });

    const res = await postMessage(
      makeRequest('POST', 'http://localhost:3000/api/support/ticket-1/messages', { text: 'Ответ поддержки' }) as any,
      makeParams('ticket-1'),
    );

    expect(res.status).toBe(201);
    expect(notifySupportTicketReply).toHaveBeenCalledWith('user-1', 'Проблема с оплатой');
  });

  test('user отвечает в закрытый тикет — тикет переоткрывается', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue({ ...mockTicket, status: 'closed' });
    prismaMock.supportMessage.create.mockResolvedValue(mockMessage);
    prismaMock.supportTicket.update.mockResolvedValue({ ...mockTicket, status: 'open' });

    await postMessage(
      makeRequest('POST', 'http://localhost:3000/api/support/ticket-1/messages', { text: 'Проблема вернулась' }) as any,
      makeParams('ticket-1'),
    );

    expect(prismaMock.supportTicket.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'open' }),
      }),
    );
  });

  test('400 если сообщение пустое', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue(mockTicket);

    const res = await postMessage(
      makeRequest('POST', 'http://localhost:3000/api/support/ticket-1/messages', { text: '' }) as any,
      makeParams('ticket-1'),
    );
    expect(res.status).toBe(400);
  });

  test('403 если чужой тикет', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue({ ...mockTicket, userId: 'other-user' });

    const res = await postMessage(
      makeRequest('POST', 'http://localhost:3000/api/support/ticket-1/messages', { text: 'Текст' }) as any,
      makeParams('ticket-1'),
    );
    expect(res.status).toBe(403);
  });

  test('404 если тикет не найден', async () => {
    prismaMock.supportTicket.findUnique.mockResolvedValue(null);

    const res = await postMessage(
      makeRequest('POST', 'http://localhost:3000/api/support/ticket-999/messages', { text: 'Текст' }) as any,
      makeParams('ticket-999'),
    );
    expect(res.status).toBe(404);
  });
});
