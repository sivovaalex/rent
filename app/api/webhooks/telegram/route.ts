export const dynamic = 'force-dynamic';
/**
 * Telegram Bot Webhook
 * Receives messages from Telegram and generates link codes
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  handleTelegramMessage,
  TelegramUpdate,
} from '@/lib/notifications/telegram';

const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

/**
 * POST /api/webhooks/telegram
 * Receive Telegram bot updates
 */
export async function POST(request: NextRequest) {
  try {
    // Verify webhook secret if configured
    if (TELEGRAM_WEBHOOK_SECRET) {
      const secretHeader = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
      if (secretHeader !== TELEGRAM_WEBHOOK_SECRET) {
        console.warn('[TELEGRAM WEBHOOK] Invalid secret token');
        return NextResponse.json({ ok: false }, { status: 401 });
      }
    }

    const update: TelegramUpdate = await request.json();

    // Process the message
    const result = await handleTelegramMessage(update);

    if (result) {
      // Save the link code to database
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10); // 10 minutes expiry

      // Delete any existing unused codes for this chat
      await prisma.messengerLinkCode.deleteMany({
        where: {
          chatId: result.chatId,
          type: 'telegram',
          usedAt: null,
        },
      });

      // Create new link code
      await prisma.messengerLinkCode.create({
        data: {
          code: result.code,
          type: 'telegram',
          chatId: result.chatId,
          expiresAt,
        },
      });

      console.log(
        `[TELEGRAM WEBHOOK] Created link code ${result.code} for chat ${result.chatId}`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[TELEGRAM WEBHOOK] Error:', error);
    // Always return 200 to Telegram to prevent retries
    return NextResponse.json({ ok: true });
  }
}

/**
 * GET /api/webhooks/telegram
 * Health check for webhook
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'telegram-webhook',
  });
}
