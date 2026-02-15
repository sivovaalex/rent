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
  address: 'Москва, ул. Тверская, д. 1',
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
  },
};

const mockItemSpb = {
  ...mockItem,
  id: 'item-2',
  address: 'Санкт-Петербург, Невский пр., д. 1',
  latitude: 59.9343,
  longitude: 30.3351,
};

describe('GET /api/items — city filter', () => {
  test('city=Москва — фильтрует по address contains Москва', async () => {
    prismaMock.item.findMany.mockResolvedValue([mockItem]);

    const res = await GET(createRequest({ city: 'Москва' }) as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0].address).toContain('Москва');

    // Check that prisma was called with address filter
    expect(prismaMock.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          address: { contains: 'Москва', mode: 'insensitive' },
        }),
      })
    );
  });

  test('без city — возвращает все лоты', async () => {
    prismaMock.item.findMany.mockResolvedValue([mockItem, mockItemSpb]);

    const res = await GET(createRequest() as any);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(2);

    // Check that prisma was NOT called with address filter
    const callArgs = prismaMock.item.findMany.mock.calls[0][0];
    expect(callArgs.where.address).toBeUndefined();
  });

  test('city + search — оба фильтра работают', async () => {
    prismaMock.item.findMany.mockResolvedValue([mockItem]);

    const res = await GET(createRequest({ city: 'Москва', search: 'камера' }) as any);
    const data = await res.json();

    expect(res.status).toBe(200);

    const callArgs = prismaMock.item.findMany.mock.calls[0][0];
    expect(callArgs.where.address).toEqual({ contains: 'Москва', mode: 'insensitive' });
    expect(callArgs.where.OR).toEqual([
      { title: { contains: 'камера', mode: 'insensitive' } },
      { description: { contains: 'камера', mode: 'insensitive' } },
    ]);
  });
});
