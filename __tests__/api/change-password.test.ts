/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
}));

vi.mock('bcryptjs', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn().mockResolvedValue('new-hashed-password'),
  },
}));

import { POST } from '@/app/api/auth/change-password/route';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';
import bcrypt from 'bcryptjs';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

const mockUser = {
  id: 'user-1',
  name: 'Test User',
  phone: '+79001234567',
  email: 'test@test.com',
  role: 'renter',
  rating: 5.0,
  isVerified: true,
  verificationStatus: 'verified',
  isBlocked: false,
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
  passwordHash: 'existing-hashed-password',
};

function mockAuth(userId: string) {
  (extractTokenFromHeader as any).mockReturnValue('mock-token');
  (verifyToken as any).mockResolvedValue({ userId });
  // First findUnique call is from requireAuth (returns full user for auth check)
  // Second findUnique call is from the route itself (returns passwordHash)
  prismaMock.user.findUnique
    .mockResolvedValueOnce(mockUser)
    .mockResolvedValueOnce({ passwordHash: 'existing-hashed-password' });
}

function createRequest(body: Record<string, unknown>): Request {
  return new Request('http://localhost:3000/api/auth/change-password', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      Authorization: 'Bearer mock-token',
    }),
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/change-password', () => {
  it('should return 401 when not authenticated', async () => {
    (extractTokenFromHeader as any).mockReturnValue(null);
    (verifyToken as any).mockResolvedValue(null);

    const response = await POST(createRequest({
      currentPassword: 'oldpass123',
      newPassword: 'newpass123',
    }) as any);

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('should return 400 when currentPassword is missing', async () => {
    mockAuth('user-1');

    const response = await POST(createRequest({
      newPassword: 'newpass123',
    }) as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('обязательны');
  });

  it('should return 400 when newPassword is missing', async () => {
    mockAuth('user-1');

    const response = await POST(createRequest({
      currentPassword: 'oldpass123',
    }) as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('обязательны');
  });

  it('should return 400 when newPassword is too short (< 6 chars)', async () => {
    mockAuth('user-1');

    const response = await POST(createRequest({
      currentPassword: 'oldpass123',
      newPassword: '12345',
    }) as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('минимум 6 символов');
  });

  it('should return 400 when current password is wrong', async () => {
    mockAuth('user-1');
    (bcrypt.compare as any).mockResolvedValue(false);

    const response = await POST(createRequest({
      currentPassword: 'wrongpassword',
      newPassword: 'newpass123',
    }) as any);

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('Неверный текущий пароль');
  });

  it('should return 200 and update password on success', async () => {
    mockAuth('user-1');
    (bcrypt.compare as any).mockResolvedValue(true);
    prismaMock.user.update.mockResolvedValue({ ...mockUser, passwordHash: 'new-hashed-password' });

    const response = await POST(createRequest({
      currentPassword: 'oldpass123',
      newPassword: 'newpass123',
    }) as any);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.message).toContain('успешно изменён');

    // Verify bcrypt.compare was called with correct arguments
    expect(bcrypt.compare).toHaveBeenCalledWith('oldpass123', 'existing-hashed-password');

    // Verify bcrypt.hash was called with the new password
    expect(bcrypt.hash).toHaveBeenCalledWith('newpass123', 10);

    // Verify prisma.user.update was called with the hashed password
    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { passwordHash: 'new-hashed-password' },
    });
  });
});
