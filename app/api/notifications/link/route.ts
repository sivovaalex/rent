export const dynamic = 'force-dynamic';
/**
 * Messenger link API
 * POST - Link a messenger account using a code
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyToken } from '@/lib/jwt';
import { z } from 'zod';

const linkSchema = z.object({
  code: z.string().length(6, 'Код должен содержать 6 цифр'),
  type: z.enum(['telegram', 'vk']),
});

/**
 * POST /api/notifications/link
 * Link a messenger account to the user
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
    const validation = linkSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { code, type } = validation.data;

    // Find the link code
    const linkCode = await prisma.messengerLinkCode.findFirst({
      where: {
        code,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
    });

    if (!linkCode) {
      return NextResponse.json(
        { error: 'Неверный или просроченный код' },
        { status: 400 }
      );
    }

    // Check if this chatId is already linked to another user
    const existingUser = await prisma.user.findFirst({
      where:
        type === 'telegram'
          ? { telegramChatId: linkCode.chatId }
          : { vkId: linkCode.chatId },
    });

    if (existingUser && existingUser.id !== payload.userId) {
      return NextResponse.json(
        { error: 'Этот аккаунт уже привязан к другому пользователю' },
        { status: 400 }
      );
    }

    // Update user with messenger ID and mark code as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: payload.userId },
        data:
          type === 'telegram'
            ? { telegramChatId: linkCode.chatId, notifyTelegram: true }
            : { vkId: linkCode.chatId, notifyVk: true },
      }),
      prisma.messengerLinkCode.update({
        where: { id: linkCode.id },
        data: { usedAt: new Date(), userId: payload.userId },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message:
        type === 'telegram'
          ? 'Telegram успешно подключён'
          : 'VK успешно подключён',
    });
  } catch (error) {
    console.error('[NOTIFICATIONS LINK] POST error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
