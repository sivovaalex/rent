/**
 * Проверка подключения ботов при запуске приложения
 */

import logger from '@/lib/logger';
import { startTelegramPolling } from './polling';
import { setTelegramWebhook } from './telegram';

interface BotStatus {
  connected: boolean;
  name?: string;
  error?: string;
  webhookUrl?: string;
}

/**
 * Проверка подключения Telegram бота
 */
async function checkTelegramBot(): Promise<BotStatus> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return { connected: false, error: 'TELEGRAM_BOT_TOKEN не задан' };
  }

  try {
    // Check bot info
    const response = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      method: 'GET',
    });

    if (!response.ok) {
      const error = await response.text();
      return { connected: false, error: `HTTP ${response.status}: ${error}` };
    }

    const data = await response.json();

    if (data.ok && data.result) {
      // Also check webhook status
      const webhookResponse = await fetch(`https://api.telegram.org/bot${token}/getWebhookInfo`);
      const webhookData = await webhookResponse.json();
      const webhookUrl = webhookData.ok && webhookData.result?.url ? webhookData.result.url : '';

      return {
        connected: true,
        name: `@${data.result.username}`,
        webhookUrl: webhookUrl || '(не установлен - используйте polling)'
      };
    }

    return { connected: false, error: data.description || 'Неизвестная ошибка' };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Ошибка подключения'
    };
  }
}

/**
 * Проверка подключения VK бота
 */
async function checkVkBot(): Promise<BotStatus> {
  const token = process.env.VK_BOT_TOKEN;
  const groupId = process.env.VK_GROUP_ID;

  if (!token) {
    return { connected: false, error: 'VK_BOT_TOKEN не задан' };
  }

  if (!groupId) {
    return { connected: false, error: 'VK_GROUP_ID не задан' };
  }

  try {
    const params = new URLSearchParams({
      access_token: token,
      group_id: groupId,
      v: '5.199',
    });

    const response = await fetch(`https://api.vk.com/method/groups.getById?${params}`, {
      method: 'GET',
    });

    if (!response.ok) {
      return { connected: false, error: `HTTP ${response.status}` };
    }

    const data = await response.json();

    if (data.error) {
      return {
        connected: false,
        error: `VK API Error ${data.error.error_code}: ${data.error.error_msg}`
      };
    }

    if (data.response && data.response.groups && data.response.groups[0]) {
      const group = data.response.groups[0];
      return {
        connected: true,
        name: group.name || `id${group.id}`
      };
    }

    // Старый формат ответа
    if (data.response && data.response[0]) {
      const group = data.response[0];
      return {
        connected: true,
        name: group.name || `id${group.id}`
      };
    }

    return { connected: false, error: 'Группа не найдена' };
  } catch (error) {
    return {
      connected: false,
      error: error instanceof Error ? error.message : 'Ошибка подключения'
    };
  }
}

/**
 * Проверка всех ботов и вывод статуса
 */
export async function checkBotsStatus(): Promise<void> {
  const isDev = process.env.NODE_ENV === 'development';

  console.log('\n========================================');
  console.log('🔔 ПРОВЕРКА СТАТУСА БОТОВ УВЕДОМЛЕНИЙ');
  console.log('========================================\n');

  // Проверяем Telegram
  const tgStatus = await checkTelegramBot();
  if (tgStatus.connected) {
    console.log(`✅ Telegram: подключен (${tgStatus.name})`);
    logger.info({ botName: tgStatus.name }, 'Telegram бот подключен');

    // В dev режиме запускаем автоматический polling
    if (isDev) {
      console.log('   Режим: Long Polling (dev)');
      await startTelegramPolling();
    } else {
      // Production: настраиваем webhook если не установлен
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
      const expectedWebhookUrl = baseUrl ? `${baseUrl}/api/webhooks/telegram` : '';

      if (expectedWebhookUrl && (!tgStatus.webhookUrl || tgStatus.webhookUrl !== expectedWebhookUrl)) {
        console.log('   Настройка webhook...');
        const result = await setTelegramWebhook(expectedWebhookUrl);
        if (result.ok) {
          console.log(`   ✅ Webhook установлен: ${expectedWebhookUrl}`);
        } else {
          console.log(`   ⚠️  Ошибка установки webhook: ${result.description}`);
        }
      } else {
        console.log(`   Режим: Webhook`);
        console.log(`   URL: ${tgStatus.webhookUrl}`);
      }
    }
  } else {
    console.log(`❌ Telegram: не подключен - ${tgStatus.error}`);
    logger.warn({ error: tgStatus.error }, 'Telegram бот не подключен');
  }

  // Проверяем VK
  const vkStatus = await checkVkBot();
  if (vkStatus.connected) {
    console.log(`✅ VK: подключен (${vkStatus.name})`);
    logger.info({ groupName: vkStatus.name }, 'VK бот подключен');
  } else {
    console.log(`❌ VK: не подключен - ${vkStatus.error}`);
    logger.warn({ error: vkStatus.error }, 'VK бот не подключен');
  }

  console.log('\n========================================\n');
}
