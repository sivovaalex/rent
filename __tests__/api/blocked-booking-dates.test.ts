/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
  apiLogger: { info: vi.fn(), error: vi.fn() },
}));

import { GET } from '@/app/api/items/[id]/blocked-booking-dates/route';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function createRequest(): Request {
  return new Request('http://localhost:3000/api/items/item-1/blocked-booking-dates', {
    method: 'GET',
  });
}

function createContext(id = 'item-1') {
  return { params: Promise.resolve({ id }) };
}

describe('GET /api/items/[id]/blocked-booking-dates', () => {
  it('returns empty dates when no bookings exist', async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);

    const res = await GET(createRequest() as any, createContext());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dates).toEqual([]);
  });

  it('returns dates for a single booking', async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      {
        id: 'b1',
        itemId: 'item-1',
        startDate: new Date('2026-03-10'),
        endDate: new Date('2026-03-12'),
        status: 'paid',
      },
    ] as any);

    const res = await GET(createRequest() as any, createContext());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.dates).toContain('2026-03-10');
    expect(data.dates).toContain('2026-03-11');
    expect(data.dates).toContain('2026-03-12');
    expect(data.dates).toHaveLength(3);
  });

  it('deduplicates overlapping booking dates', async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      {
        id: 'b1',
        itemId: 'item-1',
        startDate: new Date('2026-03-10'),
        endDate: new Date('2026-03-12'),
        status: 'paid',
      },
      {
        id: 'b2',
        itemId: 'item-1',
        startDate: new Date('2026-03-11'),
        endDate: new Date('2026-03-13'),
        status: 'active',
      },
    ] as any);

    const res = await GET(createRequest() as any, createContext());
    const data = await res.json();

    expect(res.status).toBe(200);
    // 10, 11, 12 from b1 + 11, 12, 13 from b2 = unique: 10, 11, 12, 13
    expect(data.dates).toHaveLength(4);
    expect(data.dates).toContain('2026-03-10');
    expect(data.dates).toContain('2026-03-11');
    expect(data.dates).toContain('2026-03-12');
    expect(data.dates).toContain('2026-03-13');
  });

  it('queries only relevant booking statuses', async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);

    await GET(createRequest() as any, createContext('item-42'));

    const call = prismaMock.booking.findMany.mock.calls[0][0];
    expect(call?.where?.itemId).toBe('item-42');
    expect(call?.where?.status).toEqual({
      in: ['pending_approval', 'pending_payment', 'paid', 'active'],
    });
  });

  it('returns 500 on database error', async () => {
    prismaMock.booking.findMany.mockRejectedValue(new Error('DB error'));

    const res = await GET(createRequest() as any, createContext());

    expect(res.status).toBe(500);
  });
});
