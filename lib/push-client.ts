// Клиентские утилиты для Web Push

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

/** Поддержка push браузером */
export function isPushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/** VAPID-ключ настроен на сервере */
export function isPushConfigured(): boolean {
  return isPushSupported() && VAPID_PUBLIC_KEY.length > 0;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null;

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
    return registration;
  } catch (err) {
    console.error('SW registration failed:', err);
    return null;
  }
}

export async function getSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null;

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

/**
 * Подписывает браузер на push и сохраняет подписку на сервере.
 * Бросает ошибку с понятным сообщением при неудаче.
 */
export async function subscribeToPush(): Promise<PushSubscription> {
  if (!isPushConfigured()) {
    throw new Error('Push-уведомления не поддерживаются или не настроены');
  }

  const registration = await navigator.serviceWorker.ready;

  const permission = await Notification.requestPermission();
  if (permission === 'denied') {
    throw new Error('Вы запретили уведомления. Разрешите их в настройках браузера.');
  }
  if (permission !== 'granted') {
    throw new Error('Разрешение на уведомления не получено');
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
  });

  // Сохраняем подписку на сервере — ошибку пробрасываем наверх
  const token = localStorage.getItem('auth_token');
  if (!token) {
    // Отписываемся в браузере если не авторизованы
    await subscription.unsubscribe();
    throw new Error('Необходима авторизация');
  }

  const response = await fetch('/api/push/subscribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      endpoint: subscription.endpoint,
      p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
      auth: arrayBufferToBase64(subscription.getKey('auth')),
    }),
  });

  if (!response.ok) {
    // Откатываем подписку в браузере
    await subscription.unsubscribe();
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || 'Не удалось сохранить подписку на сервере');
  }

  return subscription;
}

export async function unsubscribeFromPush(): Promise<boolean> {
  const subscription = await getSubscription();
  if (!subscription) return false;

  const token = localStorage.getItem('auth_token');
  if (token) {
    // Удаляем с сервера (не бросаем ошибку если сервер недоступен)
    try {
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ endpoint: subscription.endpoint }),
      });
    } catch {
      // Игнорируем — браузерная отписка важнее
    }
  }

  await subscription.unsubscribe();
  return true;
}

// ==================== HELPERS ====================

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
