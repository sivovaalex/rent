/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/notifications/push', () => ({
  sendPushNotification: vi.fn(),
}));

vi.mock('@/lib/api-utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api-utils')>();
  return {
    ...actual,
    requireAuth: vi.fn(),
  };
});

import { sendPushNotification } from '@/lib/notifications/push';
import { requireAuth } from '@/lib/api-utils';

const mockSendPush = sendPushNotification as ReturnType<typeof vi.fn>;
const mockRequireAuth = requireAuth as ReturnType<typeof vi.fn>;

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function makeRequest() {
  return new Request('http://localhost/api/push/test', { method: 'POST' });
}

describe('POST /api/push/test', () => {
  it('401 если не авторизован', async () => {
    mockRequireAuth.mockResolvedValue({
      error: new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }),
    });

    const { POST } = await import('@/app/api/push/test/route');
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(401);
  });

  it('отправляет push и возвращает sent: true', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user-1' });
    mockSendPush.mockResolvedValue(true);

    const { POST } = await import('@/app/api/push/test/route');
    const res = await POST(makeRequest() as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.sent).toBe(true);
    expect(mockSendPush).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ title: expect.stringContaining('Арендол') }),
      'bookings'
    );
  });

  it('400 если push не отправлен (нет подписок)', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user-1' });
    mockSendPush.mockResolvedValue(false);

    const { POST } = await import('@/app/api/push/test/route');
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(400);
  });

  it('500 при ошибке сервера', async () => {
    mockRequireAuth.mockResolvedValue({ userId: 'user-1' });
    mockSendPush.mockRejectedValue(new Error('webpush error'));

    const { POST } = await import('@/app/api/push/test/route');
    const res = await POST(makeRequest() as any);
    expect(res.status).toBe(500);
  });
});
