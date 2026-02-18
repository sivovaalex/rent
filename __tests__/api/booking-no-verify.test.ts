/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

vi.mock('@/lib/jwt', () => ({
  verifyToken: vi.fn(),
  extractTokenFromHeader: vi.fn(),
}));

vi.mock('@/lib/notifications', () => ({
  notifyNewBooking: vi.fn().mockResolvedValue({}),
  notifyBookingApprovalRequest: vi.fn().mockResolvedValue({}),
}));

vi.mock('@/lib/yookassa', () => ({
  createPayment: vi.fn(),
  isYooKassaConfigured: vi.fn().mockReturnValue(false),
}));

vi.mock('@/lib/approval', () => ({
  getApprovalDecision: vi.fn().mockResolvedValue({
    shouldAutoApprove: true,
    approvalMode: 'auto_approve',
  }),
}));

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
  logBooking: vi.fn(),
}));

vi.mock('@/lib/fraud-detection', () => ({
  detectSuspiciousActivity: vi.fn().mockResolvedValue({ isSuspicious: false, reasons: [] }),
}));

vi.mock('@/lib/payment-log', () => ({
  logPayment: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('crypto', () => ({
  default: { randomUUID: () => 'mock-uuid' },
  randomUUID: () => 'mock-uuid',
}));

import { POST } from '@/app/api/items/[id]/book/route';
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
    name: 'Test Renter',
    phone: '+79001234567',
    email: null,
    role: 'renter',
    rating: 5.0,
    isVerified: false,
    verificationStatus: 'not_verified',
    isBlocked: false,
    ...overrides,
  });
}

function createBookingRequest(): Request {
  return new Request('http://localhost:3000/api/items/item-1/book', {
    method: 'POST',
    headers: new Headers({
      'Content-Type': 'application/json',
      authorization: 'Bearer mock-token',
    }),
    body: JSON.stringify({
      start_date: '2026-03-01',
      end_date: '2026-03-07',
      rental_type: 'day',
      is_insured: false,
    }),
  });
}

function createContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe('POST /api/items/[id]/book - no verification required', () => {
  it('should allow non-verified user to create a booking', async () => {
    mockAuth('renter-1', { isVerified: false, verificationStatus: 'not_verified' });

    prismaMock.item.findUnique.mockResolvedValue({
      id: 'item-1',
      ownerId: 'owner-1',
      status: 'approved',
      pricePerDay: 1000,
      pricePerMonth: 20000,
      deposit: 5000,
      title: 'Test Item',
      photos: [],
      owner: { isBlocked: false },
    });

    prismaMock.booking.findMany.mockResolvedValue([]);

    prismaMock.booking.create.mockResolvedValue({
      id: 'booking-1',
      itemId: 'item-1',
      renterId: 'renter-1',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-07'),
      rentalType: 'day',
      rentalPrice: 6000,
      deposit: 5000,
      commission: 900,
      insurance: 0,
      totalPrice: 11900,
      prepayment: 1800,
      isInsured: false,
      status: 'paid',
      depositStatus: 'held',
      paymentId: 'MOCK_mock-uuid',
      approvedAt: new Date(),
      paidAt: new Date(),
      createdAt: new Date(),
      item: {
        id: 'item-1',
        title: 'Test Item',
        photos: [],
        ownerId: 'owner-1',
      },
      renter: {
        id: 'renter-1',
        name: 'Test Renter',
        phone: '+79001234567',
      },
    });

    const response = await POST(
      createBookingRequest() as any,
      createContext('item-1')
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
  });

  it('should still require authentication', async () => {
    (extractTokenFromHeader as any).mockReturnValue(null);
    (verifyToken as any).mockResolvedValue(null);

    const response = await POST(
      createBookingRequest() as any,
      createContext('item-1')
    );

    expect(response.status).toBe(401);
  });
});
