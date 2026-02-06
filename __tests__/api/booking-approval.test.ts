/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

// Mock dependencies
vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  notifyBookingApproved: vi.fn().mockResolvedValue({}),
  notifyBookingRejected: vi.fn().mockResolvedValue({}),
}));

vi.mock('crypto', () => ({
  default: { randomUUID: () => 'mock-uuid-1234' },
  randomUUID: () => 'mock-uuid-1234',
}));

import { POST as approveBooking } from '@/app/api/bookings/[id]/approve/route';
import { POST as rejectBooking } from '@/app/api/bookings/[id]/reject/route';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';
import { notifyBookingApproved, notifyBookingRejected } from '@/lib/notifications';

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
    isBlocked: false,
    role: 'owner',
  });
}

function createRequest(
  method: string,
  body?: Record<string, unknown>
): Request {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    authorization: 'Bearer mock-token',
  };

  const init: RequestInit = { method, headers: new Headers(headers) };
  if (body) {
    init.body = JSON.stringify(body);
  }

  return new Request('http://localhost:3000/api/bookings/booking-1/approve', init);
}

function createContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/bookings/[id]/approve', () => {
  it('should return 401 without auth', async () => {
    (extractTokenFromHeader as any).mockReturnValue(null);
    (verifyToken as any).mockResolvedValue(null);

    const response = await approveBooking(
      createRequest('POST') as any,
      createContext('booking-1')
    );
    expect(response.status).toBe(401);
  });

  it('should return 404 if booking not found', async () => {
    mockAuth('owner-1');
    prismaMock.booking.findUnique.mockResolvedValue(null);

    const response = await approveBooking(
      createRequest('POST') as any,
      createContext('nonexistent')
    );
    expect(response.status).toBe(404);
  });

  it('should return 403 if user is not the item owner', async () => {
    mockAuth('other-user');
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'pending_approval',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });

    const response = await approveBooking(
      createRequest('POST') as any,
      createContext('booking-1')
    );
    expect(response.status).toBe(403);
  });

  it('should return 400 if booking is not pending_approval', async () => {
    mockAuth('owner-1');
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'active',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });

    const response = await approveBooking(
      createRequest('POST') as any,
      createContext('booking-1')
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('не ожидает одобрения');
  });

  it('should approve booking and notify renter', async () => {
    mockAuth('owner-1');

    const booking = {
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'pending_approval',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-08'),
      item: { ownerId: 'owner-1', title: 'Camera' },
    };
    prismaMock.booking.findUnique.mockResolvedValue(booking);

    const updatedBooking = {
      ...booking,
      status: 'paid',
      depositStatus: 'held',
      paidAt: new Date(),
      approvedAt: new Date(),
      item: {
        ...booking.item,
        id: 'item-1',
        owner: { id: 'owner-1', name: 'Owner', phone: '+79001234567' },
      },
      renter: { id: 'renter-1', name: 'Renter', phone: '+79009876543', email: 'r@test.com' },
      reviews: [],
    };
    prismaMock.booking.update.mockResolvedValue(updatedBooking);

    const response = await approveBooking(
      createRequest('POST') as any,
      createContext('booking-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'booking-1' },
        data: expect.objectContaining({
          status: 'paid',
          depositStatus: 'held',
        }),
      })
    );
    expect(notifyBookingApproved).toHaveBeenCalledWith('renter-1', expect.any(Object));
  });
});

describe('POST /api/bookings/[id]/reject', () => {
  it('should return 404 if booking not found', async () => {
    mockAuth('owner-1');
    prismaMock.booking.findUnique.mockResolvedValue(null);

    const response = await rejectBooking(
      createRequest('POST', { reason: 'No reason' }) as any,
      createContext('nonexistent')
    );
    expect(response.status).toBe(404);
  });

  it('should return 403 if user is not the item owner', async () => {
    mockAuth('other-user');
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'pending_approval',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });

    const response = await rejectBooking(
      createRequest('POST', { reason: 'No reason' }) as any,
      createContext('booking-1')
    );
    expect(response.status).toBe(403);
  });

  it('should return 400 if booking is not pending_approval', async () => {
    mockAuth('owner-1');
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      status: 'active',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });

    const response = await rejectBooking(
      createRequest('POST', { reason: 'No reason' }) as any,
      createContext('booking-1')
    );
    expect(response.status).toBe(400);
  });

  it('should reject booking and notify renter', async () => {
    mockAuth('owner-1');

    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      status: 'pending_approval',
      item: { ownerId: 'owner-1', title: 'Camera' },
    });
    prismaMock.booking.update.mockResolvedValue({});

    const response = await rejectBooking(
      createRequest('POST', { reason: 'Недоступно в эти даты' }) as any,
      createContext('booking-1')
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: expect.objectContaining({
        status: 'cancelled',
        rejectionReason: 'Недоступно в эти даты',
      }),
    });
    expect(notifyBookingRejected).toHaveBeenCalledWith('renter-1', {
      itemTitle: 'Camera',
      reason: 'Недоступно в эти даты',
    });
  });
});
