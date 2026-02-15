/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('bcryptjs', () => ({
  default: { compare: vi.fn() },
}));

vi.mock('@/lib/jwt', () => ({
  signToken: vi.fn().mockResolvedValue('mock-jwt-token'),
}));

import { POST } from '@/app/api/auth/login/route';
import bcrypt from 'bcryptjs';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: new Headers({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
}

const mockUser = {
  id: 'user-1',
  name: 'Тест',
  email: 'test@test.com',
  phone: '+79001234567',
  passwordHash: 'hashed-password',
  role: 'renter',
  rating: 5.0,
  isVerified: false,
  verificationStatus: 'not_verified',
  isBlocked: false,
  emailVerified: true,
  emailVerifiedAt: new Date(),
  photo: null,
  createdAt: new Date(),
  trustScore: 0,
  completedDeals: 0,
  cancelledDeals: 0,
  confirmationRate: 0,
  avgResponseMinutes: null,
  trustBadges: [],
  defaultApprovalMode: 'auto_approve',
  defaultApprovalThreshold: 4.0,
  verificationSubmittedAt: null,
  documentType: null,
  documentPath: null,
};

describe('POST /api/auth/login', () => {
  test('emailVerified=true — вход успешен', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(true);

    const res = await POST(createRequest({ email: 'test@test.com', password: 'password123' }) as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.token).toBe('mock-jwt-token');
    expect(data.user).toBeDefined();
  });

  test('emailVerified=false — ошибка 403', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      emailVerified: false,
      emailVerifiedAt: null,
    });
    (bcrypt.compare as any).mockResolvedValue(true);

    const res = await POST(createRequest({ email: 'test@test.com', password: 'password123' }) as any);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('Подтвердите email');
  });

  test('неверный пароль — ошибка 401', async () => {
    prismaMock.user.findUnique.mockResolvedValue(mockUser);
    (bcrypt.compare as any).mockResolvedValue(false);

    const res = await POST(createRequest({ email: 'test@test.com', password: 'wrongpass' }) as any);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('Неверные данные');
  });

  test('заблокирован — ошибка 403', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...mockUser,
      isBlocked: true,
    });

    const res = await POST(createRequest({ email: 'test@test.com', password: 'password123' }) as any);
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error).toContain('заблокирован');
  });

  test('несуществующий пользователь — ошибка 401', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const res = await POST(createRequest({ email: 'noone@test.com', password: 'password123' }) as any);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toContain('Неверные данные');
  });

  test('невалидные данные — ошибка 400', async () => {
    const res = await POST(createRequest({}) as any);
    expect(res.status).toBe(400);
  });
});
