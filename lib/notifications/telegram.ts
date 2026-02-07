/**
 * Telegram notification service
 * Sends messages via Telegram Bot API
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API_URL = TELEGRAM_BOT_TOKEN
  ? `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`
  : '';

/**
 * Set webhook URL for Telegram bot
 */
export async function setTelegramWebhook(webhookUrl: string): Promise<{ ok: boolean; description?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, description: 'Bot token not configured' };
  }

  try {
    const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
    const params: Record<string, string> = { url: webhookUrl };
    if (secret) {
      params.secret_token = secret;
    }

    const response = await fetch(`${TELEGRAM_API_URL}/setWebhook`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await response.json();
    console.log('[TELEGRAM] setWebhook response:', data);
    return data;
  } catch (error) {
    console.error('[TELEGRAM] setWebhook error:', error);
    return { ok: false, description: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete webhook (for switching to long polling)
 */
export async function deleteTelegramWebhook(): Promise<{ ok: boolean; description?: string }> {
  if (!TELEGRAM_BOT_TOKEN) {
    return { ok: false, description: 'Bot token not configured' };
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/deleteWebhook`, {
      method: 'POST',
    });

    const data = await response.json();
    console.log('[TELEGRAM] deleteWebhook response:', data);
    return data;
  } catch (error) {
    console.error('[TELEGRAM] deleteWebhook error:', error);
    return { ok: false, description: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get updates via long polling (for local development)
 */
export async function getTelegramUpdates(offset?: number): Promise<TelegramUpdate[]> {
  if (!TELEGRAM_BOT_TOKEN) {
    return [];
  }

  try {
    // Use short timeout (5 sec) to avoid connection issues
    const params = new URLSearchParams({ timeout: '5' });
    if (offset) {
      params.set('offset', offset.toString());
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 sec hard timeout

    const response = await fetch(`${TELEGRAM_API_URL}/getUpdates?${params}`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const data = await response.json();

    if (data.ok && Array.isArray(data.result)) {
      return data.result;
    }
    return [];
  } catch (error) {
    // Don't log abort errors (expected on timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      return [];
    }
    throw error; // Re-throw to be handled by polling
  }
}

/**
 * Get current webhook info
 */
export async function getTelegramWebhookInfo(): Promise<{ url: string; pending_update_count: number } | null> {
  if (!TELEGRAM_BOT_TOKEN) {
    return null;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/getWebhookInfo`);
    const data = await response.json();

    if (data.ok) {
      return data.result;
    }
    return null;
  } catch (error) {
    console.error('[TELEGRAM] getWebhookInfo error:', error);
    return null;
  }
}

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

/**
 * Send a message to a Telegram chat
 */
export async function sendTelegramMessage(
  chatId: string,
  text: string,
  parseMode: 'HTML' | 'Markdown' = 'HTML'
): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.warn('[TELEGRAM] Bot token not configured');
    return false;
  }

  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: parseMode,
      }),
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      console.error('[TELEGRAM] Failed to send message:', data.description);
      return false;
    }

    console.log(`[TELEGRAM] Message sent to chat ${chatId}`);
    return true;
  } catch (error) {
    console.error('[TELEGRAM] Error sending message:', error);
    return false;
  }
}

/**
 * Generate a 6-digit link code
 */
export function generateLinkCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Handle incoming Telegram update (for webhook)
 */
export interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: {
      id: number;
      is_bot: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
    };
    chat: {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      type: 'private' | 'group' | 'supergroup' | 'channel';
    };
    date: number;
    text?: string;
  };
}

/**
 * Check if Telegram chat is already linked to a user
 */
export async function isLinkedTelegramChat(chatId: string): Promise<{ linked: boolean; userName?: string }> {
  try {
    // Dynamic import to avoid circular dependencies
    const { prisma } = await import('@/lib/prisma');

    const user = await prisma.user.findFirst({
      where: { telegramChatId: chatId },
      select: { name: true }
    });

    return {
      linked: !!user,
      userName: user?.name || undefined
    };
  } catch (error) {
    console.error('[TELEGRAM] Error checking linked chat:', error);
    return { linked: false };
  }
}

/**
 * Process incoming message from Telegram bot
 * Returns the link code if user requested one (only for unlinked chats)
 */
export async function handleTelegramMessage(
  update: TelegramUpdate
): Promise<{ chatId: string; code: string } | null> {
  const message = update.message;
  if (!message || !message.text) {
    return null;
  }

  const chatId = message.chat.id.toString();
  const text = message.text.trim().toLowerCase();
  const firstName = message.chat.first_name || message.from?.first_name || '';

  // User sends /start
  if (text === '/start' || text.startsWith('/start')) {
    // Check if already linked
    const { linked, userName } = await isLinkedTelegramChat(chatId);

    if (linked) {
      // Already linked - show welcome message
      await sendTelegramMessage(
        chatId,
        `<b>👋 Привет${userName ? `, ${userName}` : ''}!</b>\n\n` +
          `Ваш Telegram уже привязан к аккаунту Арендол.\n\n` +
          `Вы будете получать уведомления о:\n` +
          `• Модерации ваших лотов\n` +
          `• Новых бронированиях\n` +
          `• Статусе бронирований\n\n` +
          `Чтобы отвязать Telegram, зайдите в настройки профиля на сайте.`,
        'HTML'
      );
      return null;
    }

    // Not linked - generate link code
    const code = generateLinkCode();

    await sendTelegramMessage(
      chatId,
      `<b>Привязка аккаунта Арендол</b>\n\n` +
        `${firstName ? `Привет, ${firstName}! ` : ''}Ваш код привязки: <code>${code}</code>\n\n` +
        `Введите этот код в настройках профиля на сайте.\n` +
        `Код действителен 10 минут.`,
      'HTML'
    );

    return { chatId, code };
  }

  return null;
}
