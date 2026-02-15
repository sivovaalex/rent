/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

// Mock dependencies
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  notifyBookingCancelled: vi.fn().mockResolvedValue({}),
}));

import { POST } from '@/app/api/bookings/[id]/cancel/route';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';
import { notifyBookingCancelled } from '@/lib/notifications';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

function mockAuth(userId: string) {
  (extractTokenFromHeader as any).mockReturnValue('mock-token');
  (verifyToken as any).mockResolvedValue({ userId });
  prismaMock.user.findUnique.mockResolvedValue({
    id: userId,
    name: 'Test User',
    isBlocked: false,
    role: 'renter',
  });
}

function createRequest(body?: Record<string, unknown>): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    authorization: 'Bearer mock-token',
  };

  const init: RequestInit = { method: 'POST', headers: new Headers(headers) };
  if (body) {
    init.body = JSON.stringify(body);
  }

  return new Request('http://localhost:3000/api/bookings/booking-1/cancel', init);
}

function createContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/bookings/[id]/cancel', () => {
  it('should return 401 when not authenticated', async () => {
    (extractTokenFromHeader as any).mockReturnValue(null);
    (verifyToken as any).mockResolvedValue(null);

    const response = await POST(
      createRequest() as any,
      createContext('booking-1')
    );
    expect(response.status).toBe(401);
  });

  it('should return 404 when booking not found', async () => {
    mockAuth('renter-1');
    prismaMock.booking.findUnique.mockResolvedValue(null);

    const response = await POST(
      createRequest() as any,
      createContext('nonexistent')
    );
    expect(response.status).toBe(404);
  });

  it('should return 403 when user is not renter or owner', async () => {
    mockAuth('other-user');
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'pending_approval',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });

    const response = await POST(
      createRequest() as any,
      createContext('booking-1')
    );
    expect(response.status).toBe(403);
  });

  it('should return 400 when status is not pending_approval or pending_payment', async () => {
    mockAuth('renter-1');
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'active',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });

    const response = await POST(
      createRequest() as any,
      createContext('booking-1')
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('ожидания');
  });

  it('should allow renter to cancel pending_approval booking', async () => {
    mockAuth('renter-1');

    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'pending_approval',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });
    prismaMock.booking.update.mockResolvedValue({});

    const response = await POST(
      createRequest({ reason: 'Передумал' }) as any,
      createContext('booking-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: expect.objectContaining({
        status: 'cancelled',
        rejectionReason: 'Передумал',
      }),
    });
  });

  it('should allow owner to cancel pending_payment booking', async () => {
    mockAuth('owner-1');

    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'pending_payment',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });
    prismaMock.booking.update.mockResolvedValue({});

    const response = await POST(
      createRequest({ reason: 'Вещь недоступна' }) as any,
      createContext('booking-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: expect.objectContaining({
        status: 'cancelled',
        rejectionReason: 'Вещь недоступна',
      }),
    });
  });

  it('should use default reason when none provided (renter)', async () => {
    mockAuth('renter-1');

    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'pending_approval',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });
    prismaMock.booking.update.mockResolvedValue({});

    const response = await POST(
      createRequest() as any,
      createContext('booking-1')
    );

    expect(response.status).toBe(200);
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: expect.objectContaining({
        status: 'cancelled',
        rejectionReason: 'Отменено арендатором',
      }),
    });
  });

  it('should notify the owner when renter cancels', async () => {
    mockAuth('renter-1');

    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'pending_approval',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });
    prismaMock.booking.update.mockResolvedValue({});

    await POST(
      createRequest({ reason: 'Передумал' }) as any,
      createContext('booking-1')
    );

    expect(notifyBookingCancelled).toHaveBeenCalledWith('owner-1', {
      itemTitle: 'Camera',
      reason: 'Передумал',
    });
  });

  it('should notify the renter when owner cancels', async () => {
    mockAuth('owner-1');

    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'pending_payment',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });
    prismaMock.booking.update.mockResolvedValue({});

    await POST(
      createRequest({ reason: 'Вещь недоступна' }) as any,
      createContext('booking-1')
    );

    expect(notifyBookingCancelled).toHaveBeenCalledWith('renter-1', {
      itemTitle: 'Camera',
      reason: 'Вещь недоступна',
    });
  });
});
