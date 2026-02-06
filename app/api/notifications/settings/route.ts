/**
 * Notification settings API
 * GET - Get current notification settings
 * PATCH - Update notification settings
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { z } from 'zod';

const updateSchema = z.object({
  notifyEmail: z.boolean().optional(),
  notifyVk: z.boolean().optional(),
  notifyTelegram: z.boolean().optional(),
  notifyPush: z.boolean().optional(),
  pushBookings: z.boolean().optional(),
  pushChat: z.boolean().optional(),
  pushModeration: z.boolean().optional(),
  pushReviews: z.boolean().optional(),
  pushReminders: z.boolean().optional(),
  notifyBookingRequests: z.boolean().optional(),
});

/**
 * GET /api/notifications/settings
 * Get user's notification settings
 */
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        email: true,
        notifyEmail: true,
        notifyVk: true,
        notifyTelegram: true,
        notifyPush: true,
        pushBookings: true,
        pushChat: true,
        pushModeration: true,
        pushReviews: true,
        pushReminders: true,
        notifyBookingRequests: true,
        vkId: true,
        telegramChatId: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      email: user.email,
      notifyEmail: user.notifyEmail,
      notifyVk: user.notifyVk,
      notifyTelegram: user.notifyTelegram,
      notifyPush: user.notifyPush,
      pushBookings: user.pushBookings,
      pushChat: user.pushChat,
      pushModeration: user.pushModeration,
      pushReviews: user.pushReviews,
      pushReminders: user.pushReminders,
      notifyBookingRequests: user.notifyBookingRequests,
      vkConnected: !!user.vkId,
      telegramConnected: !!user.telegramChatId,
    });
  } catch (error) {
    console.error('[NOTIFICATIONS SETTINGS] GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications/settings
 * Update user's notification settings
 */
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const validation = updateSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: validation.error.issues },
        { status: 400 }
      );
    }

    const { notifyEmail, notifyVk, notifyTelegram, notifyPush, pushBookings, pushChat, pushModeration, pushReviews, pushReminders, notifyBookingRequests } = validation.data;

    // Get current user to check messenger connections
    const currentUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        vkId: true,
        telegramChatId: true,
      },
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Validate that messengers are connected before enabling notifications
    if (notifyVk === true && !currentUser.vkId) {
      return NextResponse.json(
        { error: 'VK не подключён. Сначала привяжите аккаунт VK.' },
        { status: 400 }
      );
    }

    if (notifyTelegram === true && !currentUser.telegramChatId) {
      return NextResponse.json(
        { error: 'Telegram не подключён. Сначала привяжите аккаунт Telegram.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.update({
      where: { id: payload.userId },
      data: {
        ...(notifyEmail !== undefined && { notifyEmail }),
        ...(notifyVk !== undefined && { notifyVk }),
        ...(notifyTelegram !== undefined && { notifyTelegram }),
        ...(notifyPush !== undefined && { notifyPush }),
        ...(pushBookings !== undefined && { pushBookings }),
        ...(pushChat !== undefined && { pushChat }),
        ...(pushModeration !== undefined && { pushModeration }),
        ...(pushReviews !== undefined && { pushReviews }),
        ...(pushReminders !== undefined && { pushReminders }),
        ...(notifyBookingRequests !== undefined && { notifyBookingRequests }),
      },
      select: {
        email: true,
        notifyEmail: true,
        notifyVk: true,
        notifyTelegram: true,
        notifyPush: true,
        pushBookings: true,
        pushChat: true,
        pushModeration: true,
        pushReviews: true,
        pushReminders: true,
        notifyBookingRequests: true,
        vkId: true,
        telegramChatId: true,
      },
    });

    return NextResponse.json({
      email: user.email,
      notifyEmail: user.notifyEmail,
      notifyVk: user.notifyVk,
      notifyTelegram: user.notifyTelegram,
      notifyPush: user.notifyPush,
      pushBookings: user.pushBookings,
      pushChat: user.pushChat,
      pushModeration: user.pushModeration,
      pushReviews: user.pushReviews,
      pushReminders: user.pushReminders,
      notifyBookingRequests: user.notifyBookingRequests,
      vkConnected: !!user.vkId,
      telegramConnected: !!user.telegramChatId,
    });
  } catch (error) {
    console.error('[NOTIFICATIONS SETTINGS] PATCH error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
