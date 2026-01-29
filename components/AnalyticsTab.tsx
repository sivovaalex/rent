'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkeletonList } from '@/components/ui/spinner';
import { TrendingUp, Package, CalendarDays, BarChart3, DollarSign, ShoppingCart, Activity } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { User, AlertType } from '@/types';
import { formatPrice } from '@/lib/constants';

interface AnalyticsData {
  revenueByMonth: { month: string; label: string; revenue: number }[];
  topItems: { itemId: string; title: string; photo?: string; bookings: number; revenue: number }[];
  calendarOccupancy: number;
  conversionRate: number;
  totalRevenue: number;
  totalBookings: number;
  activeBookings: number;
  totalItems: number;
}

interface AnalyticsTabProps {
  currentUser: User;
  showAlert: (message: string, type?: AlertType) => void;
}

export default function AnalyticsTab({ currentUser, showAlert }: AnalyticsTabProps) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('12');

  const loadAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(`/api/analytics?months=${period}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setData(json);
    } catch (e: unknown) {
      showAlert(e instanceof Error ? e.message : 'Ошибка загрузки аналитики', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [period, showAlert]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Аналитика
        </h2>
        <SkeletonList count={4} />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <p className="text-gray-500">Не удалось загрузить данные</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок + период */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <BarChart3 className="w-5 h-5" />
          Аналитика
        </h2>
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">3 месяца</SelectItem>
            <SelectItem value="6">6 месяцев</SelectItem>
            <SelectItem value="12">12 месяцев</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Числовые карточки */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Доход</p>
                <p className="text-xl font-bold">{formatPrice(data.totalRevenue)} ₽</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Бронирования</p>
                <p className="text-xl font-bold">{data.totalBookings}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <CalendarDays className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Заполняемость</p>
                <p className="text-xl font-bold">{data.calendarOccupancy}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Activity className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Конверсия</p>
                <p className="text-xl font-bold">{data.conversionRate} бр/товар</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* График дохода по месяцам */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            Доход по месяцам
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.revenueByMonth.length > 0 && data.revenueByMonth.some(m => m.revenue > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" fontSize={12} />
                <YAxis fontSize={12} tickFormatter={(v) => `${v} ₽`} />
                <Tooltip
                  formatter={(value: number) => [`${formatPrice(value)} ₽`, 'Доход']}
                  labelFormatter={(label) => `Период: ${label}`}
                />
                <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-gray-400">
              Нет данных о доходах за выбранный период
            </div>
          )}
        </CardContent>
      </Card>

      {/* Топ-5 популярных товаров */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="w-4 h-4" />
            Популярные товары (топ-5)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topItems.length > 0 ? (
            <div className="space-y-3">
              {data.topItems.map((item, idx) => (
                <div key={item.itemId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className="text-lg font-bold text-gray-400 w-6 text-center">{idx + 1}</span>
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                    {item.photo ? (
                      <img src={item.photo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{item.title}</p>
                    <p className="text-sm text-gray-500">{item.bookings} бронирований</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="font-semibold text-green-600">{formatPrice(item.revenue)} ₽</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-400">
              Нет бронирований за выбранный период
            </div>
          )}
        </CardContent>
      </Card>

      {/* Доп. информация */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Активные аренды сейчас</p>
              <p className="text-3xl font-bold text-indigo-600">{data.activeBookings}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-sm text-gray-500 mb-1">Всего товаров</p>
              <p className="text-3xl font-bold text-indigo-600">{data.totalItems}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
