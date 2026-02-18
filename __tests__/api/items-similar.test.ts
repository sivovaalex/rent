/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
  apiLogger: { info: vi.fn(), error: vi.fn() },
}));

import { GET } from '@/app/api/items/[id]/similar/route';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function createRequest(): Request {
  return new Request('http://localhost:3000/api/items/item-1/similar', {
    method: 'GET',
  });
}

function createContext(id = 'item-1') {
  return { params: Promise.resolve({ id }) };
}

const sourceItem = {
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
};

const similarItem = {
  ...sourceItem,
  id: 'item-2',
  title: 'Камера Canon',
  pricePerDay: 2500,
  owner: {
    id: 'user-2',
    name: 'Тест',
    rating: 4.5,
    phone: '+79001234567',
    trustBadges: [],
    trustScore: 0,
  },
};

describe('GET /api/items/[id]/similar', () => {
  it('returns similar items by category', async () => {
    prismaMock.item.findUnique.mockResolvedValue(sourceItem as any);
    prismaMock.item.findMany.mockResolvedValue([similarItem] as any);

    const res = await GET(createRequest() as any, createContext());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toHaveLength(1);
    expect(data.items[0]._id).toBe('item-2');
  });

  it('filters by same category and excludes current item', async () => {
    prismaMock.item.findUnique.mockResolvedValue(sourceItem as any);
    prismaMock.item.findMany.mockResolvedValue([similarItem] as any);

    await GET(createRequest() as any, createContext());

    const call = prismaMock.item.findMany.mock.calls[0][0];
    expect(call?.where?.category).toBe('electronics');
    expect(call?.where?.id).toEqual({ not: 'item-1' });
    expect(call?.where?.status).toBe('approved');
  });

  it('applies price range ±50%', async () => {
    prismaMock.item.findUnique.mockResolvedValue(sourceItem as any);
    prismaMock.item.findMany.mockResolvedValue([similarItem] as any);

    await GET(createRequest() as any, createContext());

    const call = prismaMock.item.findMany.mock.calls[0][0];
    expect(call?.where?.pricePerDay).toEqual({
      gte: 1500, // 3000 * 0.5
      lte: 4500, // 3000 * 1.5
    });
  });

  it('applies geo bounding box when coordinates available', async () => {
    prismaMock.item.findUnique.mockResolvedValue(sourceItem as any);
    prismaMock.item.findMany.mockResolvedValue([similarItem] as any);

    await GET(createRequest() as any, createContext());

    const call = prismaMock.item.findMany.mock.calls[0][0];
    expect(call?.where?.latitude).toBeDefined();
    expect(call?.where?.longitude).toBeDefined();
  });

  it('returns empty array when item not found', async () => {
    prismaMock.item.findUnique.mockResolvedValue(null);

    const res = await GET(createRequest() as any, createContext());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toEqual([]);
  });

  it('returns empty array when item not approved', async () => {
    prismaMock.item.findUnique.mockResolvedValue({ ...sourceItem, status: 'pending' } as any);

    const res = await GET(createRequest() as any, createContext());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toEqual([]);
  });

  it('relaxes price filter when too few results', async () => {
    prismaMock.item.findUnique.mockResolvedValue(sourceItem as any);
    // First call with strict filters returns < 3 items
    prismaMock.item.findMany
      .mockResolvedValueOnce([similarItem] as any) // 1 item (< 3)
      .mockResolvedValueOnce([similarItem, { ...similarItem, id: 'item-3' }] as any); // relaxed query

    await GET(createRequest() as any, createContext());

    // Second call should not have price filter
    expect(prismaMock.item.findMany).toHaveBeenCalledTimes(2);
    const secondCall = prismaMock.item.findMany.mock.calls[1][0];
    expect(secondCall?.where?.pricePerDay).toBeUndefined();
  });

  it('returns 500 on database error', async () => {
    prismaMock.item.findUnique.mockRejectedValue(new Error('DB error'));

    const res = await GET(createRequest() as any, createContext());

    expect(res.status).toBe(500);
  });
});
