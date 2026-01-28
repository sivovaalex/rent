/**
 * Telegram Bot Webhook Setup
 * Configure and manage Telegram webhook
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  setTelegramWebhook,
  deleteTelegramWebhook,
  getTelegramWebhookInfo,
} from '@/lib/notifications/telegram';
import { requireAdmin } from '@/lib/api-utils';

/**
 * GET /api/webhooks/telegram/setup
 * Get current webhook status
 */
export async function GET(request: NextRequest) {
  // Only admins can view webhook status
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  const info = await getTelegramWebhookInfo();

  return NextResponse.json({
    ok: true,
    webhook: info,
  });
}

/**
 * POST /api/webhooks/telegram/setup
 * Set or delete webhook
 */
export async function POST(request: NextRequest) {
  // Only admins can configure webhook
  const auth = await requireAdmin(request);
  if ('error' in auth) {
    return auth.error;
  }

  try {
    const body = await request.json();
    const { action, webhookUrl } = body;

    if (action === 'set') {
      if (!webhookUrl) {
        return NextResponse.json(
          { error: 'webhookUrl is required' },
          { status: 400 }
        );
      }

      const result = await setTelegramWebhook(webhookUrl);
      return NextResponse.json(result);
    }

    if (action === 'delete') {
      const result = await deleteTelegramWebhook();
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { error: 'Invalid action. Use "set" or "delete"' },
      { status: 400 }
    );
  } catch (error) {
    console.error('[TELEGRAM SETUP] Error:', error);
    return NextResponse.json(
      { error: 'Failed to configure webhook' },
      { status: 500 }
    );
  }
}
