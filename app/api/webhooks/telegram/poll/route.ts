/**
 * Telegram Bot Polling (for manual testing)
 * Manually poll for updates when webhook is not available
 */

import { NextResponse } from 'next/server';
import { isPollingActive } from '@/lib/notifications/polling';

/**
 * GET /api/webhooks/telegram/poll
 * Check polling status
 */
export async function GET() {
  const isActive = isPollingActive();

  return NextResponse.json({
    ok: true,
    polling: isActive,
    mode: process.env.NODE_ENV === 'development' ? 'auto-polling' : 'webhook',
    message: isActive
      ? 'Polling активен - бот автоматически обрабатывает сообщения'
      : 'Polling не активен',
  });
}
