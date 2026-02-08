'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star, CheckCircle, AlertCircle, Shield, Settings, MessageSquare, Loader2, BookOpen, ChevronRight, TrendingUp, DollarSign, Clock, ShieldCheck } from 'lucide-react';
import { NotificationSettings } from '@/components/NotificationSettings';
import TrustBadges, { TrustScore } from './TrustBadges';
import type { User, UserRole, AlertType, ApprovalMode, Review } from '@/types';

interface ProfileProps {
  currentUser: User | null;
  showAlert: (message: string, type?: AlertType) => void;
  onRoleChange: (role: UserRole) => void;
  onVerifyRequest: () => void;
}

const APPROVAL_MODE_LABELS: Record<ApprovalMode, string> = {
  auto_approve: 'Автоматическое одобрение',
  manual: 'Ручное одобрение',
  rating_based: 'По рейтингу арендатора',
  verified_only: 'Только верифицированные',
};

export default function Profile({ currentUser, showAlert, onRoleChange, onVerifyRequest }: ProfileProps) {
  const [name, setName] = useState(currentUser?.name || '');
  const [editingName, setEditingName] = useState(false);

  // Approval settings
  const [approvalMode, setApprovalMode] = useState<ApprovalMode>(
    currentUser?.defaultApprovalMode || 'auto_approve'
  );
  const [approvalThreshold, setApprovalThreshold] = useState<number>(
    currentUser?.defaultApprovalThreshold || 4.0
  );
  const [savingApproval, setSavingApproval] = useState(false);

  // Reviews about me
  const [myReviews, setMyReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    setName(currentUser?.name || '');
    setApprovalMode(currentUser?.defaultApprovalMode || 'auto_approve');
    setApprovalThreshold(currentUser?.defaultApprovalThreshold || 4.0);
  }, [currentUser]);

  const fetchMyReviews = useCallback(async () => {
    if (!currentUser) return;
    setLoadingReviews(true);
    try {
      const res = await fetch(`/api/reviews?userId=${currentUser._id}&type=owner_review`, {
        headers: { 'x-user-id': currentUser._id },
      });
      if (res.ok) {
        const data = await res.json();
        setMyReviews(data.reviews || []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingReviews(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchMyReviews();
  }, [fetchMyReviews]);

  const handleSaveApproval = async () => {
    if (!currentUser) return;
    setSavingApproval(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id,
        },
        body: JSON.stringify({
          defaultApprovalMode: approvalMode,
          defaultApprovalThreshold: approvalThreshold,
        }),
      });
      if (res.ok) {
        showAlert('Настройки одобрения сохранены');
      } else {
        const data = await res.json();
        showAlert(data.error || 'Ошибка сохранения', 'error');
      }
    } catch {
      showAlert('Ошибка сохранения настроек', 'error');
    } finally {
      setSavingApproval(false);
    }
  };

  const handleNameUpdate = async () => {
    if (!currentUser) return;

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify({ name })
      });

      if (res.ok) {
        showAlert('Имя успешно обновлено');
        setEditingName(false);
      } else {
        const data = await res.json();
        showAlert(data.error || 'Ошибка обновления имени', 'error');
      }
    } catch {
      showAlert('Ошибка обновления имени', 'error');
    }
  };

  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Профиль пользователя</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Имя пользователя */}
        <div className="space-y-2">
          <Label>Имя</Label>
          {editingName ? (
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
              />
              <Button onClick={handleNameUpdate}>Сохранить</Button>
              <Button variant="outline" onClick={() => {
                setName(currentUser?.name || '');
                setEditingName(false);
              }}>Отмена</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-lg font-medium">{name || 'Не указано'}</p>
              <Button variant="outline" size="sm" onClick={() => setEditingName(true)}>
                Редактировать
              </Button>
            </div>
          )}
        </div>

        {/* Основная информация */}
        <div className="space-y-4">
          <div>
            <Label>Телефон</Label>
            <p className="text-lg font-medium">{currentUser?.phone || 'Не указан'}</p>
          </div>

          <div>
            <Label>Email</Label>
            <p className="text-lg font-medium">{currentUser?.email || 'Не указан'}</p>
          </div>

          <div>
            <Label>Роль</Label>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-lg font-medium">
                {currentUser?.role === 'renter' && 'Арендатор'}
                {currentUser?.role === 'owner' && 'Арендодатель'}
                {currentUser?.role === 'moderator' && 'Модератор'}
                {currentUser?.role === 'admin' && 'Администратор'}
              </p>
            </div>
          </div>

          <div>
            <Label>Рейтинг</Label>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold">{currentUser?.rating?.toFixed(2) || '5.00'}</span>
            </div>
          </div>

          <div>
            <Label>Индекс доверия</Label>
            <div className="mt-1 space-y-2">
              <TrustScore score={currentUser?.trustScore} size="md" />
              <TrustBadges badges={currentUser?.trustBadges} />
              <div className="text-xs text-gray-500 space-y-0.5">
                <p>Успешных сделок: {currentUser?.completedDeals ?? 0}</p>
                <p>Подтверждение: {currentUser?.confirmationRate ?? 0}%</p>
                {currentUser?.avgResponseMinutes != null && (
                  <p>Ср. время ответа: {currentUser.avgResponseMinutes < 60
                    ? `${Math.round(currentUser.avgResponseMinutes)} мин`
                    : `${Math.round(currentUser.avgResponseMinutes / 60)} ч`
                  }</p>
                )}
              </div>
            </div>
          </div>

          <div>
            <Label>Статус верификации</Label>
            <div className="mt-1">
              {currentUser?.is_verified ? (
                <Badge variant="secondary" className="text-lg px-3 py-1">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Верифицирован
                </Badge>
              ) : (
                <div className="space-y-2">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    <AlertCircle className="w-5 h-5 mr-2 text-yellow-500" />
                    {currentUser?.verification_status === 'pending'
                      ? 'На проверке'
                      : 'Требуется верификация'}
                  </Badge>

                  {currentUser?.verification_status !== 'pending' && (
                    <Button onClick={onVerifyRequest} className="w-full sm:w-auto">
                      <Shield className="w-4 h-4 mr-2" />
                      Пройти верификацию
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Предупреждение для арендодателей */}
        {currentUser?.role === 'owner' && !currentUser?.is_verified && (
          <Alert>
            <AlertDescription>
              Чтобы создавать лоты и получать доход от аренды, необходимо пройти верификацию личности. Загрузите скан паспорта или иного документа, удостоверяющего личность.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>

    {/* Промо-блок: Стать арендодателем (только для арендаторов) */}
    {currentUser?.role === 'renter' && (
      <Card className="mt-6 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-700">
            <TrendingUp className="w-5 h-5" />
            Станьте арендодателем
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-700">
            Зарабатывайте на вещах, которые простаивают! Сдавайте в аренду и получайте стабильный доход.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
              <DollarSign className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Дополнительный доход</p>
                <p className="text-xs text-gray-500">Зарабатывайте на вещах, которые не используете</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
              <Clock className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Гибкий график</p>
                <p className="text-xs text-gray-500">Сами выбирайте когда и кому сдавать</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
              <ShieldCheck className="w-5 h-5 text-indigo-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Страхование</p>
                <p className="text-xs text-gray-500">Защита ваших вещей и залоговый депозит</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-3 bg-white rounded-lg">
              <Star className="w-5 h-5 text-yellow-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-sm">Репутация</p>
                <p className="text-xs text-gray-500">Копите отзывы и рейтинг доверия</p>
              </div>
            </div>
          </div>

          {currentUser?.is_verified ? (
            <Button
              onClick={() => onRoleChange('owner')}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Стать арендодателем
            </Button>
          ) : currentUser?.verification_status === 'pending' ? (
            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="text-sm text-yellow-700">
                Ваша заявка на верификацию на рассмотрении. После одобрения вы сможете стать арендодателем.
              </p>
            </div>
          ) : (
            <Button
              onClick={onVerifyRequest}
              className="w-full"
              variant="outline"
            >
              <Shield className="w-4 h-4 mr-2" />
              Пройти верификацию
            </Button>
          )}
        </CardContent>
      </Card>
    )}

    {/* Настройки одобрения бронирований (для владельцев) */}
    {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Настройки одобрения бронирований
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-500">
            Глобальная настройка по умолчанию для всех ваших лотов. Можно переопределить для каждого лота отдельно.
          </p>

          <div className="space-y-2">
            <Label>Режим одобрения</Label>
            <Select value={approvalMode} onValueChange={(v) => setApprovalMode(v as ApprovalMode)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(APPROVAL_MODE_LABELS) as ApprovalMode[]).map((mode) => (
                  <SelectItem key={mode} value={mode}>
                    {APPROVAL_MODE_LABELS[mode]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {approvalMode === 'auto_approve' && 'Все бронирования одобряются автоматически.'}
              {approvalMode === 'manual' && 'Каждое бронирование требует вашего одобрения (24 часа на ответ).'}
              {approvalMode === 'rating_based' && 'Автоматическое одобрение для арендаторов с рейтингом выше порога.'}
              {approvalMode === 'verified_only' && 'Автоматическое одобрение только для верифицированных пользователей.'}
            </p>
          </div>

          {approvalMode === 'rating_based' && (
            <div className="space-y-2">
              <Label>Минимальный рейтинг: {approvalThreshold.toFixed(1)}</Label>
              <Slider
                value={[approvalThreshold]}
                onValueChange={([v]) => setApprovalThreshold(v)}
                min={3.0}
                max={5.0}
                step={0.5}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>3.0</span>
                <span>5.0</span>
              </div>
            </div>
          )}

          <Button onClick={handleSaveApproval} disabled={savingApproval}>
            {savingApproval && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Сохранить настройки
          </Button>
        </CardContent>
      </Card>
    )}

    {/* Отзывы обо мне (от арендодателей) */}
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Отзывы обо мне
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loadingReviews ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : myReviews.length > 0 ? (
          <div className="space-y-4">
            {myReviews.map((review) => (
              <div key={review._id} className="border rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src={review.userPhoto || review.user_photo} alt={review.userName || review.user_name} />
                    <AvatarFallback>{(review.userName || review.user_name || '?').charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{review.userName || review.user_name}</span>
                      <div className="flex items-center gap-0.5">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3.5 h-3.5 ${i < review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-700 text-sm mt-1">{review.text}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(review.createdAt).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Пока нет отзывов о вас от арендодателей</p>
          </div>
        )}
      </CardContent>
    </Card>

    {/* Настройки уведомлений */}
    <div className="mt-6">
      <NotificationSettings />
    </div>

    {/* Руководство пользователя */}
    <Card className="mt-6">
      <CardContent className="p-4 sm:p-6">
        <a
          href="/guide"
          className="flex items-center gap-4 group"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-100 transition-colors">
            <BookOpen className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 group-hover:text-indigo-600 transition-colors">
              Руководство пользователя
            </h3>
            <p className="text-sm text-gray-500">
              Как пользоваться платформой, FAQ, инструкции
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-indigo-600 transition-colors flex-shrink-0" />
        </a>
      </CardContent>
    </Card>
  </>
  );
}
