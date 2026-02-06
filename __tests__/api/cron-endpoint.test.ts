/// <reference types="vitest/globals" />

const mockRunNotificationCron = vi.fn();

vi.mock('@/lib/cron/notifications', () => ({
  runNotificationCron: (...args: unknown[]) => mockRunNotificationCron(...args),
}));

import { GET } from '@/app/api/cron/notifications/route';

beforeEach(() => {
  vi.clearAllMocks();
  // Reset env
  delete process.env.CRON_SECRET;
});

function createRequest(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost:3000/api/cron/notifications', {
    method: 'GET',
    headers: new Headers(headers),
  });
}

describe('GET /api/cron/notifications', () => {
  it('should run cron and return results when no secret configured', async () => {
    mockRunNotificationCron.mockResolvedValue({
      chatUnread: 1,
      moderationReminders: 2,
      returnReminders: 0,
      reviewReminders: 1,
      autoRejected: 0,
      errors: [],
    });

    const response = await GET(createRequest() as any);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.chatUnread).toBe(1);
    expect(body.moderationReminders).toBe(2);
    expect(body.timestamp).toBeDefined();
  });

  it('should reject unauthorized request when secret is set', async () => {
    process.env.CRON_SECRET = 'my-secret-123';

    const response = await GET(createRequest() as any);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
  });

  it('should accept request with correct Bearer token', async () => {
    process.env.CRON_SECRET = 'my-secret-123';

    mockRunNotificationCron.mockResolvedValue({
      chatUnread: 0,
      moderationReminders: 0,
      returnReminders: 0,
      reviewReminders: 0,
      autoRejected: 0,
      errors: [],
    });

    const response = await GET(
      createRequest({ authorization: 'Bearer my-secret-123' }) as any
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });

  it('should reject request with wrong secret', async () => {
    process.env.CRON_SECRET = 'my-secret-123';

    const response = await GET(
      createRequest({ authorization: 'Bearer wrong-secret' }) as any
    );

    expect(response.status).toBe(401);
  });

  it('should return 500 on cron failure', async () => {
    mockRunNotificationCron.mockRejectedValue(new Error('Fatal error'));

    const response = await GET(createRequest() as any);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('Cron execution failed');
  });
});
