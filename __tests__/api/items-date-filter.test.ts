/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
  apiLogger: { info: vi.fn(), error: vi.fn() },
}));

import { GET } from '@/app/api/items/route';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function createRequest(params: Record<string, string> = {}): Request {
  const url = new URL('http://localhost:3000/api/items');
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return new Request(url.toString(), { method: 'GET' });
}

const mockItem = {
  id: 'item-1',
  ownerId: 'user-1',
  category: 'electronics',
  subcategory: null,
  title: 'Камера Sony',
  description: 'Профессиональная камера',
  pricePerDay: 3000,
  pricePerMonth: 50000,
  deposit: 10000,
  address: 'Москва',
  latitude: 55.7558,
  longitude: 37.6173,
  photos: [],
  attributes: {},
  status: 'approved',
  rating: 5.0,
  reviewCount: 1,
  approvalMode: null,
  approvalThreshold: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  owner: {
    id: 'user-1',
    name: 'Тест',
    rating: 5.0,
    phone: '+79001234567',
    trustBadges: [],
    trustScore: 0,
    ownerType: null,
    ownerCompanyName: null,
    ownerInn: null,
  },
  reviews: [],
};

describe('GET /api/items — date availability filter', () => {
  it('adds bookings.none filter when both availableFrom and availableTo are provided', async () => {
    prismaMock.item.findMany.mockResolvedValue([mockItem] as any);
    prismaMock.item.count.mockResolvedValue(1);

    await GET(createRequest({ availableFrom: '2026-03-01', availableTo: '2026-03-10' }) as any);

    const call = prismaMock.item.findMany.mock.calls[0][0];
    expect(call?.where?.bookings).toEqual({
      none: {
        status: { in: ['pending_approval', 'pending_payment', 'paid', 'active'] },
        startDate: { lte: new Date('2026-03-10') },
        endDate: { gte: new Date('2026-03-01') },
      },
    });
  });

  it('does not add bookings filter when no date params', async () => {
    prismaMock.item.findMany.mockResolvedValue([mockItem] as any);
    prismaMock.item.count.mockResolvedValue(1);

    await GET(createRequest({}) as any);

    const call = prismaMock.item.findMany.mock.calls[0][0];
    expect(call?.where?.bookings).toBeUndefined();
  });

  it('does not add bookings filter when only availableFrom is provided', async () => {
    prismaMock.item.findMany.mockResolvedValue([mockItem] as any);
    prismaMock.item.count.mockResolvedValue(1);

    await GET(createRequest({ availableFrom: '2026-03-01' }) as any);

    const call = prismaMock.item.findMany.mock.calls[0][0];
    expect(call?.where?.bookings).toBeUndefined();
  });

  it('does not add bookings filter when only availableTo is provided', async () => {
    prismaMock.item.findMany.mockResolvedValue([mockItem] as any);
    prismaMock.item.count.mockResolvedValue(1);

    await GET(createRequest({ availableTo: '2026-03-10' }) as any);

    const call = prismaMock.item.findMany.mock.calls[0][0];
    expect(call?.where?.bookings).toBeUndefined();
  });

  it('returns items when date filter is applied', async () => {
    prismaMock.item.findMany.mockResolvedValue([mockItem] as any);
    prismaMock.item.count.mockResolvedValue(1);

    const res = await GET(createRequest({ availableFrom: '2026-03-01', availableTo: '2026-03-10' }) as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);
  });
});
