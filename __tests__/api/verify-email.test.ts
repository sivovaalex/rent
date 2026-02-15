/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

import { GET } from '@/app/api/auth/verify-email/route';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function createRequest(token?: string): Request {
  const url = token
    ? `http://localhost:3000/api/auth/verify-email?token=${token}`
    : 'http://localhost:3000/api/auth/verify-email';
  return new Request(url, { method: 'GET' });
}

describe('GET /api/auth/verify-email', () => {
  test('валидный токен — email подтверждён', async () => {
    const mockToken = {
      id: 'token-1',
      email: 'test@test.com',
      token: 'valid-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      usedAt: null,
      createdAt: new Date(),
    };
    const mockUser = {
      id: 'user-1',
      email: 'test@test.com',
      emailVerified: false,
    };

    prismaMock.emailVerificationToken.findUnique.mockResolvedValue(mockToken);
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    prismaMock.user.update.mockResolvedValue({ ...mockUser, emailVerified: true });
    prismaMock.emailVerificationToken.update.mockResolvedValue({ ...mockToken, usedAt: new Date() });

    const res = await GET(createRequest('valid-token') as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { emailVerified: true, emailVerifiedAt: expect.any(Date) },
    });
    expect(prismaMock.emailVerificationToken.update).toHaveBeenCalledWith({
      where: { id: 'token-1' },
      data: { usedAt: expect.any(Date) },
    });
  });

  test('токен не указан — ошибка 400', async () => {
    const res = await GET(createRequest() as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('не указан');
  });

  test('несуществующий токен — ошибка 400', async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue(null);

    const res = await GET(createRequest('nonexistent-token') as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('Недействительная');
  });

  test('истёкший токен — ошибка 400', async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue({
      id: 'token-1',
      email: 'test@test.com',
      token: 'expired-token',
      expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      usedAt: null,
      createdAt: new Date(),
    });

    const res = await GET(createRequest('expired-token') as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('истёк');
  });

  test('использованный токен — ошибка 400', async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue({
      id: 'token-1',
      email: 'test@test.com',
      token: 'used-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: new Date(),
      createdAt: new Date(),
    });

    const res = await GET(createRequest('used-token') as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error).toContain('уже была использована');
  });

  test('пользователь не найден — ошибка 404', async () => {
    prismaMock.emailVerificationToken.findUnique.mockResolvedValue({
      id: 'token-1',
      email: 'deleted@test.com',
      token: 'orphan-token',
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      usedAt: null,
      createdAt: new Date(),
    });
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await GET(createRequest('orphan-token') as any);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.success).toBe(false);
  });
});
