/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn().mockResolvedValue({ userId: 'admin-1' }),
  extractTokenFromHeader: vi.fn().mockReturnValue('mock-token'),
}));

vi.mock('@/lib/notifications', () => ({
  notifyItemModeration: vi.fn().mockResolvedValue(undefined),
  notifyVerification: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/lib/trust', () => ({
  recalculateTrust: vi.fn().mockResolvedValue(undefined),
}));

import { POST as moderateItem } from '@/app/api/admin/items/[id]/moderate/route';
import { POST as verifyUser } from '@/app/api/admin/users/[id]/verify/route';

// ======================== HELPERS ========================

const mockAdminUser = {
  id: 'admin-1',
  name: 'Админ',
  email: 'admin@test.com',
  phone: '+79000000001',
  passwordHash: null,
  role: 'admin' as const,
  rating: 5.0,
  isVerified: true,
  verificationStatus: 'verified' as const,
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

const mockPendingUser = {
  ...mockAdminUser,
  id: 'user-pending',
  role: 'renter' as const,
  isVerified: false,
  verificationStatus: 'pending' as const,
};

const mockItem = {
  id: 'item-1',
  ownerId: 'user-1',
  title: 'Тестовый лот',
  status: 'pending' as const,
  description: 'Описание',
  price: 1000,
  priceUnit: 'day' as const,
  category: 'electronics' as const,
  photos: [],
  isAvailable: true,
  rejectionReason: null,
  moderatedAt: null,
  moderatedBy: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeRequest(method: string, url: string, body?: unknown): Request {
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
  // Default: admin user
  prismaMock.user.findUnique.mockResolvedValue(mockAdminUser);
  // Default: $transaction resolves both ops
  prismaMock.item.update.mockResolvedValue(mockItem);
  prismaMock.verificationHistory.create.mockResolvedValue({});
});

// ======================== POST /api/admin/items/[id]/moderate ========================

describe('POST /api/admin/items/[id]/moderate', () => {
  test('200 — одобрение без причины', async () => {
    prismaMock.item.findUnique.mockResolvedValue(mockItem);

    const res = await moderateItem(
      makeRequest('POST', 'http://localhost/api/admin/items/item-1/moderate', { status: 'approved' }),
      makeParams('item-1'),
    );
    expect(res.status).toBe(200);
  });

  test('400 — отклонение без причины', async () => {
    prismaMock.item.findUnique.mockResolvedValue(mockItem);

    const res = await moderateItem(
      makeRequest('POST', 'http://localhost/api/admin/items/item-1/moderate', { status: 'rejected' }),
      makeParams('item-1'),
    );
    expect(res.status).toBe(400);
  });

  test('400 — отклонение с причиной меньше 3 символов', async () => {
    prismaMock.item.findUnique.mockResolvedValue(mockItem);

    const res = await moderateItem(
      makeRequest('POST', 'http://localhost/api/admin/items/item-1/moderate', {
        status: 'rejected',
        rejection_reason: 'ab',
      }),
      makeParams('item-1'),
    );
    expect(res.status).toBe(400);
  });

  test('200 — отклонение с валидной причиной', async () => {
    prismaMock.item.findUnique.mockResolvedValue(mockItem);

    const res = await moderateItem(
      makeRequest('POST', 'http://localhost/api/admin/items/item-1/moderate', {
        status: 'rejected',
        rejection_reason: 'Фото слишком плохого качества',
      }),
      makeParams('item-1'),
    );
    expect(res.status).toBe(200);

    expect(prismaMock.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'rejected',
          rejectionReason: 'Фото слишком плохого качества',
        }),
      }),
    );
  });

  test('404 — лот не найден', async () => {
    prismaMock.item.findUnique.mockResolvedValue(null);

    const res = await moderateItem(
      makeRequest('POST', 'http://localhost/api/admin/items/item-999/moderate', {
        status: 'approved',
      }),
      makeParams('item-999'),
    );
    expect(res.status).toBe(404);
  });

  test('403 — обычный пользователь не может модерировать', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...mockAdminUser, role: 'renter' });

    const res = await moderateItem(
      makeRequest('POST', 'http://localhost/api/admin/items/item-1/moderate', { status: 'approved' }),
      makeParams('item-1'),
    );
    expect(res.status).toBe(403);
  });

  test('причина НЕ сохраняется при одобрении', async () => {
    prismaMock.item.findUnique.mockResolvedValue(mockItem);

    await moderateItem(
      makeRequest('POST', 'http://localhost/api/admin/items/item-1/moderate', { status: 'approved' }),
      makeParams('item-1'),
    );

    expect(prismaMock.item.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ rejectionReason: null }),
      }),
    );
  });
});

// ======================== POST /api/admin/users/[id]/verify ========================

describe('POST /api/admin/users/[id]/verify', () => {
  test('200 — одобрение без причины', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(mockAdminUser)   // requireAdmin
      .mockResolvedValueOnce(mockPendingUser); // target user
    prismaMock.user.update.mockResolvedValue({ ...mockPendingUser, isVerified: true });

    const res = await verifyUser(
      makeRequest('POST', 'http://localhost/api/admin/users/user-pending/verify', { action: 'approve' }),
      makeParams('user-pending'),
    );
    expect(res.status).toBe(200);
  });

  test('400 — отклонение без причины', async () => {
    const res = await verifyUser(
      makeRequest('POST', 'http://localhost/api/admin/users/user-pending/verify', { action: 'reject' }),
      makeParams('user-pending'),
    );
    expect(res.status).toBe(400);
  });

  test('400 — отклонение с причиной меньше 3 символов', async () => {
    const res = await verifyUser(
      makeRequest('POST', 'http://localhost/api/admin/users/user-pending/verify', {
        action: 'reject',
        reason: 'no',
      }),
      makeParams('user-pending'),
    );
    expect(res.status).toBe(400);
  });

  test('200 — отклонение с валидной причиной', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(mockAdminUser)
      .mockResolvedValueOnce(mockPendingUser);
    prismaMock.user.update.mockResolvedValue({ ...mockPendingUser, verificationStatus: 'rejected' });

    const res = await verifyUser(
      makeRequest('POST', 'http://localhost/api/admin/users/user-pending/verify', {
        action: 'reject',
        reason: 'Документ нечитаем',
      }),
      makeParams('user-pending'),
    );
    expect(res.status).toBe(200);

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          verificationStatus: 'rejected',
          rejectionReason: 'Документ нечитаем',
        }),
      }),
    );
  });

  test('404 — пользователь не найден', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(mockAdminUser)
      .mockResolvedValueOnce(null);

    const res = await verifyUser(
      makeRequest('POST', 'http://localhost/api/admin/users/user-999/verify', { action: 'approve' }),
      makeParams('user-999'),
    );
    expect(res.status).toBe(404);
  });

  test('403 — обычный пользователь не может верифицировать', async () => {
    prismaMock.user.findUnique.mockResolvedValue({ ...mockAdminUser, role: 'renter' });

    const res = await verifyUser(
      makeRequest('POST', 'http://localhost/api/admin/users/user-pending/verify', { action: 'approve' }),
      makeParams('user-pending'),
    );
    expect(res.status).toBe(403);
  });

  test('причина сохраняется в rejectionReason при отклонении', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(mockAdminUser)
      .mockResolvedValueOnce(mockPendingUser);
    prismaMock.user.update.mockResolvedValue(mockPendingUser);

    await verifyUser(
      makeRequest('POST', 'http://localhost/api/admin/users/user-pending/verify', {
        action: 'reject',
        reason: 'Не совпадает имя в документе',
      }),
      makeParams('user-pending'),
    );

    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          rejectionReason: 'Не совпадает имя в документе',
        }),
      }),
    );
  });

  test('история верификации создаётся с причиной', async () => {
    prismaMock.user.findUnique
      .mockResolvedValueOnce(mockAdminUser)
      .mockResolvedValueOnce(mockPendingUser);
    prismaMock.user.update.mockResolvedValue(mockPendingUser);

    await verifyUser(
      makeRequest('POST', 'http://localhost/api/admin/users/user-pending/verify', {
        action: 'reject',
        reason: 'Документ просрочен',
      }),
      makeParams('user-pending'),
    );

    expect(prismaMock.verificationHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'reject',
          reason: 'Документ просрочен',
        }),
      }),
    );
  });
});
