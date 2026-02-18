'use client';
import { useState, useEffect, useMemo, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, ThumbsUp, Users, Plus, Star, UserCheck, UserX, Package, AlertTriangle, Loader2, Clock, History, Eye, FileText, Search, Building2 } from 'lucide-react';
import { SkeletonTable, Loader } from '@/components/ui/spinner';
import { getAuthHeaders } from '@/hooks/use-auth';
import type { User, Item, UserRole, AlertType } from '@/types';

interface AdminStats {
  totalUsers: number;
  totalItems: number;
  totalBookings: number;
  pendingVerifications: number;
  pendingItems: number;
  totalRevenue: number;
}

interface PendingUser extends User {
  verification_submitted_at?: Date;
}

interface PendingItem extends Item {
  owner_name: string;
}

interface NewAdminUser {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: UserRole;
}

interface AdminTabProps {
  currentUser: User | null;
  showAlert: (message: string, type?: AlertType) => void;
  loadAdminData: () => Promise<void>;
  pendingUsers: PendingUser[];
  pendingItems: PendingItem[];
  stats: AdminStats | null;
  allUsers: User[];
  allUsersTotal: number;
  isLoading?: boolean;
  isLoadingMore?: boolean;
  loadMoreUsers: () => Promise<void>;
}

export default function AdminTab({ currentUser, showAlert, loadAdminData, pendingUsers, pendingItems, stats, allUsers, allUsersTotal, isLoading, isLoadingMore, loadMoreUsers }: AdminTabProps) {
  const [adminSubTab, setAdminSubTab] = useState('stats');
  const [showAdminUserModal, setShowAdminUserModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [verifyingUserId, setVerifyingUserId] = useState<string | null>(null);
  const [moderatingItemId, setModeratingItemId] = useState<string | null>(null);
  const [verificationSubTab, setVerificationSubTab] = useState('pending');
  const [verificationHistory, setVerificationHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [rejectingUserId, setRejectingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [verificationSearch, setVerificationSearch] = useState('');
  const [historySearch, setHistorySearch] = useState('');
  const [historyActionFilter, setHistoryActionFilter] = useState<string>('all');
  const [usersSearch, setUsersSearch] = useState('');
  const [usersRoleFilter, setUsersRoleFilter] = useState<string>('all');

  const filteredPendingUsers = useMemo(() => {
    if (!verificationSearch.trim()) return pendingUsers;
    const q = verificationSearch.toLowerCase();
    return pendingUsers.filter(u => u.name?.toLowerCase().includes(q) || u.phone?.includes(q));
  }, [pendingUsers, verificationSearch]);

  const filteredPendingItems = useMemo(() => {
    if (!verificationSearch.trim()) return pendingItems;
    const q = verificationSearch.toLowerCase();
    return pendingItems.filter(i => i.title?.toLowerCase().includes(q) || i.owner_name?.toLowerCase().includes(q));
  }, [pendingItems, verificationSearch]);

  const filteredHistory = useMemo(() => {
    let result = verificationHistory;
    if (historyActionFilter !== 'all') {
      result = result.filter((h: any) => h.action === historyActionFilter);
    }
    if (historySearch.trim()) {
      const q = historySearch.toLowerCase();
      result = result.filter((h: any) =>
        h.user?.name?.toLowerCase().includes(q) ||
        h.user?.phone?.includes(q) ||
        h.entityName?.toLowerCase().includes(q) ||
        h.editor?.name?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [verificationHistory, historySearch, historyActionFilter]);

  const filteredAllUsers = useMemo(() => {
    let result = allUsers;
    if (usersRoleFilter !== 'all') {
      result = result.filter(u => u.role === usersRoleFilter);
    }
    if (usersSearch.trim()) {
      const q = usersSearch.toLowerCase();
      result = result.filter(u =>
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.includes(q)
      );
    }
    return result;
  }, [allUsers, usersSearch, usersRoleFilter]);

  const loadVerificationHistory = async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setHistoryLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch('/api/admin/verifications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) setVerificationHistory(data.history || []);
    } catch { /* ignore */ } finally {
      setHistoryLoading(false);
    }
  };
  const [newAdminUser, setNewAdminUser] = useState<NewAdminUser>({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'renter'
  });

  useEffect(() => {
    if (currentUser) {
      loadAdminData();
    }
  }, [currentUser, loadAdminData]);

  const verifyUser = async (userId: string, action: 'approve' | 'reject', reason?: string) => {
    if (!currentUser || verifyingUserId) return;

    setVerifyingUserId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, ...(reason ? { reason } : {}) })
      });
      if (res.ok) {
        showAlert(`Пользователь ${action === 'approve' ? 'верифицирован' : 'отклонён'}`);
        setRejectingUserId(null);
        setRejectionReason('');
        loadAdminData();
      } else {
        showAlert('Ошибка модерации', 'error');
      }
    } catch {
      showAlert('Ошибка модерации', 'error');
    } finally {
      setVerifyingUserId(null);
    }
  };

  const moderateItem = async (itemId: string, status: 'approved' | 'rejected', rejection_reason?: string) => {
    if (!currentUser || moderatingItemId) return;

    setModeratingItemId(itemId);
    try {
      const res = await fetch(`/api/admin/items/${itemId}/moderate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status, rejection_reason })
      });
      if (res.ok) {
        showAlert(`Лот ${status === 'approved' ? 'одобрен' : 'отклонён'}`);
        loadAdminData();
      } else {
        showAlert('Ошибка модерации', 'error');
      }
    } catch {
      showAlert('Ошибка модерации', 'error');
    } finally {
      setModeratingItemId(null);
    }
  };

  const getRoleBadge = (role: UserRole): ReactNode => {
    switch (role) {
      case 'admin':
        return <Badge variant="destructive">Админ</Badge>;
      case 'moderator':
        return <Badge variant="outline">Модератор</Badge>;
      case 'owner':
        return <Badge variant="secondary">Арендодатель</Badge>;
      case 'renter':
        return <Badge variant="outline">Арендатор</Badge>;
      default:
        return <Badge variant="outline">{role}</Badge>;
    }
  };

  const createUser = async () => {
    if (!currentUser) return;

    setIsCreating(true);
    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(newAdminUser)
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Пользователь создан!');
        setShowAdminUserModal(false);
        setNewAdminUser({
          name: '',
          phone: '',
          email: '',
          password: '',
          role: 'renter'
        });
        loadAdminData();
      } else {
        showAlert(data.error, 'error');
      }
    } catch {
      showAlert('Ошибка создания пользователя', 'error');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <Tabs value={adminSubTab} onValueChange={setAdminSubTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="stats">
            <BarChart className="w-4 h-4 mr-2" />
            Статистика
          </TabsTrigger>
          <TabsTrigger value="verification">
            <ThumbsUp className="w-4 h-4 mr-2" />
            Верификация
          </TabsTrigger>
          {currentUser?.role === 'admin' && (
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" />
              Пользователи
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="stats">
          {isLoading ? (
            <div className="py-12">
              <Loader size="lg" text="Загрузка статистики..." />
            </div>
          ) : currentUser?.role === 'admin' && stats ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Пользователи</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalUsers}</p>
                  <p className="text-sm text-gray-600 mt-1">На проверке: {stats.pendingVerifications}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Лоты</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalItems}</p>
                  <p className="text-sm text-gray-600 mt-1">На проверке: {stats.pendingItems}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Комиссия</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">{stats.totalRevenue?.toFixed(0)} ₽<span className="text-xs text-gray-500 ml-1 align-top">от завершенных бронирований</span></p>
                  <p className="text-sm text-gray-600 mt-1">Всего бронирований: {stats.totalBookings}</p>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </TabsContent>

        <TabsContent value="verification">
          {isLoading ? (
            <div className="py-12">
              <Loader size="lg" text="Загрузка данных..." />
            </div>
          ) : (
          <div className="space-y-6">
            {/* Sub-tabs only for admin */}
            {currentUser?.role === 'admin' && (
              <div className="flex gap-2 border-b pb-2">
                <button
                  onClick={() => setVerificationSubTab('pending')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    verificationSubTab === 'pending'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Clock className="w-4 h-4" />
                  Ожидание
                  {pendingUsers.length > 0 && (
                    <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5">{pendingUsers.length}</span>
                  )}
                </button>
                <button
                  onClick={() => { setVerificationSubTab('history'); loadVerificationHistory(); }}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    verificationSubTab === 'history'
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <History className="w-4 h-4" />
                  История
                </button>
              </div>
            )}

            {/* History tab (admin only) */}
            {currentUser?.role === 'admin' && verificationSubTab === 'history' ? (
              <Card>
                <CardHeader>
                  <CardTitle>История верификаций</CardTitle>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="py-8"><Loader size="md" text="Загрузка истории..." /></div>
                  ) : verificationHistory.length === 0 ? (
                    <p className="text-center text-gray-500 py-4">История пуста</p>
                  ) : (
                    <>
                    <div className="flex flex-wrap gap-2 mb-4">
                      <div className="relative flex-1 min-w-[180px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          value={historySearch}
                          onChange={(e) => setHistorySearch(e.target.value)}
                          placeholder="Поиск по имени, телефону..."
                          className="pl-9"
                        />
                      </div>
                      <Select value={historyActionFilter} onValueChange={setHistoryActionFilter}>
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Действие" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Все действия</SelectItem>
                          <SelectItem value="approve">Одобрено</SelectItem>
                          <SelectItem value="reject">Отклонено</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Дата</TableHead>
                          <TableHead>Тип</TableHead>
                          <TableHead>Объект</TableHead>
                          <TableHead>Действие</TableHead>
                          <TableHead>Согласовант</TableHead>
                          <TableHead>Причина</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredHistory.map((h: any) => (
                          <TableRow key={h._id}>
                            <TableCell className="text-sm whitespace-nowrap">
                              {new Date(h.createdAt).toLocaleString('ru-RU')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">
                                {h.entityType === 'item' ? 'Лот' : 'Пользователь'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                {h.entityType === 'item' ? (
                                  <>
                                    <p className="font-medium text-sm">{h.entityName || 'Без названия'}</p>
                                    <p className="text-xs text-gray-500">Владелец: {h.user.name}</p>
                                  </>
                                ) : (
                                  <>
                                    <p className="font-medium text-sm">{h.user.name}</p>
                                    <p className="text-xs text-gray-500">{h.user.phone}</p>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {h.action === 'approve' ? (
                                <Badge variant="secondary" className="bg-green-100 text-green-700">Одобрено</Badge>
                              ) : h.action === 'reject' ? (
                                <Badge variant="destructive">Отклонено</Badge>
                              ) : (
                                <Badge variant="outline">{h.action}</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm">{h.editor.name}</TableCell>
                            <TableCell className="text-sm text-gray-500 max-w-[200px] truncate">
                              {h.reason || '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    {filteredHistory.length === 0 && (
                      <p className="text-center text-gray-500 py-4">Ничего не найдено</p>
                    )}
                    </>
                  )}
                </CardContent>
              </Card>
            ) : (
            /* Pending tab (default, shown for both admin and moderator) */
            <Card>
              <CardHeader>
                <CardTitle>Верификация пользователей</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative mb-4">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    value={verificationSearch}
                    onChange={(e) => setVerificationSearch(e.target.value)}
                    placeholder="Поиск по имени, телефону или лоту..."
                    className="pl-9"
                  />
                </div>
                <div className="space-y-4">
                  {filteredPendingUsers.map((user) => (
                    <div key={user._id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{user.name}</p>
                          <p className="text-sm text-gray-600">{user.phone}</p>
                          {user.document_type && (
                            <p className="text-xs text-gray-500 mt-1">
                              <FileText className="w-3 h-3 inline mr-1" />
                              {user.document_type === 'passport' ? 'Паспорт' : user.document_type === 'driver_license' ? 'Вод. удостоверение' : 'Другой документ'}
                            </p>
                          )}
                          {(user as any).owner_type && (user as any).owner_type !== 'individual' && (
                            <p className="text-xs text-gray-500 mt-1">
                              <Building2 className="w-3 h-3 inline mr-1" />
                              {(user as any).owner_type === 'ip' ? 'ИП' : 'Юр. лицо'}
                              {(user as any).company_name && ` — ${(user as any).company_name}`}
                            </p>
                          )}
                          {((user as any).inn || (user as any).ogrn) && (
                            <p className="text-xs text-gray-500 mt-1">
                              ИНН: {(user as any).inn || '—'} | ОГРН: {(user as any).ogrn || '—'}
                            </p>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Подано: {user.verification_submitted_at ? new Date(user.verification_submitted_at).toLocaleString() : 'Неизвестно'}
                          </p>
                        </div>
                        {user.document_path && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(user.document_path!, '_blank')}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            Документ
                          </Button>
                        )}
                      </div>

                      {/* Document preview thumbnail */}
                      {user.document_path && (
                        <div
                          className="cursor-pointer border rounded-lg overflow-hidden max-w-[200px]"
                          onClick={() => window.open(user.document_path!, '_blank')}
                        >
                          <img
                            src={user.document_path}
                            alt="Документ"
                            className="w-full h-24 object-cover hover:opacity-80 transition-opacity"
                          />
                        </div>
                      )}

                      {/* Rejection reason input */}
                      {rejectingUserId === user._id && (
                        <div className="space-y-2">
                          <Textarea
                            placeholder="Причина отклонения (необязательно)"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            rows={2}
                          />
                        </div>
                      )}

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => verifyUser(user._id, 'approve')}
                          disabled={verifyingUserId === user._id}
                        >
                          {verifyingUserId === user._id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <UserCheck className="w-4 h-4 mr-1" />
                          )}
                          Одобрить
                        </Button>
                        {rejectingUserId === user._id ? (
                          <>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => verifyUser(user._id, 'reject', rejectionReason || undefined)}
                              disabled={verifyingUserId === user._id}
                            >
                              {verifyingUserId === user._id ? (
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                              ) : (
                                <UserX className="w-4 h-4 mr-1" />
                              )}
                              Подтвердить отклонение
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setRejectingUserId(null); setRejectionReason(''); }}
                            >
                              Отмена
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => setRejectingUserId(user._id)}
                            disabled={verifyingUserId === user._id}
                          >
                            <UserX className="w-4 h-4 mr-1" />
                            Отклонить
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {pendingUsers.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Нет пользователей на проверке</p>
                  )}
                </div>
              </CardContent>
            </Card>
            )}

            {/* Модерация лотов — скрыта когда открыта История */}
            {!(currentUser?.role === 'admin' && verificationSubTab === 'history') && (
            <Card>
              <CardHeader>
                <CardTitle>Модерация лотов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredPendingItems.map((item) => (
                    <div key={item._id} className="flex items-start justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        <div className="flex items-center gap-4 mt-2 text-sm">
                          <span>Владелец: {item.owner_name}</span>
                          <span>Цена: {item.price_per_day} ₽/день</span>
                          <span>Залог: {item.deposit} ₽</span>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => moderateItem(item._id, 'approved')}
                          disabled={moderatingItemId === item._id}
                        >
                          {moderatingItemId === item._id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <Package className="w-4 h-4 mr-1" />
                          )}
                          Одобрить
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => moderateItem(item._id, 'rejected')}
                          disabled={moderatingItemId === item._id}
                        >
                          {moderatingItemId === item._id ? (
                            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 mr-1" />
                          )}
                          Отклонить
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingItems.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Нет лотов на проверке</p>
                  )}
                </div>
              </CardContent>
            </Card>
            )}
          </div>
          )}
        </TabsContent>

        {currentUser?.role === 'admin' && (
          <TabsContent value="users">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Все пользователи</h2>
                <Button onClick={() => setShowAdminUserModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Добавить пользователя
                </Button>
              </div>
              <Card>
                <CardContent>
                  <div className="flex flex-wrap gap-2 mb-4 pt-4">
                    <div className="relative flex-1 min-w-[200px]">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <Input
                        value={usersSearch}
                        onChange={(e) => setUsersSearch(e.target.value)}
                        placeholder="Поиск по имени, email, телефону..."
                        className="pl-9"
                      />
                    </div>
                    <Select value={usersRoleFilter} onValueChange={setUsersRoleFilter}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Роль" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Все роли</SelectItem>
                        <SelectItem value="renter">Арендатор</SelectItem>
                        <SelectItem value="owner">Арендодатель</SelectItem>
                        <SelectItem value="moderator">Модератор</SelectItem>
                        <SelectItem value="admin">Админ</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {isLoading ? (
                    <SkeletonTable rows={5} />
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Имя</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Телефон</TableHead>
                              <TableHead>Роль</TableHead>
                              <TableHead>Рейтинг</TableHead>
                              <TableHead>Статус</TableHead>
                              <TableHead>Зарегистрирован</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredAllUsers.map((user) => (
                              <TableRow key={user._id}>
                                <TableCell className="font-medium">{user.name}</TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>{user.phone}</TableCell>
                                <TableCell>{getRoleBadge(user.role)}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                                    <span>{user.rating?.toFixed(1)}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  {user.is_verified ? (
                                    <Badge variant="secondary">Верифицирован</Badge>
                                  ) : (
                                    <Badge variant="outline">Не верифицирован</Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {new Date(user.createdAt).toLocaleDateString()}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                      {allUsers.length === 0 && (
                        <div className="text-center py-8">
                          <Users className="w-12 h-12 mx-auto text-gray-400" />
                          <p className="text-gray-500 mt-2">Пользователи не найдены</p>
                        </div>
                      )}
                      {allUsers.length < allUsersTotal && (
                        <div className="text-center py-4">
                          <Button variant="outline" onClick={loadMoreUsers} disabled={isLoadingMore}>
                            {isLoadingMore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Загрузить ещё ({allUsers.length} из {allUsersTotal})
                          </Button>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            {showAdminUserModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg max-w-md w-full mx-4">
                  <div className="p-6">
                    <h2 className="text-2xl font-bold mb-4">Создать пользователя</h2>
                    <p className="text-gray-500 mb-6">Заполните информацию о новом пользователе</p>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Имя</label>
                        <input
                          type="text"
                          value={newAdminUser.name}
                          onChange={(e) => setNewAdminUser({ ...newAdminUser, name: e.target.value })}
                          placeholder="Иван Иванов"
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Телефон</label>
                        <input
                          type="tel"
                          value={newAdminUser.phone}
                          onChange={(e) => setNewAdminUser({ ...newAdminUser, phone: e.target.value })}
                          placeholder="+7 (999) 123-45-67"
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                          type="email"
                          value={newAdminUser.email}
                          onChange={(e) => setNewAdminUser({ ...newAdminUser, email: e.target.value })}
                          placeholder="example@mail.com"
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
                        <input
                          type="password"
                          value={newAdminUser.password}
                          onChange={(e) => setNewAdminUser({ ...newAdminUser, password: e.target.value })}
                          placeholder="••••••••"
                          className="w-full px-3 py-2 border rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
                        <select
                          value={newAdminUser.role}
                          onChange={(e) => setNewAdminUser({ ...newAdminUser, role: e.target.value as UserRole })}
                          className="w-full px-3 py-2 border rounded-md"
                        >
                          <option value="renter">Арендатор</option>
                          <option value="owner">Арендодатель</option>
                          <option value="moderator">Модератор</option>
                          <option value="admin">Администратор</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-8 flex justify-end gap-3">
                      <Button variant="outline" onClick={() => setShowAdminUserModal(false)} disabled={isCreating}>
                        Отмена
                      </Button>
                      <Button onClick={createUser} disabled={isCreating}>
                        {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isCreating ? 'Создание...' : 'Создать пользователя'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
