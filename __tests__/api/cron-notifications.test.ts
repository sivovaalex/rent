/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

// Mock notification helpers
const mockNotifyChatUnread = vi.fn().mockResolvedValue({});
const mockNotifyModerationPendingItem = vi.fn().mockResolvedValue({});
const mockNotifyModerationPendingUser = vi.fn().mockResolvedValue({});
const mockNotifyRentalReturnReminder = vi.fn().mockResolvedValue({});
const mockNotifyReviewReminder = vi.fn().mockResolvedValue({});

vi.mock('@/lib/notifications', () => ({
  notifyChatUnread: (...args: unknown[]) => mockNotifyChatUnread(...args),
  notifyModerationPendingItem: (...args: unknown[]) => mockNotifyModerationPendingItem(...args),
  notifyModerationPendingUser: (...args: unknown[]) => mockNotifyModerationPendingUser(...args),
  notifyRentalReturnReminder: (...args: unknown[]) => mockNotifyRentalReturnReminder(...args),
  notifyReviewReminder: (...args: unknown[]) => mockNotifyReviewReminder(...args),
}));

const mockAutoReject = vi.fn().mockResolvedValue(0);
vi.mock('@/lib/approval', () => ({
  autoRejectExpiredBookings: (...args: unknown[]) => mockAutoReject(...args),
}));

import { runNotificationCron } from '@/lib/cron/notifications';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

describe('runNotificationCron', () => {
  it('should run all tasks and return results', async () => {
    // Chat unread: no data
    prismaMock.notificationLog.findMany.mockResolvedValue([]);
    prismaMock.message.groupBy.mockResolvedValue([]);

    // Moderation: no admins
    prismaMock.user.findMany.mockResolvedValue([]);

    // Return reminders: no bookings
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await runNotificationCron();

    expect(result.chatUnread).toBe(0);
    expect(result.moderationReminders).toBe(0);
    expect(result.returnReminders).toBe(0);
    expect(result.reviewReminders).toBe(0);
    expect(result.autoRejected).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it('should capture errors per task without failing', async () => {
    // Make chat unread throw
    prismaMock.notificationLog.findMany.mockRejectedValue(new Error('DB error'));
    // Moderation: no admins
    prismaMock.user.findMany.mockResolvedValue([]);
    // Return/review: no bookings
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await runNotificationCron();

    expect(result.errors.length).toBeGreaterThanOrEqual(1);
    expect(result.errors[0]).toContain('chatUnread');
  });

  it('should process chat unread notifications', async () => {
    const thirtyMinAgo = new Date(Date.now() - 31 * 60 * 1000);

    // No existing logs to clean up
    prismaMock.notificationLog.findMany.mockResolvedValue([]);

    // Unread message group
    prismaMock.message.groupBy.mockResolvedValue([
      {
        bookingId: 'booking-1',
        senderId: 'renter-1',
        _count: { id: 3 },
      },
    ]);

    // Booking with item
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      item: { ownerId: 'owner-1', title: 'Камера Sony' },
    });

    // Claim slot succeeds
    prismaMock.notificationLog.create.mockResolvedValue({ id: 'log-1' });

    // Moderation: no admins
    prismaMock.user.findMany.mockResolvedValue([]);
    // Return/review: no bookings
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await runNotificationCron();

    expect(result.chatUnread).toBe(1);
    expect(mockNotifyChatUnread).toHaveBeenCalledWith('owner-1', {
      bookingId: 'booking-1',
      itemTitle: 'Камера Sony',
      unreadCount: 3,
    });
  });

  it('should clean up notification logs for read messages', async () => {
    // Existing chat log
    prismaMock.notificationLog.findMany.mockResolvedValue([
      {
        id: 'log-1',
        entityType: 'message_batch',
        entityId: 'owner-1:booking-1',
        eventType: 'chat_unread',
        recipientId: 'owner-1',
      },
    ]);

    // Messages have been read (0 unread)
    prismaMock.message.count.mockResolvedValue(0);
    prismaMock.notificationLog.delete.mockResolvedValue({});

    // No new unread groups
    prismaMock.message.groupBy.mockResolvedValue([]);

    // Other tasks: empty
    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    await runNotificationCron();

    expect(prismaMock.notificationLog.delete).toHaveBeenCalledWith({
      where: { id: 'log-1' },
    });
  });

  it('should send moderation reminders to all admins', async () => {
    // Chat unread: empty
    prismaMock.notificationLog.findMany.mockResolvedValue([]);
    prismaMock.message.groupBy.mockResolvedValue([]);

    // 2 admins
    prismaMock.user.findMany.mockResolvedValue([
      { id: 'admin-1' },
      { id: 'admin-2' },
    ]);

    // Pending item
    prismaMock.item.findMany.mockResolvedValue([
      { id: 'item-1', title: 'Pending Item' },
    ]);

    // No pending users
    // user.findMany is already used for admins, we need a second call for pending users
    // Since findMany is called twice, let's chain the mocks
    prismaMock.user.findMany
      .mockResolvedValueOnce([{ id: 'admin-1' }, { id: 'admin-2' }])
      .mockResolvedValueOnce([]); // no pending users

    // Claim slots succeed
    prismaMock.notificationLog.create.mockResolvedValue({ id: 'log-1' });

    // Bookings empty
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await runNotificationCron();

    expect(result.moderationReminders).toBe(2);
    expect(mockNotifyModerationPendingItem).toHaveBeenCalledTimes(2);
    expect(mockNotifyModerationPendingItem).toHaveBeenCalledWith('admin-1', {
      itemId: 'item-1',
      itemTitle: 'Pending Item',
    });
    expect(mockNotifyModerationPendingItem).toHaveBeenCalledWith('admin-2', {
      itemId: 'item-1',
      itemTitle: 'Pending Item',
    });
  });

  it('should process return reminders for active bookings ending tomorrow', async () => {
    // Chat unread: empty
    prismaMock.notificationLog.findMany.mockResolvedValue([]);
    prismaMock.message.groupBy.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);

    // First booking.findMany is for moderation (empty because no admins)
    // Second is for return reminders
    // Third is for review reminders
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(12, 0, 0, 0);

    prismaMock.booking.findMany
      .mockResolvedValueOnce([ // return reminders
        {
          id: 'booking-1',
          renterId: 'renter-1',
          item: { ownerId: 'owner-1', title: 'Дрель' },
          renter: { id: 'renter-1', name: 'Иван' },
        },
      ])
      .mockResolvedValueOnce([]); // review reminders

    // Claim slots succeed
    prismaMock.notificationLog.create.mockResolvedValue({ id: 'log-1' });

    const result = await runNotificationCron();

    expect(result.returnReminders).toBe(2); // renter + owner
    expect(mockNotifyRentalReturnReminder).toHaveBeenCalledTimes(2);
  });

  it('should send review reminders for completed bookings without reviews', async () => {
    // Chat unread: empty
    prismaMock.notificationLog.findMany.mockResolvedValue([]);
    prismaMock.message.groupBy.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);

    prismaMock.booking.findMany
      .mockResolvedValueOnce([]) // return reminders
      .mockResolvedValueOnce([ // review reminders
        {
          id: 'booking-1',
          renterId: 'renter-1',
          item: { ownerId: 'owner-1', title: 'Камера' },
          renter: { id: 'renter-1' },
          reviews: [], // no reviews at all
        },
      ]);

    prismaMock.notificationLog.create.mockResolvedValue({ id: 'log-1' });

    const result = await runNotificationCron();

    expect(result.reviewReminders).toBe(2); // both renter and owner
    expect(mockNotifyReviewReminder).toHaveBeenCalledTimes(2);
  });

  it('should skip review reminder when review already exists', async () => {
    prismaMock.notificationLog.findMany.mockResolvedValue([]);
    prismaMock.message.groupBy.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);

    prismaMock.booking.findMany
      .mockResolvedValueOnce([]) // return
      .mockResolvedValueOnce([ // review
        {
          id: 'booking-1',
          renterId: 'renter-1',
          item: { ownerId: 'owner-1', title: 'Камера' },
          renter: { id: 'renter-1' },
          reviews: [
            { type: 'renter_review', userId: 'renter-1' },
            { type: 'owner_review', userId: 'owner-1' },
          ],
        },
      ]);

    const result = await runNotificationCron();

    expect(result.reviewReminders).toBe(0);
    expect(mockNotifyReviewReminder).not.toHaveBeenCalled();
  });

  it('should deduplicate via claimNotificationSlot', async () => {
    prismaMock.notificationLog.findMany.mockResolvedValue([]);
    prismaMock.message.groupBy.mockResolvedValue([
      {
        bookingId: 'booking-1',
        senderId: 'renter-1',
        _count: { id: 2 },
      },
    ]);
    prismaMock.booking.findUnique.mockResolvedValue({
      id: 'booking-1',
      renterId: 'renter-1',
      item: { ownerId: 'owner-1', title: 'Test' },
    });

    // Claim slot fails (unique constraint violation - already sent)
    prismaMock.notificationLog.create.mockRejectedValue(
      new Error('Unique constraint failed')
    );

    prismaMock.user.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await runNotificationCron();

    expect(result.chatUnread).toBe(0);
    expect(mockNotifyChatUnread).not.toHaveBeenCalled();
  });
});
