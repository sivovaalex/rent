/**
 * VK notification service
 * Sends messages via VK API
 */

const VK_BOT_TOKEN = process.env.VK_BOT_TOKEN;
const VK_API_VERSION = '5.131';
const VK_API_URL = 'https://api.vk.com/method';

interface VKResponse {
  response?: unknown;
  error?: {
    error_code: number;
    error_msg: string;
  };
}

/**
 * Send a message to a VK user
 */
export async function sendVkMessage(
  userId: string,
  message: string
): Promise<boolean> {
  if (!VK_BOT_TOKEN) {
    console.warn('[VK] Bot token not configured');
    return false;
  }

  try {
    const randomId = Math.floor(Math.random() * 2147483647);

    const params = new URLSearchParams({
      user_id: userId,
      message,
      random_id: randomId.toString(),
      access_token: VK_BOT_TOKEN,
      v: VK_API_VERSION,
    });

    const response = await fetch(`${VK_API_URL}/messages.send?${params}`, {
      method: 'POST',
    });

    const data: VKResponse = await response.json();

    if (data.error) {
      console.error('[VK] Failed to send message:', data.error.error_msg);
      return false;
    }

    console.log(`[VK] Message sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error('[VK] Error sending message:', error);
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
 * VK Callback API event types
 */
export interface VKCallbackEvent {
  type: string;
  object: {
    message?: {
      id: number;
      date: number;
      peer_id: number;
      from_id: number;
      text: string;
    };
  };
  group_id: number;
  event_id: string;
  secret?: string;
}

/**
 * Process incoming message from VK bot
 * Returns the link code if user requested one
 */
export async function handleVkMessage(
  event: VKCallbackEvent
): Promise<{ peerId: string; code: string } | null> {
  if (event.type !== 'message_new' || !event.object.message) {
    return null;
  }

  const message = event.object.message;
  const peerId = message.peer_id.toString();
  const text = message.text.trim().toLowerCase();

  // User sends any message to get a link code
  // VK bots respond to any message (no /start command needed)
  if (text || text === '') {
    const code = generateLinkCode();

    await sendVkMessage(
      peerId,
      `Привязка аккаунта Аренда Про\n\n` +
        `Ваш код привязки: ${code}\n\n` +
        `Введите этот код в настройках профиля на сайте.\n` +
        `Код действителен 10 минут.`
    );

    return { peerId, code };
  }

  return null;
}

/**
 * Verify VK callback secret key
 */
export function verifyVkSecret(secret: string | undefined): boolean {
  const expectedSecret = process.env.VK_SECRET_KEY;
  if (!expectedSecret) {
    return true; // No secret configured, skip verification
  }
  return secret === expectedSecret;
}
