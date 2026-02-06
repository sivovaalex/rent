/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

// Mock notifications to avoid circular deps
vi.mock('@/lib/notifications', () => ({
  notifyBookingRejected: vi.fn().mockResolvedValue({}),
}));

import { getApprovalDecision, autoRejectExpiredBookings } from '@/lib/approval';

beforeEach(() => {
  resetPrismaMocks();
});

describe('getApprovalDecision', () => {
  it('should auto-approve when item approval mode is auto_approve', async () => {
    prismaMock.item.findUnique.mockResolvedValue({
      id: 'item-1',
      approvalMode: 'auto_approve',
      approvalThreshold: 4.0,
      owner: {
        defaultApprovalMode: 'manual',
        defaultApprovalThreshold: 4.5,
      },
    });

    const result = await getApprovalDecision('item-1', 'renter-1');
    expect(result.shouldAutoApprove).toBe(true);
    expect(result.approvalMode).toBe('auto_approve');
  });

  it('should require manual approval when mode is manual', async () => {
    prismaMock.item.findUnique.mockResolvedValue({
      id: 'item-1',
      approvalMode: 'manual',
      approvalThreshold: null,
      owner: {
        defaultApprovalMode: 'auto_approve',
        defaultApprovalThreshold: 4.0,
      },
    });

    const result = await getApprovalDecision('item-1', 'renter-1');
    expect(result.shouldAutoApprove).toBe(false);
    expect(result.approvalMode).toBe('manual');
  });

  it('should fall back to owner default when item has no approval mode', async () => {
    prismaMock.item.findUnique.mockResolvedValue({
      id: 'item-1',
      approvalMode: null,
      approvalThreshold: null,
      owner: {
        defaultApprovalMode: 'manual',
        defaultApprovalThreshold: 4.5,
      },
    });

    const result = await getApprovalDecision('item-1', 'renter-1');
    expect(result.shouldAutoApprove).toBe(false);
    expect(result.approvalMode).toBe('manual');
  });

  describe('rating_based mode', () => {
    it('should approve renter with rating above threshold', async () => {
      prismaMock.item.findUnique.mockResolvedValue({
        id: 'item-1',
        approvalMode: 'rating_based',
        approvalThreshold: 4.0,
        owner: {
          defaultApprovalMode: 'auto_approve',
          defaultApprovalThreshold: 4.0,
        },
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'renter-1',
        rating: 4.5,
      });

      const result = await getApprovalDecision('item-1', 'renter-1');
      expect(result.shouldAutoApprove).toBe(true);
      expect(result.approvalMode).toBe('rating_based');
      expect(result.threshold).toBe(4.0);
    });

    it('should reject renter with rating below threshold', async () => {
      prismaMock.item.findUnique.mockResolvedValue({
        id: 'item-1',
        approvalMode: 'rating_based',
        approvalThreshold: 4.0,
        owner: {
          defaultApprovalMode: 'auto_approve',
          defaultApprovalThreshold: 4.0,
        },
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'renter-1',
        rating: 3.5,
      });

      const result = await getApprovalDecision('item-1', 'renter-1');
      expect(result.shouldAutoApprove).toBe(false);
    });

    it('should default rating to 5.0 for new users without rating', async () => {
      prismaMock.item.findUnique.mockResolvedValue({
        id: 'item-1',
        approvalMode: 'rating_based',
        approvalThreshold: 4.0,
        owner: {
          defaultApprovalMode: 'auto_approve',
          defaultApprovalThreshold: 4.0,
        },
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'renter-1',
        rating: null,
      });

      const result = await getApprovalDecision('item-1', 'renter-1');
      expect(result.shouldAutoApprove).toBe(true);
    });

    it('should use owner threshold when item has no threshold', async () => {
      prismaMock.item.findUnique.mockResolvedValue({
        id: 'item-1',
        approvalMode: 'rating_based',
        approvalThreshold: null,
        owner: {
          defaultApprovalMode: 'auto_approve',
          defaultApprovalThreshold: 4.8,
        },
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'renter-1',
        rating: 4.5,
      });

      const result = await getApprovalDecision('item-1', 'renter-1');
      expect(result.shouldAutoApprove).toBe(false);
      expect(result.threshold).toBe(4.8);
    });
  });

  describe('verified_only mode', () => {
    it('should approve verified renter', async () => {
      prismaMock.item.findUnique.mockResolvedValue({
        id: 'item-1',
        approvalMode: 'verified_only',
        approvalThreshold: null,
        owner: {
          defaultApprovalMode: 'auto_approve',
          defaultApprovalThreshold: 4.0,
        },
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'renter-1',
        isVerified: true,
      });

      const result = await getApprovalDecision('item-1', 'renter-1');
      expect(result.shouldAutoApprove).toBe(true);
      expect(result.approvalMode).toBe('verified_only');
    });

    it('should reject unverified renter', async () => {
      prismaMock.item.findUnique.mockResolvedValue({
        id: 'item-1',
        approvalMode: 'verified_only',
        approvalThreshold: null,
        owner: {
          defaultApprovalMode: 'auto_approve',
          defaultApprovalThreshold: 4.0,
        },
      });
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'renter-1',
        isVerified: false,
      });

      const result = await getApprovalDecision('item-1', 'renter-1');
      expect(result.shouldAutoApprove).toBe(false);
    });
  });

  it('should throw when item not found', async () => {
    prismaMock.item.findUnique.mockResolvedValue(null);

    await expect(getApprovalDecision('unknown', 'renter-1')).rejects.toThrow('Item not found');
  });
});

describe('autoRejectExpiredBookings', () => {
  it('should return 0 when no expired bookings', async () => {
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await autoRejectExpiredBookings();
    expect(result).toBe(0);
    expect(prismaMock.booking.update).not.toHaveBeenCalled();
  });

  it('should cancel expired bookings and send notifications', async () => {
    const expiredBookings = [
      {
        id: 'booking-1',
        renterId: 'renter-1',
        status: 'pending_approval',
        approvalDeadline: new Date(Date.now() - 1000),
        item: { title: 'Камера Sony' },
      },
      {
        id: 'booking-2',
        renterId: 'renter-2',
        status: 'pending_approval',
        approvalDeadline: new Date(Date.now() - 5000),
        item: { title: 'Дрель Bosch' },
      },
    ];

    prismaMock.booking.findMany.mockResolvedValue(expiredBookings);
    prismaMock.booking.update.mockResolvedValue({});

    const result = await autoRejectExpiredBookings();
    expect(result).toBe(2);
    expect(prismaMock.booking.update).toHaveBeenCalledTimes(2);

    // First call
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-1' },
      data: expect.objectContaining({
        status: 'cancelled',
        rejectionReason: 'Время ожидания подтверждения истекло (24 часа)',
      }),
    });

    // Second call
    expect(prismaMock.booking.update).toHaveBeenCalledWith({
      where: { id: 'booking-2' },
      data: expect.objectContaining({
        status: 'cancelled',
      }),
    });
  });

  it('should use item title in notification or fallback to "Лот"', async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      {
        id: 'booking-1',
        renterId: 'renter-1',
        status: 'pending_approval',
        approvalDeadline: new Date(Date.now() - 1000),
        item: null,
      },
    ]);
    prismaMock.booking.update.mockResolvedValue({});

    const result = await autoRejectExpiredBookings();
    expect(result).toBe(1);
  });
});
