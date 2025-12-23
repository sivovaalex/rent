'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Star, Upload, Calendar, Phone, Shield, Package, Zap, Shirt, Camera, CheckCircle, AlertCircle, User, Settings, BarChart, Plus, Eye, EyeOff, Edit2 } from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [currentTab, setCurrentTab] = useState('catalog');
  const [items, setItems] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Auth state
  const [showAuth, setShowAuth] = useState(true);
  const [authStep, setAuthStep] = useState('login'); // 'phone', 'code', 'verify', 'login'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('renter'); // по умолчанию
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  
  // Catalog view
  const [catalogView, setCatalogView] = useState('all'); // 'all' или 'mine'
  const [showAllStatuses, setShowAllStatuses] = useState(false); // для отображения всех статусов в "Мои"
  
  // Modal state
  const [showItemModal, setShowItemModal] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [blockedBookingDates, setBlockedBookingDates] = useState([]);
  const [showAdminUserModal, setShowAdminUserModal] = useState(false);
  
  // New item form
  const [newItem, setNewItem] = useState({
    category: 'stream',
    subcategory: '',
    title: '',
    description: '',
    price_per_day: '',
    price_per_month: '',
    deposit: '',
    address: '',
    attributes: {}
  });
  
  // Admin user form
  const [newAdminUser, setNewAdminUser] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    role: 'renter'
  });
  
  // Booking form
  const [bookingForm, setBookingForm] = useState({
    start_date: '',
    end_date: '',
    rental_type: 'day',
    is_insured: false
  });
  
  // Review form
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    text: ''
  });
  
  const [alert, setAlert] = useState(null);
  
  // Подкатегории для каждой категории
  const categorySubcategories = {
    stream: ['Микрофоны', 'Камеры', 'Освещение', 'Звуковое оборудование', 'Триподы'],
    electronics: ['Телефоны', 'Ноутбуки', 'Планшеты', 'Фотоаппараты', 'Аудиотехника'],
    clothing: ['Верхняя одежда', 'Обувь', 'Аксессуары', 'Спортивная одежда', 'Одежда для мероприятий'],
    sports: ['Велосипеды', 'Лыжи', 'Сноуборды', 'Спортивные залы', 'Инвентарь'],
    tools: ['Строительные', 'Садовые', 'Ручные инструменты', 'Электроинструменты', 'Измерительные приборы']
  };

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      fetch('/api/auth/me', {
        headers: { 'x-user-id': user._id }
      })
        .then(res => res.json())
        .then(data => {
          if (data.user) {
            setCurrentUser(data.user);
            localStorage.setItem('user', JSON.stringify(data.user));
            setShowAuth(false);
            if (data.user.is_verified) {
              loadItems();
            }
          } else {
            localStorage.removeItem('user');
            setShowAuth(true);
          }
        })
        .catch(() => {
          setCurrentUser(user);
          setShowAuth(false);
          if (user.is_verified) loadItems();
        });
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      if (currentTab === 'catalog') {
        loadItems();
      } else if (currentTab === 'bookings') {
        loadBookings();
      } else if (currentTab === 'admin') {
        loadAdminData();
      }
    }
  }, [currentTab, currentUser, catalogView, showAllStatuses]);

  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  // Auth functions
  const sendSMS = async () => {
    try {
      const res = await fetch('/api/auth/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone })
      });
      const data = await res.json();
      if (res.ok) {
        setAuthStep('code');
        showAlert('Код отправлен в консоль (мок-режим)');
      } else {
        showAlert(data.error, 'error');
      }
    } catch (error) {
      showAlert('Ошибка отправки SMS', 'error');
    }
  };

  const verifySMS = async () => {
    try {
      const res = await fetch('/api/auth/verify-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code, name, email, password, role })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setShowAuth(false);
        if (!data.user.is_verified) {
          setAuthStep('verify');
          setShowAuth(true);
        } else {
          loadItems();
        }
      } else {
        showAlert(data.error, 'error');
      }
    } catch (error) {
      showAlert('Ошибка верификации', 'error');
    }
  };

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  };

  const uploadDocument = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const res = await fetch('/api/auth/upload-document', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': currentUser._id
          },
          body: JSON.stringify({
            documentData: event.target.result,
            documentType: 'passport'
          })
        });
        const data = await res.json();
        if (res.ok) {
          showAlert('Документ загружен! Ожидайте проверки модератора.');
          const userRes = await fetch('/api/auth/me', {
            headers: { 'x-user-id': currentUser._id }
          });
          const userData = await userRes.json();
          if (userRes.ok && userData.user) {
            setCurrentUser(userData.user);
            localStorage.setItem('user', JSON.stringify(userData.user));
            if (userData.user.is_verified) {
              setShowAuth(false);
              loadItems();
            }
          }
        }
      } catch (error) {
        showAlert('Ошибка загрузки документа', 'error');
      }
    };
    reader.readAsDataURL(file);
  };

  // Load functions
  const loadItems = async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (subCategoryFilter !== 'all') params.append('subcategory', subCategoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sort', sortBy);
      
      // Параметры для фильтрации по владельцу и статусу
      if (catalogView === 'mine' && currentUser) {
        params.append('owner_id', currentUser._id);
        if (showAllStatuses) {
          params.append('show_all_statuses', 'true');
        }
      }

      const res = await fetch(`/api/items?${params}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }
  };

  const loadBookings = async () => {
    try {
      const res = await fetch('/api/bookings', {
        headers: { 'x-user-id': currentUser._id }
      });
      const data = await res.json();
      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    }
  };

  const loadBlockedBookingDates = async (itemId) => {
    try {
      const res = await fetch(`/api/items/${itemId}/blocked-booking-dates`);
      const data = await res.json();
      if (res.ok) {
        setBlockedBookingDates(data.dates || []);
      }
    } catch (error) {
      console.error('Error loading blocked dates:', error);
    }
  };

  const loadAdminData = async () => {
    try {
      const [usersRes, itemsRes, statsRes] = await Promise.all([
        fetch('/api/admin/users?status=pending', {
          headers: { 'x-user-id': currentUser._id }
        }),
        fetch('/api/admin/items?status=pending', {
          headers: { 'x-user-id': currentUser._id }
        }),
        fetch('/api/admin/stats', {
          headers: { 'x-user-id': currentUser._id }
        })
      ]);
      const usersData = await usersRes.json();
      const itemsData = await itemsRes.json();
      const statsData = await statsRes.json();
      if (usersRes.ok) setPendingUsers(usersData.users || []);
      if (itemsRes.ok) setPendingItems(itemsData.items || []);
      if (statsRes.ok) setStats(statsData);
    } catch (error) {
      console.error('Error loading admin data:', error);
    }
  };

  // Item functions
  const createItem = async () => {
    try {
      const res = await fetch('/api/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify(newItem)
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Лот создан и отправлен на модерацию');
        setShowItemModal(false);
        setNewItem({
          category: 'stream',
          subcategory: '',
          title: '',
          description: '',
          price_per_day: '',
          price_per_month: '',
          deposit: '',
          address: '',
          attributes: {}
        });
        loadItems();
      } else {
        showAlert(data.error, 'error');
      }
    } catch (error) {
      showAlert('Ошибка создания лота', 'error');
    }
  };

  const publishItem = async (itemId) => {
    try {
      const res = await fetch(`/api/items/${itemId}/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        }
      });
      if (res.ok) {
        showAlert('Лот опубликован');
        loadItems();
      } else {
        const data = await res.json();
        showAlert(data.error, 'error');
      }
    } catch (error) {
      showAlert('Ошибка публикации', 'error');
    }
  };

  const unpublishItem = async (itemId) => {
    try {
      const res = await fetch(`/api/items/${itemId}/unpublish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        }
      });
      if (res.ok) {
        showAlert('Лот снят с публикации');
        loadItems();
      } else {
        const data = await res.json();
        showAlert(data.error, 'error');
      }
    } catch (error) {
      showAlert('Ошибка снятия с публикации', 'error');
    }
  };

  const bookItem = async () => {
    try {
      const res = await fetch(`/api/items/${selectedItem._id}/book`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify(bookingForm)
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Бронирование создано! Мок-платёж выполнен успешно.');
        setShowBookingModal(false);
        setSelectedItem(null);
        setBookingForm({
          start_date: '',
          end_date: '',
          rental_type: 'day',
          is_insured: false
        });
        loadBookings();
      } else {
        showAlert(data.error, 'error');
      }
    } catch (error) {
      showAlert('Ошибка бронирования', 'error');
    }
  };

  const confirmReturn = async (bookingId) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/confirm-return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Возврат подтверждён! Залог возвращён.');
        loadBookings();
      } else {
        showAlert(data.error, 'error');
      }
    } catch (error) {
      showAlert('Ошибка подтверждения возврата', 'error');
    }
  };

  const createReview = async () => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify({
          booking_id: selectedBooking._id,
          item_id: selectedBooking.item_id,
          ...reviewForm
        })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Отзыв добавлен!');
        setShowReviewModal(false);
        setSelectedBooking(null);
        setReviewForm({ rating: 5, text: '' });
        loadBookings(); // Обновляем список бронирований
      } else {
        showAlert(data.error, 'error');
      }
    } catch (error) {
      showAlert('Ошибка добавления отзыва', 'error');
    }
  };

  // Admin functions
  const verifyUser = async (userId, action) => {
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
    } catch (error) {
      showAlert('Ошибка модерации', 'error');
    }
  };

  const moderateItem = async (itemId, action) => {
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
    } catch (error) {
      showAlert('Ошибка модерации', 'error');
    }
  };

  const createUser = async () => {
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
    } catch (error) {
      showAlert('Ошибка создания пользователя', 'error');
    }
  };

  const loginByEmail = async () => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setShowAuth(false);
        loadItems();
      } else {
        showAlert(data.error, 'error');
      }
    } catch (error) {
      showAlert('Ошибка входа', 'error');
    }
  };

  const updateRole = async (newRole) => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify({ role: newRole })
      });
      if (res.ok) {
        const updatedUser = { ...currentUser, role: newRole };
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        showAlert('Роль изменена!');
      }
    } catch (error) {
      showAlert('Ошибка изменения роли', 'error');
    }
  };

  // UI functions
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved':
        return <Badge variant="success" className="text-xs">Опубликован</Badge>;
      case 'pending':
        return <Badge variant="warning" className="text-xs">На модерации</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="text-xs">Отклонен</Badge>;
      case 'draft':
        return <Badge variant="outline" className="text-xs">Снят</Badge>;
      default:
        return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'stream':
        return <Zap className="w-4 h-4" />;
      case 'electronics':
        return <Camera className="w-4 h-4" />;
      case 'clothing':
        return <Shirt className="w-4 h-4" />;
      case 'sports':
        return <Shirt className="w-4 h-4" />;
      case 'tools':
        return <Shirt className="w-4 h-4" />;
      default:
        return <Package className="w-4 h-4" />;
    }
  };

  const getCategoryName = (category) => {
    switch (category) {
      case 'stream':
        return 'Стрим-оборудование';
      case 'electronics':
        return 'Электроника';
      case 'clothing':
        return 'Одежда';
      case 'sports':
        return 'Спорт';
      case 'tools':
        return 'Инструменты';
      default:
        return category;
    }
  };

  // Auth modal
  if (showAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold text-indigo-600">Аренда PRO</CardTitle>
            <CardDescription>Единая шеринг-платформа</CardDescription>
          </CardHeader>
          <CardContent>
            {authStep === 'phone' && (<>
              <h3 className="text-center">Регистрация</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="phone">Номер телефона</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+7 (999) 123-45-67"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <Button onClick={sendSMS} className="w-full">
                  <Phone className="w-4 h-4 mr-2" />
                  Получить код
                </Button>
              </div>
              <div className="text-center text-sm text-gray-500">
                или{' '}
                <button
                  type="button"
                  onClick={() => setAuthStep('login')}
                  className="text-indigo-600 hover:underline"
                >
                  войти по почте
                </button>
              </div>
            </>)}
            {authStep === 'code' && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Ваше имя</Label>
                  <Input
                    id="name"
                    placeholder="Иван Иванов"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="example@mail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="role">Роль</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="renter">Арендатор</SelectItem>
                      <SelectItem value="owner">Арендодатель</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="code">Код из SMS</Label>
                  <Input
                    id="code"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <Button onClick={verifySMS} className="w-full">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Войти
                </Button>
              </div>
            )}
            {authStep === 'verify' && (
              <div className="space-y-4">
                <Alert>
                  <Shield className="w-4 h-4" />
                  <AlertDescription>
                    Для доступа к функциям платформы загрузите скан паспорта или СНИЛС.
                    Документы хранятся в зашифрованном виде (AES-256).
                  </AlertDescription>
                </Alert>
                <div>
                  <Label htmlFor="document">Документ</Label>
                  <Input
                    id="document"
                    type="file"
                    accept="image/*"
                    onChange={uploadDocument}
                  />
                </div>
                <Button onClick={() => setShowAuth(false)} variant="outline" className="w-full">
                  Загрузить позже
                </Button>
              </div>
            )}
            {authStep === 'login' && (<>
              <h3 className="text-center">Вход</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="loginEmail">Email</Label>
                  <Input
                    id="loginEmail"
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="loginPassword">Пароль</Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                  />
                </div>
                <Button onClick={loginByEmail} className="w-full">
                  Войти
                </Button>
                <Button variant="outline" onClick={() => setAuthStep('phone')} className="w-full">
                  Регистрация
                </Button>
              </div>
            </>)}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-indigo-600">Аренда PRO</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm font-medium">{currentUser?.name}</p>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs">
                    {currentUser?.role === 'renter' && 'Арендатор'}
                    {currentUser?.role === 'owner' && 'Арендодатель'}
                    {currentUser?.role === 'moderator' && 'Модератор'}
                    {currentUser?.role === 'admin' && 'Администратор'}
                  </Badge>
                  {currentUser?.is_verified && (
                    <Badge variant="success" className="text-xs">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Верифицирован
                    </Badge>
                  )}
                </div>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={() => {
              localStorage.removeItem('user');
              setCurrentUser(null);
              setShowAuth(true);
            }}>
              Выйти
            </Button>
          </div>
        </div>
      </header>
      
      {/* Alert */}
      {alert && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-top">
          <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
            {alert.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <AlertDescription>{alert.message}</AlertDescription>
          </Alert>
        </div>
      )}
      
      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="catalog">
              <Package className="w-4 h-4 mr-2" />
              Каталог
            </TabsTrigger>
            <TabsTrigger value="bookings">
              <Calendar className="w-4 h-4 mr-2" />
              Мои аренды
            </TabsTrigger>
            <TabsTrigger value="profile">
              <Settings className="w-4 h-4 mr-2" />
              Профиль
            </TabsTrigger>
            {(currentUser?.role === 'moderator' || currentUser?.role === 'admin') && (
              <TabsTrigger value="admin">
                <BarChart className="w-4 h-4 mr-2" />
                Админ
              </TabsTrigger>
            )}
          </TabsList>
          
          {/* Catalog Tab */}
          <TabsContent value="catalog" className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => setCatalogView('all')}
                  className={`px-4 py-2 font-medium ${catalogView === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                >
                  Все лоты
                </button>
                <button
                  onClick={() => setCatalogView('mine')}
                  className={`px-4 py-2 font-medium ${catalogView === 'mine' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
                >
                  Мои лоты
                </button>
              </div>
              
              {catalogView === 'mine' && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="showAllStatuses"
                    checked={showAllStatuses}
                    onCheckedChange={(checked) => setShowAllStatuses(checked)}
                  />
                  <Label htmlFor="showAllStatuses" className="text-sm">Показать все статусы</Label>
                </div>
              )}
            </div>
            
            <div className="flex flex-col lg:flex-row gap-4">
              <Input
                placeholder="Поиск по названию или описанию..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyUp={(e) => e.key === 'Enter' && loadItems()}
                className="flex-1"
              />
              <Select value={categoryFilter} onValueChange={(value) => {
                setCategoryFilter(value);
                setSubCategoryFilter('all');
              }}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все категории</SelectItem>
                  <SelectItem value="stream">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4" />
                      Стрим-оборудование
                    </div>
                  </SelectItem>
                  <SelectItem value="electronics">
                    <div className="flex items-center gap-2">
                      <Camera className="w-4 h-4" />
                      Электроника
                    </div>
                  </SelectItem>
                  <SelectItem value="clothing">
                    <div className="flex items-center gap-2">
                      <Shirt className="w-4 h-4" />
                      Одежда
                    </div>
                  </SelectItem>
                  <SelectItem value="sports">
                    <div className="flex items-center gap-2">
                      <Shirt className="w-4 h-4" />
                      Спорт
                    </div>
                  </SelectItem>
                  <SelectItem value="tools">
                    <div className="flex items-center gap-2">
                      <Shirt className="w-4 h-4" />
                      Инструменты
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {categoryFilter !== 'all' && (
                <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
                  <SelectTrigger className="w-full lg:w-[200px]">
                    <SelectValue placeholder="Подкатегория" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все подкатегории</SelectItem>
                    {categorySubcategories[categoryFilter]?.map((subcat) => (
                      <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-full lg:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Новые</SelectItem>
                  <SelectItem value="price_asc">Цена ↑</SelectItem>
                  <SelectItem value="price_desc">Цена ↓</SelectItem>
                  <SelectItem value="rating">Рейтинг</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={loadItems}>Поиск</Button>
            </div>
            
            {currentUser?.is_verified && catalogView === 'mine' && (
              <Button onClick={() => setShowItemModal(true)} className="w-full lg:w-auto">
                <Upload className="w-4 h-4 mr-2" />
                Разместить лот
              </Button>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {items.map((item) => (
                <Card key={item._id} className="hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{item.title}</CardTitle>
                        <CardDescription className="flex flex-col gap-1 mt-1">
                          <div className="flex items-center gap-1">
                            {getCategoryIcon(item.category)}
                            <span>{getCategoryName(item.category)}</span>
                            {item.subcategory && (
                              <span className="text-xs text-gray-500">({item.subcategory})</span>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1 text-yellow-500">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-medium">{item.owner_rating?.toFixed(1) || '5.0'}</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>
                    <div className="space-y-2">
                      {item.price_per_day && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">За день:</span>
                          <span className="font-semibold">{item.price_per_day} ₽</span>
                        </div>
                      )}
                      {item.price_per_month && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">За месяц:</span>
                          <span className="font-semibold">{item.price_per_month} ₽</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Залог:</span>
                        <span className="font-medium">{item.deposit} ₽</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-2">
                        Владелец: {item.owner_name}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                    {/* Статус лота */}
                    <div className="w-full flex justify-end">
                      {getStatusBadge(item.status)}
                    </div>
                    
                    <div className="w-full flex gap-2">
                      {/* Кнопки управления для владельца/модератора/админа */}
                      {((currentUser?.role === 'owner' && item.owner_id === currentUser._id) || 
                        currentUser?.role === 'moderator' || 
                        currentUser?.role === 'admin') && (
                        <div className="w-full flex gap-2">
                          {item.status === 'approved' ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await unpublishItem(item._id);
                              }}
                            >
                              <EyeOff className="w-4 h-4 mr-1" />
                              Скрыть
                            </Button>
                          ) : (item.status === 'draft' || item.status === 'rejected') && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="flex-1"
                              onClick={async (e) => {
                                e.stopPropagation();
                                await publishItem(item._id);
                              }}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Опубликовать
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {/* Кнопка бронирования */}
                      {(!((currentUser?.role === 'owner' && item.owner_id === currentUser._id) || 
                        currentUser?.role === 'moderator' || 
                        currentUser?.role === 'admin') || 
                        item.status === 'approved') && (
                        <Button
                          onClick={() => {
                            if (!currentUser?.is_verified) {
                              showAlert('Требуется верификация', 'error');
                              return;
                            }
                            setSelectedItem(item);
                            setShowBookingModal(true);
                            loadBlockedBookingDates(item._id);
                          }}
                          className="w-full"
                          disabled={item.status !== 'approved'}
                        >
                          {item.status !== 'approved' ? 'Лот не доступен' : 'Забронировать'}
                        </Button>
                      )}
                    </div>
                  </CardFooter>
                </Card>
              ))}
            </div>
            
            {items.length === 0 && (
              <div className="text-center py-12">
                <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">
                  {catalogView === 'mine' ? 'У вас пока нет лотов' : 'Лотов не найдено'}
                </p>
              </div>
            )}
          </TabsContent>
          
          {/* Bookings Tab */}
          <TabsContent value="bookings" className="space-y-6">
            <div className="grid grid-cols-1 gap-4">
              {bookings.map((booking) => (
                <Card key={booking._id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{booking.item?.title}</CardTitle>
                        <CardDescription>
                          {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                        </CardDescription>
                      </div>
                      <Badge variant={booking.status === 'completed' ? 'success' : 'default'}>
                        {booking.status === 'paid' && 'Оплачено'}
                        {booking.status === 'completed' && 'Завершено'}
                        {booking.status === 'pending_payment' && 'Ожидает оплаты'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Аренда:</span>
                        <span>{booking.rental_price} ₽</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Залог:</span>
                        <span>{booking.deposit} ₽</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Комиссия:</span>
                        <span>{booking.commission} ₽</span>
                      </div>
                      {booking.insurance > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Страховка:</span>
                          <span>{booking.insurance} ₽</span>
                        </div>
                      )}
                      <div className="flex justify-between font-semibold pt-2 border-t">
                        <span>Итого:</span>
                        <span>{booking.total_price} ₽</span>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex gap-2">
                    {booking.status === 'paid' && booking.item?.owner_id === currentUser._id && (
                      <Button onClick={() => confirmReturn(booking._id)} className="flex-1">
                        Подтвердить возврат
                      </Button>
                    )}
                    {booking.status === 'completed' && booking.renter_id === currentUser._id && (
                      booking.review ? (
                        <div className="flex items-center gap-1 text-yellow-500 flex-1 justify-center">
                          <Star className="w-4 h-4 fill-current" />
                          <span>{booking.review.rating}/5</span>
                          <span className="text-gray-500 text-sm">(отзыв оставлен)</span>
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            setSelectedBooking(booking);
                            setShowReviewModal(true);
                          }}
                          className="flex-1"
                        >
                          Оставить отзыв
                        </Button>
                      )
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
            {bookings.length === 0 && (
              <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500">У вас пока нет бронирований</p>
              </div>
            )}
          </TabsContent>
          
          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Профиль пользователя</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Имя</Label>
                  <p className="text-lg font-medium">{currentUser?.name}</p>
                </div>
                <div>
                  <Label>Телефон</Label>
                  <p className="text-lg font-medium">{currentUser?.phone}</p>
                </div>
                <div>
                  <Label>Роль</Label>
                  <p className="text-lg font-medium mt-1">
                    {currentUser?.role === 'renter' && 'Арендатор'}
                    {currentUser?.role === 'owner' && 'Арендодатель'}
                    {currentUser?.role === 'moderator' && 'Модератор'}
                    {currentUser?.role === 'admin' && 'Администратор'}
                  </p>
                </div>
                <div>
                  <Label>Рейтинг</Label>
                  <div className="flex items-center gap-2 mt-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="text-lg font-medium">{currentUser?.rating?.toFixed(2) || '5.00'}</span>
                  </div>
                </div>
                <div>
                  <Label>Статус верификации</Label>
                  <div className="mt-1">
                    {currentUser?.is_verified ? (
                      <Badge variant="success">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Верифицирован
                      </Badge>
                    ) : (
                      <Badge variant="outline">
                        <AlertCircle className="w-4 h-4 mr-1" />
                        {currentUser?.verification_status === 'pending'
                          ? 'Требуется верификация (на проверке)'
                          : 'Требуется верификация'}
                      </Badge>
                    )}
                  </div>
                </div>
                {!currentUser?.is_verified && currentUser?.verification_status !== 'pending' && (
                  <Button onClick={() => {
                    setAuthStep('verify');
                    setShowAuth(true);
                  }}>
                    <Shield className="w-4 h-4 mr-2" />
                    Пройти верификацию
                  </Button>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          
          {/* Admin Tab */}
          {(currentUser?.role === 'moderator' || currentUser?.role === 'admin') && (
            <TabsContent value="admin" className="space-y-6">
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
              
              {currentUser?.role === 'admin' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Создание пользователя</CardTitle>
                    <CardDescription>Создайте нового пользователя с любой ролью</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => setShowAdminUserModal(true)} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Создать пользователя
                    </Button>
                  </CardContent>
                </Card>
              )}
              
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
                            Подано: {new Date(user.verification_submitted_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => verifyUser(user._id, 'approve')}>
                            Одобрить
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => verifyUser(user._id, 'reject')}>
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
                            Одобрить
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => moderateItem(item._id, 'reject')}>
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
            </TabsContent>
          )}
        </Tabs>
      </div>
      
      {/* Create Item Modal */}
      <Dialog open={showItemModal} onOpenChange={setShowItemModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Создать лот</DialogTitle>
            <DialogDescription>Заполните информацию о предмете для аренды</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Категория</Label>
              <Select
                value={newItem.category}
                onValueChange={(value) => {
                  setNewItem({ ...newItem, category: value, subcategory: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stream">Стрим-оборудование</SelectItem>
                  <SelectItem value="electronics">Электроника</SelectItem>
                  <SelectItem value="clothing">Одежда</SelectItem>
                  <SelectItem value="sports">Спорт</SelectItem>
                  <SelectItem value="tools">Инструменты</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {newItem.category && (
              <div>
                <Label>Подкатегория</Label>
                <Select
                  value={newItem.subcategory || ''}
                  onValueChange={(value) => setNewItem({ ...newItem, subcategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите подкатегорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorySubcategories[newItem.category].map((subcat) => (
                      <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <Label>Название</Label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Например: Микрофон Blue Yeti"
              />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Подробное описание состояния и характеристик"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Цена за день (₽)</Label>
                <Input
                  type="number"
                  value={newItem.price_per_day}
                  onChange={(e) => setNewItem({ ...newItem, price_per_day: parseFloat(e.target.value) || '' })}
                />
              </div>
              <div>
                <Label>Цена за месяц (₽)</Label>
                <Input
                  type="number"
                  value={newItem.price_per_month}
                  onChange={(e) => setNewItem({ ...newItem, price_per_month: parseFloat(e.target.value) || '' })}
                />
              </div>
            </div>
            <div>
              <Label>Залог (₽)</Label>
              <Input
                type="number"
                value={newItem.deposit}
                onChange={(e) => setNewItem({ ...newItem, deposit: parseFloat(e.target.value) || '' })}
              />
            </div>
            <div>
              <Label>Адрес самовывоза</Label>
              <Input
                value={newItem.address}
                onChange={(e) => setNewItem({ ...newItem, address: e.target.value })}
                placeholder="Москва, ул. Примерная, д. 1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowItemModal(false)}>
              Отмена
            </Button>
            <Button onClick={createItem}>Создать лот</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Admin User Modal */}
      <Dialog open={showAdminUserModal} onOpenChange={setShowAdminUserModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Создать пользователя</DialogTitle>
            <DialogDescription>Заполните информацию о новом пользователе</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Имя</Label>
              <Input
                value={newAdminUser.name}
                onChange={(e) => setNewAdminUser({ ...newAdminUser, name: e.target.value })}
                placeholder="Иван Иванов"
              />
            </div>
            <div>
              <Label>Телефон</Label>
              <Input
                value={newAdminUser.phone}
                onChange={(e) => setNewAdminUser({ ...newAdminUser, phone: e.target.value })}
                placeholder="+7 (999) 123-45-67"
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                value={newAdminUser.email}
                onChange={(e) => setNewAdminUser({ ...newAdminUser, email: e.target.value })}
                placeholder="example@mail.com"
              />
            </div>
            <div>
              <Label>Пароль</Label>
              <Input
                type="password"
                value={newAdminUser.password}
                onChange={(e) => setNewAdminUser({ ...newAdminUser, password: e.target.value })}
                placeholder="••••••••"
              />
            </div>
            <div>
              <Label>Роль</Label>
              <Select
                value={newAdminUser.role}
                onValueChange={(value) => setNewAdminUser({ ...newAdminUser, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="renter">Арендатор</SelectItem>
                  <SelectItem value="owner">Арендодатель</SelectItem>
                  <SelectItem value="moderator">Модератор</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdminUserModal(false)}>
              Отмена
            </Button>
            <Button onClick={createUser}>Создать пользователя</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Booking Modal */}
      <Dialog open={showBookingModal} onOpenChange={setShowBookingModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Забронировать: {selectedItem?.title}</DialogTitle>
            <DialogDescription>Выберите даты и условия аренды</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Дата начала</Label>
              <Input
                type="date"
                value={bookingForm.start_date}
                onChange={(e) => setBookingForm({ ...bookingForm, start_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label>Дата окончания</Label>
              <Input
                type="date"
                value={bookingForm.end_date}
                onChange={(e) => setBookingForm({ ...bookingForm, end_date: e.target.value })}
                min={bookingForm.start_date || new Date().toISOString().split('T')[0]}
              />
            </div>
            {blockedBookingDates.length > 0 && (
              <div className="text-sm text-yellow-600 bg-yellow-50 p-2 rounded">
                <strong>Занятые дни:</strong> {blockedBookingDates.join(', ')}
              </div>
            )}
            <div>
              <Label>Тип аренды</Label>
              <Select
                value={bookingForm.rental_type}
                onValueChange={(value) => setBookingForm({ ...bookingForm, rental_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">По дням</SelectItem>
                  <SelectItem value="month">По месяцам</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="insurance"
                checked={bookingForm.is_insured}
                onCheckedChange={(checked) => setBookingForm({ ...bookingForm, is_insured: checked })}
              />
              <Label htmlFor="insurance" className="cursor-pointer">
                Добавить страховку (+10% от стоимости)
              </Label>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Залог:</span>
                <span className="font-medium">{selectedItem?.deposit} ₽</span>
              </div>
              <div className="flex justify-between">
                <span>Комиссия платформы:</span>
                <span className="font-medium">15%</span>
              </div>
              <p className="text-xs text-gray-600 mt-2">
                Предоплата 30% при бронировании. Залог возвращается после подтверждения возврата.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBookingModal(false)}>
              Отмена
            </Button>
            <Button onClick={bookItem}>Забронировать</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Review Modal */}
      <Dialog open={showReviewModal} onOpenChange={setShowReviewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Оставить отзыв</DialogTitle>
            <DialogDescription>Оцените качество аренды</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Оценка</Label>
              <div className="flex gap-2 mt-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-8 h-8 cursor-pointer transition-colors ${
                      star <= reviewForm.rating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300'
                    }`}
                    onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                  />
                ))}
              </div>
            </div>
            <div>
              <Label>Отзыв</Label>
              <Textarea
                value={reviewForm.text}
                onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
                placeholder="Расскажите о вашем опыте аренды..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewModal(false)}>
              Отмена
            </Button>
            <Button onClick={createReview}>Отправить отзыв</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}