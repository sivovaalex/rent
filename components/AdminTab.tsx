'use client';
import { useState, useEffect, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BarChart, ThumbsUp, Users, Plus, Star, UserCheck, UserX, Package, AlertTriangle } from 'lucide-react';
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
}

export default function AdminTab({ currentUser, showAlert, loadAdminData, pendingUsers, pendingItems, stats, allUsers }: AdminTabProps) {
  const [adminSubTab, setAdminSubTab] = useState('stats');
  const [showAdminUserModal, setShowAdminUserModal] = useState(false);
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

  const verifyUser = async (userId: string, action: 'approve' | 'reject') => {
    if (!currentUser) return;

    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        showAlert(`Пользователь ${action === 'approve' ? 'верифицирован' : 'отклонён'}`);
        loadAdminData();
      }
    } catch {
      showAlert('Ошибка модерации', 'error');
    }
  };

  const moderateItem = async (itemId: string, action: 'approve' | 'reject') => {
    if (!currentUser) return;

    try {
      const res = await fetch(`/api/admin/items/${itemId}/moderate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify({ action })
      });
      if (res.ok) {
        showAlert(`Лот ${action === 'approve' ? 'одобрен' : 'отклонён'}`);
        loadAdminData();
      }
    } catch {
      showAlert('Ошибка модерации', 'error');
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

    try {
      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
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
          {currentUser?.role === 'admin' && stats && (
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
          )}
        </TabsContent>

        <TabsContent value="verification">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Верификация пользователей</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingUsers.map((user) => (
                    <div key={user._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-gray-600">{user.phone}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Подано: {user.verification_submitted_at ? new Date(user.verification_submitted_at).toLocaleString() : 'Неизвестно'}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => verifyUser(user._id, 'approve')}>
                          <UserCheck className="w-4 h-4 mr-1" />
                          Одобрить
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => verifyUser(user._id, 'reject')}>
                          <UserX className="w-4 h-4 mr-1" />
                          Отклонить
                        </Button>
                      </div>
                    </div>
                  ))}
                  {pendingUsers.length === 0 && (
                    <p className="text-center text-gray-500 py-4">Нет пользователей на проверке</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Модерация лотов</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingItems.map((item) => (
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
                        <Button size="sm" onClick={() => moderateItem(item._id, 'approve')}>
                          <Package className="w-4 h-4 mr-1" />
                          Одобрить
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => moderateItem(item._id, 'reject')}>
                          <AlertTriangle className="w-4 h-4 mr-1" />
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
          </div>
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
                        {allUsers.map((user) => (
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
                      <Button variant="outline" onClick={() => setShowAdminUserModal(false)}>
                        Отмена
                      </Button>
                      <Button onClick={createUser}>Создать пользователя</Button>
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
