/**
 * Messenger unlink API
 * POST - Unlink a messenger account
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { z } from 'zod';

const unlinkSchema = z.object({
  type: z.enum(['telegram', 'vk']),
});

/**
 * POST /api/notifications/unlink
 * Unlink a messenger account from the user
 */
export async function POST(request: NextRequest) {
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
    const validation = unlinkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { type } = validation.data;

    // Update user to remove messenger ID and disable notifications
    await prisma.user.update({
      where: { id: payload.userId },
      data:
        type === 'telegram'
          ? { telegramChatId: null, notifyTelegram: false }
          : { vkId: null, notifyVk: false },
    });

    return NextResponse.json({
      success: true,
      message:
        type === 'telegram' ? 'Telegram отключён' : 'VK отключён',
    });
  } catch (error) {
    console.error('[NOTIFICATIONS UNLINK] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
