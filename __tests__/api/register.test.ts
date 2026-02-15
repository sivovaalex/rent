/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('bcryptjs', () => ({
  default: { hash: vi.fn().mockResolvedValue('hashed-password') },
}));

vi.mock('@/lib/email', () => ({
  sendEmailVerificationEmail: vi.fn().mockResolvedValue(true),
}));

import { POST } from '@/app/api/auth/register/route';
import { sendEmailVerificationEmail } from '@/lib/email';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/auth/register', {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
}

const validBody = {
  name: 'Тест Тестов',
  email: 'test@test.com',
  phone: '+79001234567',
  password: 'password123',
  role: 'renter',
};

describe('POST /api/auth/register', () => {
  test('успешная регистрация — возвращает emailVerificationRequired, без token', async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      name: 'Тест Тестов',
      email: 'test@test.com',
      phone: '+79001234567',
      role: 'renter',
      emailVerified: false,
    });
    prismaMock.emailVerificationToken.create.mockResolvedValue({
      id: 'token-1',
      email: 'test@test.com',
      token: 'mock-token',
      expiresAt: new Date(),
    });

    const res = await POST(createRequest(validBody) as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.emailVerificationRequired).toBe(true);
    expect(data.token).toBeUndefined();
    expect(data.user).toBeUndefined();
    expect(sendEmailVerificationEmail).toHaveBeenCalledWith(
      'test@test.com',
      expect.any(String),
      'Тест Тестов'
    );
  });

  test('дубликат email — ошибка 400', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'existing',
      email: 'test@test.com',
      phone: '+79999999999',
    });

    const res = await POST(createRequest(validBody) as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('email');
  });

  test('дубликат телефона — ошибка 400', async () => {
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'existing',
      email: 'other@test.com',
      phone: '+79001234567',
    });

    const res = await POST(createRequest(validBody) as any);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toContain('телефон');
  });

  test('невалидные данные — ошибка 400', async () => {
    const res = await POST(createRequest({ name: 'A' }) as any);
    expect(res.status).toBe(400);
  });

  test('отсутствует email — ошибка 400', async () => {
    const res = await POST(createRequest({
      name: 'Тест',
      phone: '+79001234567',
      password: 'password123',
    }) as any);
    expect(res.status).toBe(400);
  });
});
