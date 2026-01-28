/**
 * Next.js Instrumentation - выполняется при запуске сервера
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */

export async function register() {
  // Выполняем только на сервере
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { checkBotsStatus } = await import('@/lib/notifications/startup');

    // Проверяем статус ботов при запуске
    await checkBotsStatus();
  }
}
