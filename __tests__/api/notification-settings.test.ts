/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

// Mock JWT
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
}));

import { GET, PATCH } from '@/app/api/notifications/settings/route';
import { verifyToken } from '@/lib/jwt';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function createRequest(
  method: string,
  body?: Record<string, unknown>,
  token?: string
): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const init: RequestInit = { method, headers: new Headers(headers) };
  if (body && method !== 'GET') {
    init.body = JSON.stringify(body);
  }

  return new Request('http://localhost:3000/api/notifications/settings', init);
}

describe('GET /api/notifications/settings', () => {
  it('should return 401 without token', async () => {
    const response = await GET(createRequest('GET') as any);
    expect(response.status).toBe(401);
  });

  it('should return 401 with invalid token', async () => {
    (verifyToken as any).mockResolvedValue(null);

    const response = await GET(createRequest('GET', undefined, 'bad-token') as any);
    expect(response.status).toBe(401);
  });

  it('should return 404 if user not found', async () => {
    (verifyToken as any).mockResolvedValue({ userId: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await GET(createRequest('GET', undefined, 'valid-token') as any);
    expect(response.status).toBe(404);
  });

  it('should return user notification settings', async () => {
    (verifyToken as any).mockResolvedValue({ userId: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue({
      email: 'test@example.com',
      notifyEmail: true,
      notifyVk: false,
      notifyTelegram: true,
      notifyPush: true,
      pushBookings: true,
      pushChat: true,
      pushModeration: false,
      pushReviews: true,
      pushReminders: true,
      notifyBookingRequests: true,
      vkId: null,
      telegramChatId: '12345',
    });

    const response = await GET(createRequest('GET', undefined, 'valid-token') as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.email).toBe('test@example.com');
    expect(body.notifyEmail).toBe(true);
    expect(body.notifyTelegram).toBe(true);
    expect(body.notifyBookingRequests).toBe(true);
    expect(body.vkConnected).toBe(false);
    expect(body.telegramConnected).toBe(true);
  });
});

describe('PATCH /api/notifications/settings', () => {
  it('should return 401 without token', async () => {
    const response = await PATCH(createRequest('PATCH', { notifyEmail: false }) as any);
    expect(response.status).toBe(401);
  });

  it('should return 400 for invalid body', async () => {
    (verifyToken as any).mockResolvedValue({ userId: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue({ vkId: null, telegramChatId: null });

    const response = await PATCH(
      createRequest('PATCH', { notifyEmail: 'not-a-boolean' }, 'valid-token') as any
    );
    expect(response.status).toBe(400);
  });

  it('should update notification settings', async () => {
    (verifyToken as any).mockResolvedValue({ userId: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue({
      vkId: 'vk-123',
      telegramChatId: 'tg-123',
    });
    prismaMock.user.update.mockResolvedValue({
      email: 'test@example.com',
      notifyEmail: false,
      notifyVk: true,
      notifyTelegram: true,
      notifyPush: true,
      pushBookings: true,
      pushChat: true,
      pushModeration: true,
      pushReviews: true,
      pushReminders: true,
      notifyBookingRequests: false,
      vkId: 'vk-123',
      telegramChatId: 'tg-123',
    });

    const response = await PATCH(
      createRequest('PATCH', { notifyEmail: false, notifyBookingRequests: false }, 'valid-token') as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.notifyEmail).toBe(false);
    expect(body.notifyBookingRequests).toBe(false);
    expect(body.vkConnected).toBe(true);
    expect(body.telegramConnected).toBe(true);
  });

  it('should reject enabling VK when not connected', async () => {
    (verifyToken as any).mockResolvedValue({ userId: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue({
      vkId: null,
      telegramChatId: null,
    });

    const response = await PATCH(
      createRequest('PATCH', { notifyVk: true }, 'valid-token') as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('VK');
  });

  it('should reject enabling Telegram when not connected', async () => {
    (verifyToken as any).mockResolvedValue({ userId: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue({
      vkId: null,
      telegramChatId: null,
    });

    const response = await PATCH(
      createRequest('PATCH', { notifyTelegram: true }, 'valid-token') as any
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('Telegram');
  });

  it('should return 404 if user not found during update', async () => {
    (verifyToken as any).mockResolvedValue({ userId: 'user-1' });
    prismaMock.user.findUnique.mockResolvedValue(null);

    const response = await PATCH(
      createRequest('PATCH', { notifyEmail: true }, 'valid-token') as any
    );
    expect(response.status).toBe(404);
  });
});
