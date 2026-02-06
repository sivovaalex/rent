/// <reference types="vitest/globals" />
import { prismaMock, resetPrismaMocks } from '../mocks/prisma';

// Mock external services
vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/notifications/telegram', () => ({
  sendTelegramMessage: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/notifications/vk', () => ({
  sendVkMessage: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/notifications/push', () => ({
  sendPushNotification: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/lib/notifications/templates', () => ({
  getMessengerText: vi.fn().mockReturnValue('Test message'),
  getEmailSubject: vi.fn().mockReturnValue('Test subject'),
  getEmailHtml: vi.fn().mockReturnValue('<p>Test</p>'),
}));

import { sendNotification } from '@/lib/notifications/index';
import { sendEmail } from '@/lib/email';
import { sendTelegramMessage } from '@/lib/notifications/telegram';
import { sendVkMessage } from '@/lib/notifications/vk';
import { sendPushNotification } from '@/lib/notifications/push';

beforeEach(() => {
  resetPrismaMocks();
  vi.clearAllMocks();
});

describe('sendNotification', () => {
  const baseUser = {
    email: 'test@example.com',
    notifyEmail: true,
    notifyTelegram: true,
    notifyVk: true,
    telegramChatId: '12345',
    vkId: '67890',
    notifyBookingRequests: true,
  };

  it('should send via all enabled channels', async () => {
    prismaMock.user.findUnique.mockResolvedValue(baseUser);

    const result = await sendNotification('user-1', {
      type: 'booking_confirmed',
      data: { itemTitle: 'Test' },
    });

    expect(result.email).toBe(true);
    expect(result.telegram).toBe(true);
    expect(result.vk).toBe(true);
    expect(result.push).toBe(true);
    expect(sendEmail).toHaveBeenCalledOnce();
    expect(sendTelegramMessage).toHaveBeenCalledWith('12345', 'Test message');
    expect(sendVkMessage).toHaveBeenCalledWith('67890', 'Test message');
    expect(sendPushNotification).toHaveBeenCalledOnce();
  });

  it('should skip email when disabled', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...baseUser,
      notifyEmail: false,
    });

    const result = await sendNotification('user-1', {
      type: 'booking_confirmed',
      data: {},
    });

    expect(result.email).toBe(false);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('should skip telegram when not connected', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...baseUser,
      telegramChatId: null,
    });

    const result = await sendNotification('user-1', {
      type: 'booking_confirmed',
      data: {},
    });

    expect(result.telegram).toBe(false);
    expect(sendTelegramMessage).not.toHaveBeenCalled();
  });

  it('should skip VK when not connected', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...baseUser,
      vkId: null,
    });

    const result = await sendNotification('user-1', {
      type: 'booking_confirmed',
      data: {},
    });

    expect(result.vk).toBe(false);
    expect(sendVkMessage).not.toHaveBeenCalled();
  });

  it('should return empty result when user not found', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    const result = await sendNotification('nonexistent', {
      type: 'booking_confirmed',
      data: {},
    });

    expect(result).toEqual({ email: false, telegram: false, vk: false, push: false });
  });

  describe('booking request notification guard', () => {
    it('should skip booking_new when notifyBookingRequests is false', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...baseUser,
        notifyBookingRequests: false,
      });

      const result = await sendNotification('user-1', {
        type: 'booking_new',
        data: {},
      });

      expect(result).toEqual({ email: false, telegram: false, vk: false, push: false });
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it('should skip booking_approval_request when notifyBookingRequests is false', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...baseUser,
        notifyBookingRequests: false,
      });

      const result = await sendNotification('user-1', {
        type: 'booking_approval_request',
        data: {},
      });

      expect(result).toEqual({ email: false, telegram: false, vk: false, push: false });
    });

    it('should still send booking_confirmed even when notifyBookingRequests is false', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        ...baseUser,
        notifyBookingRequests: false,
      });

      const result = await sendNotification('user-1', {
        type: 'booking_confirmed',
        data: {},
      });

      expect(result.email).toBe(true);
    });
  });
});
