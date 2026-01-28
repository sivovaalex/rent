/**
 * Telegram Bot Polling Service
 * Auto-polling for local development
 */

import {
  getTelegramUpdates,
  handleTelegramMessage,
  deleteTelegramWebhook,
  TelegramUpdate,
} from './telegram';

let isPolling = false;
let pollInterval: NodeJS.Timeout | null = null;
let lastUpdateOffset = 0;
let consecutiveErrors = 0;
const MAX_CONSECUTIVE_ERRORS = 5;

/**
 * Process a single Telegram update
 */
async function processUpdate(update: TelegramUpdate): Promise<void> {
  try {
    const result = await handleTelegramMessage(update);

    if (result) {
      // Dynamic import to get fresh connection
      const { prisma } = await import('@/lib/prisma');

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      // Delete existing unused codes for this chat
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

      console.log(`[TG POLLING] ✉️  Код ${result.code} отправлен в чат ${result.chatId}`);
    }
  } catch (error) {
    console.error('[TG POLLING] Error processing update:', error);
  }
}

/**
 * Poll for Telegram updates
 */
async function pollOnce(): Promise<number> {
  try {
    const updates = await getTelegramUpdates(lastUpdateOffset);

    // Reset error counter on success
    consecutiveErrors = 0;

    for (const update of updates) {
      lastUpdateOffset = update.update_id + 1;
      await processUpdate(update);
    }

    return updates.length;
  } catch (error) {
    consecutiveErrors++;

    // Only log every few errors to reduce noise
    if (consecutiveErrors <= 3 || consecutiveErrors % 10 === 0) {
      console.error(`[TG POLLING] Ошибка сети (${consecutiveErrors}):`,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }

    // Stop polling if too many consecutive errors
    if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.error(`[TG POLLING] ⚠️  Слишком много ошибок подряд (${consecutiveErrors}). Проверьте интернет/VPN.`);
    }

    return 0;
  }
}

/**
 * Start continuous polling
 */
export async function startTelegramPolling(): Promise<void> {
  if (isPolling) {
    console.log('[TG POLLING] Already running');
    return;
  }

  // Delete webhook to enable polling mode
  try {
    await deleteTelegramWebhook();
  } catch {
    console.warn('[TG POLLING] Не удалось удалить webhook');
  }

  isPolling = true;
  consecutiveErrors = 0;
  console.log('[TG POLLING] 🚀 Polling запущен (интервал: 5 сек)');

  // Initial poll
  await pollOnce();

  // Start interval polling (5 seconds to reduce load)
  pollInterval = setInterval(async () => {
    if (isPolling && consecutiveErrors < MAX_CONSECUTIVE_ERRORS) {
      await pollOnce();
    }
  }, 5000);
}

/**
 * Stop polling
 */
export function stopTelegramPolling(): void {
  isPolling = false;
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  console.log('[TG POLLING] ⏹️  Polling остановлен');
}

/**
 * Check if polling is active
 */
export function isPollingActive(): boolean {
  return isPolling && consecutiveErrors < MAX_CONSECUTIVE_ERRORS;
}
