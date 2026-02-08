/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
}));

import { POST } from '@/app/api/profile/become-owner/route';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function mockAuth(userId: string, overrides: Record<string, unknown> = {}) {
  (extractTokenFromHeader as any).mockReturnValue('mock-token');
  (verifyToken as any).mockResolvedValue({ userId });
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    name: 'Test User',
    phone: '+79001234567',
    email: null,
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
    ...overrides,
  });
}

function createRequest(): Request {
  return new Request('http://localhost:3000/api/profile/become-owner', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      authorization: 'Bearer mock-token',
    }),
  });
}

describe('POST /api/profile/become-owner', () => {
  it('should return 401 without auth', async () => {
    (extractTokenFromHeader as any).mockReturnValue(null);
    (verifyToken as any).mockResolvedValue(null);

    const response = await POST(createRequest() as any);
    expect(response.status).toBe(401);
  });

  it('should return 403 if user is not verified', async () => {
    mockAuth('user-1', { isVerified: false, verificationStatus: 'not_verified' });

    const response = await POST(createRequest() as any);
    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error).toContain('верификация');
  });

  it('should return 400 if user is already an owner', async () => {
    mockAuth('user-1', { role: 'owner' });

    const response = await POST(createRequest() as any);
    expect(response.status).toBe(400);
  });

  it('should return 400 if user is admin', async () => {
    mockAuth('user-1', { role: 'admin' });

    const response = await POST(createRequest() as any);
    expect(response.status).toBe(400);
  });

  it('should return 400 if user is moderator', async () => {
    mockAuth('user-1', { role: 'moderator' });

    const response = await POST(createRequest() as any);
    expect(response.status).toBe(400);
  });

  it('should successfully change role from renter to owner', async () => {
    mockAuth('user-1', { role: 'renter', isVerified: true });

    prismaMock.user.update.mockResolvedValue({
      id: 'user-1',
      name: 'Test User',
      phone: '+79001234567',
      email: null,
      role: 'owner',
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
    });

    const response = await POST(createRequest() as any);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user.role).toBe('owner');

    expect(prismaMock.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'owner' },
    });
  });
});
