'use client';

import { useState, useEffect } from 'react';
import { getAuthHeaders } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageCircle, Send, Loader2, Check, X, ExternalLink, Bell, BellOff } from 'lucide-react';
import { isPushSupported, subscribeToPush, unsubscribeFromPush, getSubscription, registerServiceWorker } from '@/lib/push-client';

interface NotificationSettingsData {
  email: string | null;
  notifyEmail: boolean;
  notifyVk: boolean;
  notifyTelegram: boolean;
  notifyPush: boolean;
  pushBookings: boolean;
  pushChat: boolean;
  pushModeration: boolean;
  pushReviews: boolean;
  pushReminders: boolean;
  vkConnected: boolean;
  telegramConnected: boolean;
}

const TELEGRAM_BOT_USERNAME = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || 'ArendaProBot';
const VK_BOT_URL = process.env.NEXT_PUBLIC_VK_BOT_URL || 'https://vk.com/im?sel=-123456789';
const VK_BOT_NAME = process.env.NEXT_PUBLIC_VK_BOT_NAME || 'Аренда PRO';

export function NotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettingsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Push states
  const [pushSupported] = useState(() => isPushSupported());
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [pushLoading, setPushLoading] = useState(false);

  // Link code states
  const [telegramCode, setTelegramCode] = useState('');
  const [vkCode, setVkCode] = useState('');
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [linkingVk, setLinkingVk] = useState(false);

  // Fetch settings on mount + check push subscription
  useEffect(() => {
    fetchSettings();
    if (pushSupported) {
      registerServiceWorker();
      getSubscription().then((sub) => setPushSubscribed(!!sub));
    }
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/notifications/settings', {
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Необходима авторизация');
          return;
        }
        throw new Error('Не удалось загрузить настройки');
      }

      const data = await response.json();
      setSettings(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: keyof NotificationSettingsData, value: boolean) => {
    if (!settings) return;

    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/notifications/settings', {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ [key]: value }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось сохранить');
      }

      setSettings(data);
      setSuccess('Настройки сохранены');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сохранения');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const linkMessenger = async (type: 'telegram' | 'vk') => {
    const code = type === 'telegram' ? telegramCode : vkCode;
    const setLinking = type === 'telegram' ? setLinkingTelegram : setLinkingVk;

    if (code.length !== 6) {
      setError('Код должен содержать 6 цифр');
      setTimeout(() => setError(null), 3000);
      return;
    }

    try {
      setLinking(true);
      setError(null);

      const response = await fetch('/api/notifications/link', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ code, type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось привязать');
      }

      setSuccess(data.message);
      setTimeout(() => setSuccess(null), 3000);

      // Clear code and refresh settings
      if (type === 'telegram') {
        setTelegramCode('');
      } else {
        setVkCode('');
      }
      fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка привязки');
      setTimeout(() => setError(null), 5000);
    } finally {
      setLinking(false);
    }
  };

  const unlinkMessenger = async (type: 'telegram' | 'vk') => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/notifications/unlink', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ type }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Не удалось отключить');
      }

      setSuccess(data.message);
      setTimeout(() => setSuccess(null), 3000);
      fetchSettings();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка отключения');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!settings) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Не удалось загрузить настройки уведомлений
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Уведомления</CardTitle>
        <CardDescription>
          Настройте способы получения уведомлений о модерации, бронированиях и верификации
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status messages */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            <X className="h-4 w-4" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 p-3 text-sm text-green-600">
            <Check className="h-4 w-4" />
            {success}
          </div>
        )}

        {/* Push notifications */}
        {pushSupported && (
          <div className="rounded-lg border p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-indigo-100 p-2">
                  <Bell className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <Label className="text-base font-medium">Push-уведомления</Label>
                  <p className="text-sm text-muted-foreground">
                    {pushSubscribed ? 'Включены' : 'Отключены'}
                  </p>
                </div>
              </div>
              <Button
                variant={pushSubscribed ? 'outline' : 'default'}
                size="sm"
                disabled={pushLoading}
                onClick={async () => {
                  setPushLoading(true);
                  try {
                    if (pushSubscribed) {
                      const ok = await unsubscribeFromPush();
                      if (ok) {
                        setPushSubscribed(false);
                        setSuccess('Push-уведомления отключены');
                      }
                    } else {
                      const sub = await subscribeToPush();
                      if (sub) {
                        setPushSubscribed(true);
                        setSuccess('Push-уведомления включены');
                        fetchSettings();
                      } else {
                        setError('Не удалось включить push. Проверьте разрешения браузера.');
                      }
                    }
                    setTimeout(() => { setSuccess(null); setError(null); }, 3000);
                  } catch {
                    setError('Ошибка при настройке push');
                    setTimeout(() => setError(null), 5000);
                  } finally {
                    setPushLoading(false);
                  }
                }}
              >
                {pushLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : pushSubscribed ? (
                  <><BellOff className="h-4 w-4 mr-1" /> Отключить</>
                ) : (
                  <><Bell className="h-4 w-4 mr-1" /> Включить</>
                )}
              </Button>
            </div>

            {pushSubscribed && settings && (
              <div className="mt-4 space-y-3 border-t pt-4">
                <p className="text-sm font-medium text-foreground">Категории push-уведомлений:</p>
                <div className="space-y-2">
                  {[
                    { key: 'pushBookings' as const, label: 'Бронирования' },
                    { key: 'pushChat' as const, label: 'Сообщения в чате' },
                    { key: 'pushModeration' as const, label: 'Модерация и верификация' },
                    { key: 'pushReviews' as const, label: 'Отзывы' },
                    { key: 'pushReminders' as const, label: 'Напоминания' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="text-sm text-muted-foreground">{label}</span>
                      <Switch
                        checked={settings[key]}
                        onCheckedChange={(checked) => updateSetting(key, checked)}
                        disabled={saving}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Email notifications */}
        <div className="flex items-start justify-between rounded-lg border p-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <Label className="text-base font-medium">Email</Label>
              <p className="text-sm text-muted-foreground">{settings.email || 'Не указан'}</p>
            </div>
          </div>
          <Switch
            checked={settings.notifyEmail}
            onCheckedChange={(checked) => updateSetting('notifyEmail', checked)}
            disabled={saving || !settings.email}
          />
        </div>

        {/* Telegram notifications */}
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-sky-100 p-2">
                <Send className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <Label className="text-base font-medium">Telegram</Label>
                <p className="text-sm text-muted-foreground">
                  {settings.telegramConnected ? 'Подключён' : 'Не подключён'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notifyTelegram}
              onCheckedChange={(checked) => updateSetting('notifyTelegram', checked)}
              disabled={saving || !settings.telegramConnected}
            />
          </div>

          {!settings.telegramConnected && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <p className="text-sm font-medium text-foreground">Как подключить Telegram:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Откройте бота{' '}
                  <a
                    href={`https://t.me/${TELEGRAM_BOT_USERNAME}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sky-600 hover:underline"
                  >
                    @{TELEGRAM_BOT_USERNAME}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Нажмите «Запустить» или отправьте команду /start</li>
                <li>Скопируйте полученный 6-значный код</li>
                <li>Введите код ниже и нажмите «Привязать»</li>
              </ol>
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Введите код"
                  value={telegramCode}
                  onChange={(e) => setTelegramCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="max-w-[150px]"
                />
                <Button
                  onClick={() => linkMessenger('telegram')}
                  disabled={linkingTelegram || telegramCode.length !== 6}
                  size="sm"
                >
                  {linkingTelegram ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Привязать'}
                </Button>
              </div>
            </div>
          )}

          {settings.telegramConnected && (
            <div className="mt-4 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => unlinkMessenger('telegram')}
                disabled={saving}
              >
                Отключить Telegram
              </Button>
            </div>
          )}
        </div>

        {/* VK notifications */}
        <div className="rounded-lg border p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-blue-100 p-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <Label className="text-base font-medium">ВКонтакте</Label>
                <p className="text-sm text-muted-foreground">
                  {settings.vkConnected ? 'Подключён' : 'Не подключён'}
                </p>
              </div>
            </div>
            <Switch
              checked={settings.notifyVk}
              onCheckedChange={(checked) => updateSetting('notifyVk', checked)}
              disabled={saving || !settings.vkConnected}
            />
          </div>

          {!settings.vkConnected && (
            <div className="mt-4 space-y-3 border-t pt-4">
              <p className="text-sm font-medium text-foreground">Как подключить ВКонтакте:</p>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Откройте сообщество{' '}
                  <a
                    href={VK_BOT_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                  >
                    {VK_BOT_NAME}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </li>
                <li>Напишите любое сообщение боту</li>
                <li>Скопируйте полученный 6-значный код</li>
                <li>Введите код ниже и нажмите «Привязать»</li>
              </ol>
              <div className="flex gap-2 pt-2">
                <Input
                  placeholder="Введите код"
                  value={vkCode}
                  onChange={(e) => setVkCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength={6}
                  className="max-w-[150px]"
                />
                <Button
                  onClick={() => linkMessenger('vk')}
                  disabled={linkingVk || vkCode.length !== 6}
                  size="sm"
                >
                  {linkingVk ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Привязать'}
                </Button>
              </div>
            </div>
          )}

          {settings.vkConnected && (
            <div className="mt-4 border-t pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => unlinkMessenger('vk')}
                disabled={saving}
              >
                Отключить VK
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
