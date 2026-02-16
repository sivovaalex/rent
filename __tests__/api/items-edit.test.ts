/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
}));

import { PATCH } from '@/app/api/items/[id]/route';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function mockAuth(userId: string) {
  (extractTokenFromHeader as any).mockReturnValue('mock-token');
  (verifyToken as any).mockResolvedValue({ userId });
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    name: 'Test Owner',
    phone: '+79001234567',
    email: null,
    role: 'owner',
    rating: 5.0,
    isVerified: true,
    verificationStatus: 'verified',
    isBlocked: false,
    photo: null,
    createdAt: new Date(),
    trustScore: 50,
    completedDeals: 0,
    cancelledDeals: 0,
    confirmationRate: 100,
    avgResponseMinutes: null,
    trustBadges: [],
    defaultApprovalMode: 'auto_approve',
    defaultApprovalThreshold: 4.0,
  });
}

function mockItem(overrides: Record<string, any> = {}) {
  return {
    id: 'item-1',
    ownerId: 'user-1',
    title: 'Test Item',
    description: 'Test description for item',
    category: 'electronics',
    subcategory: null,
    pricePerDay: 100,
    pricePerMonth: 2000,
    deposit: 500,
    address: 'Test address',
    latitude: null,
    longitude: null,
    photos: ['photo1.jpg'],
    attributes: {},
    status: 'approved',
    rating: null,
    approvalMode: null,
    approvalThreshold: null,
    moderatedAt: null,
    moderatedBy: null,
    rejectionReason: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createRequest(itemId: string, body: Record<string, unknown>): any {
  const request = new Request(`http://localhost:3000/api/items/${itemId}`, {
    method: 'PATCH',
    headers: new Headers({
      'Content-Type': 'application/json',
      authorization: 'Bearer mock-token',
    }),
    body: JSON.stringify(body),
  });
  return request;
}

function createContext(itemId: string) {
  return { params: Promise.resolve({ id: itemId }) };
}

describe('PATCH /api/items/[id] — re-moderation', () => {
  it('should return 401 without auth', async () => {
    (extractTokenFromHeader as any).mockReturnValue(null);
    (verifyToken as any).mockResolvedValue(null);

    const response = await PATCH(
      createRequest('item-1', { title: 'New Title' }),
      createContext('item-1'),
    );
    expect(response.status).toBe(401);
  });

  it('should return 403 for non-owner', async () => {
    mockAuth('user-2');
    prismaMock.item.findUnique.mockResolvedValue(mockItem({ ownerId: 'user-1' }));

    const response = await PATCH(
      createRequest('item-1', { title: 'New Title' }),
      createContext('item-1'),
    );
    expect(response.status).toBe(403);
  });

  it('should set status to pending when title changes on approved item', async () => {
    mockAuth('user-1');
    prismaMock.item.findUnique.mockResolvedValue(mockItem({ status: 'approved' }));
    prismaMock.item.update.mockResolvedValue({} as any);

    const response = await PATCH(
      createRequest('item-1', { title: 'Updated Title' }),
      createContext('item-1'),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reModeration).toBe(true);
    expect(prismaMock.item.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: expect.objectContaining({
        title: 'Updated Title',
        status: 'pending',
      }),
    });
  });

  it('should set status to pending when description changes on approved item', async () => {
    mockAuth('user-1');
    prismaMock.item.findUnique.mockResolvedValue(mockItem({ status: 'approved' }));
    prismaMock.item.update.mockResolvedValue({} as any);

    const response = await PATCH(
      createRequest('item-1', { description: 'Updated description that is long enough' }),
      createContext('item-1'),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reModeration).toBe(true);
    expect(prismaMock.item.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: expect.objectContaining({
        description: 'Updated description that is long enough',
        status: 'pending',
      }),
    });
  });

  it('should set status to pending when photos change on approved item', async () => {
    mockAuth('user-1');
    prismaMock.item.findUnique.mockResolvedValue(mockItem({ status: 'approved' }));
    prismaMock.item.update.mockResolvedValue({} as any);

    const response = await PATCH(
      createRequest('item-1', { photos: ['new-photo.jpg'] }),
      createContext('item-1'),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reModeration).toBe(true);
    expect(prismaMock.item.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: expect.objectContaining({
        photos: ['new-photo.jpg'],
        status: 'pending',
      }),
    });
  });

  it('should NOT trigger re-moderation when only price changes', async () => {
    mockAuth('user-1');
    prismaMock.item.findUnique.mockResolvedValue(mockItem({ status: 'approved' }));
    prismaMock.item.update.mockResolvedValue({} as any);

    const response = await PATCH(
      createRequest('item-1', { price_per_day: 200 }),
      createContext('item-1'),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reModeration).toBe(false);
    expect(prismaMock.item.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: expect.not.objectContaining({ status: 'pending' }),
    });
  });

  it('should NOT trigger re-moderation when only address changes', async () => {
    mockAuth('user-1');
    prismaMock.item.findUnique.mockResolvedValue(mockItem({ status: 'approved' }));
    prismaMock.item.update.mockResolvedValue({} as any);

    const response = await PATCH(
      createRequest('item-1', { address: 'New address location' }),
      createContext('item-1'),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reModeration).toBe(false);
  });

  it('should NOT change status when editing title on draft item', async () => {
    mockAuth('user-1');
    prismaMock.item.findUnique.mockResolvedValue(mockItem({ status: 'draft' }));
    prismaMock.item.update.mockResolvedValue({} as any);

    const response = await PATCH(
      createRequest('item-1', { title: 'Updated Draft Title' }),
      createContext('item-1'),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reModeration).toBe(false);
    expect(prismaMock.item.update).toHaveBeenCalledWith({
      where: { id: 'item-1' },
      data: expect.not.objectContaining({ status: 'pending' }),
    });
  });

  it('should NOT change status when editing title on pending item', async () => {
    mockAuth('user-1');
    prismaMock.item.findUnique.mockResolvedValue(mockItem({ status: 'pending' }));
    prismaMock.item.update.mockResolvedValue({} as any);

    const response = await PATCH(
      createRequest('item-1', { title: 'Updated Pending Title' }),
      createContext('item-1'),
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.reModeration).toBe(false);
  });

  it('should return 404 for non-existent item', async () => {
    mockAuth('user-1');
    prismaMock.item.findUnique.mockResolvedValue(null);

    const response = await PATCH(
      createRequest('nonexistent', { title: 'Test' }),
      createContext('nonexistent'),
    );
    expect(response.status).toBe(404);
  });
});
