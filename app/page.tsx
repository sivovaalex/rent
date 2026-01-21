'use client';
import { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import Catalog from '@/components/Catalog';
import Profile from '@/components/Profile';
import BookingsTab from '@/components/BookingsTab';
import AdminTab from '@/components/AdminTab';
import HomePage from '@/components/HomePage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Package, Calendar, Settings, BarChart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { User, Item, Booking, BookingForm, AlertState, AlertType, RegisterData, UserRole } from '@/types';

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

export default function App() {
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authAlert, setAuthAlert] = useState<AlertState | null>(null);

  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  const [showHomePage, setShowHomePage] = useState(true);
  const [currentPage, setCurrentPage] = useState<'home' | 'app'>('home');

  const [currentTab, setCurrentTab] = useState('catalog');
  const [items, setItems] = useState<Item[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [catalogView, setCatalogView] = useState('all');
  const [showAllStatuses, setShowAllStatuses] = useState(false);

  const [bookings, setBookings] = useState<Booking[]>([]);

  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<AdminStats | null>(null);

  const [alert, setAlert] = useState<AlertState | null>(null);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [blockedBookingDates, setBlockedBookingDates] = useState<string[]>([]);

  const [bookingForm, setBookingForm] = useState<BookingForm>({
    start_date: '',
    end_date: '',
    rental_type: 'day',
    is_insured: false
  });

  const showAlert = (message: string, type: AlertType = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };

  const loadItems = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (subCategoryFilter !== 'all') params.append('subcategory', subCategoryFilter);
      if (searchQuery) params.append('search', searchQuery);
      params.append('sort', sortBy);

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
      console.error('Ошибка загрузки лотов:', error);
      showAlert('Ошибка загрузки лотов', 'error');
    }
  }, [categoryFilter, subCategoryFilter, searchQuery, sortBy, catalogView, currentUser, showAllStatuses]);

  const loadBookings = useCallback(async () => {
    if (!currentUser) return;
    try {
      const res = await fetch('/api/bookings', {
        headers: { 'x-user-id': currentUser._id }
      });
      const data = await res.json();

      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки бронирований:', error);
      showAlert('Ошибка загрузки бронирований', 'error');
    }
  }, [currentUser]);

  const loadAdminData = useCallback(async () => {
    if (!currentUser) return;
    try {
      const [usersRes, itemsRes, statsRes, allUsersRes] = await Promise.all([
        fetch('/api/admin/users?status=pending', {
          headers: { 'x-user-id': currentUser._id }
        }),
        fetch('/api/admin/items?status=pending', {
          headers: { 'x-user-id': currentUser._id }
        }),
        fetch('/api/admin/stats', {
          headers: { 'x-user-id': currentUser._id }
        }),
        fetch('/api/admin/users/all', {
          headers: { 'x-user-id': currentUser._id }
        })
      ]);

      const usersData = await usersRes.json();
      const itemsData = await itemsRes.json();
      const statsData = await statsRes.json();
      const allUsersData = await allUsersRes.json();

      if (usersRes.ok) setPendingUsers(usersData.users || []);
      if (itemsRes.ok) setPendingItems(itemsData.items || []);
      if (statsRes.ok) setStats(statsData);
      if (allUsersRes.ok && currentUser?.role === 'admin') {
        setAllUsers(allUsersData.users || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных админки:', error);
      showAlert('Ошибка загрузки данных админки', 'error');
    }
  }, [currentUser]);

  const loadBlockedBookingDates = useCallback(async (itemId: string) => {
    try {
      const res = await fetch(`/api/items/${itemId}/blocked-booking-dates`);
      const data = await res.json();

      if (res.ok) {
        setBlockedBookingDates(data.dates || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки заблокированных дат:', error);
    }
  }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser) as User;
      setCurrentUser(user);
      setShowHomePage(false);
      setCurrentPage('app');
      setShowAuth(false);
    } else {
      setShowHomePage(true);
      setCurrentPage('home');
    }
  }, []);

  useEffect(() => {
    if (currentUser && currentPage === 'app') {
      if (currentTab === 'catalog') {
        loadItems();
      } else if (currentTab === 'bookings') {
        loadBookings();
      } else if (currentTab === 'admin') {
        loadAdminData();
      }
    }
  }, [currentTab, currentUser, catalogView, showAllStatuses, currentPage, categoryFilter, subCategoryFilter, searchQuery, sortBy, loadItems, loadBookings, loadAdminData]);

  const handleLogin = async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setShowHomePage(false);
        setCurrentPage('app');
        setAuthAlert(null);

        if (data.user.is_verified) {
          loadItems();
        }
        return true;
      } else {
        setAuthAlert({ message: data.error || 'Неверный email или пароль', type: 'error' });
        return false;
      }
    } catch {
      setAuthAlert({ message: 'Ошибка сервера при входе', type: 'error' });
      return false;
    }
  };

  const handleRegister = async (userData: RegisterData): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      const data = await res.json();

      if (res.ok) {
        const loginRes = await fetch('/api/auth', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userData.email, password: userData.password })
        });

        const loginData = await loginRes.json();

        if (loginRes.ok) {
          setCurrentUser(loginData.user);
          localStorage.setItem('user', JSON.stringify(loginData.user));
          setShowHomePage(false);
          setCurrentPage('app');
          setAuthAlert(null);

          if (loginData.user.is_verified) {
            loadItems();
          }
          return true;
        } else {
          setAuthAlert({ message: 'Ошибка при входе после регистрации', type: 'error' });
          return false;
        }
      } else {
        setAuthAlert({ message: data.error || 'Ошибка регистрации', type: 'error' });
        return false;
      }
    } catch {
      setAuthAlert({ message: 'Ошибка сервера при регистрации', type: 'error' });
      return false;
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    setShowAuth(false);
    setCurrentPage('home');
    setShowHomePage(true);
    router.push('/');
  };

  const handleOpenAuth = () => {
    setShowAuth(true);
    setAuthAlert(null);
  };

  const bookItem = async () => {
    if (!currentUser || !selectedItem) return;

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
        showAlert(data.error || 'Ошибка бронирования', 'error');
      }
    } catch {
      showAlert('Ошибка бронирования', 'error');
    }
  };

  const handleRoleChange = async (newRole: UserRole) => {
    if (!currentUser) return;

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
        showAlert('Роль успешно изменена!');
      } else {
        const data = await res.json();
        showAlert(data.error || 'Ошибка изменения роли', 'error');
      }
    } catch {
      showAlert('Ошибка изменения роли', 'error');
    }
  };

  const handleVerifyRequest = () => {
    showAlert('Верификация временно недоступна в демо-версии');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenAuth={handleOpenAuth}
      />

      {alert && (
        <div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top">
          <Alert variant={alert.type === 'error' ? 'destructive' : 'default'}>
            {alert.type === 'error' ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            <div>{alert.message}</div>
          </Alert>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        {showHomePage ? (
          <HomePage onOpenAuth={handleOpenAuth} />
        ) : (
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-4">
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

            <TabsContent value="catalog">
              <Catalog
                currentUser={currentUser}
                items={items}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                subCategoryFilter={subCategoryFilter}
                setSubCategoryFilter={setSubCategoryFilter}
                sortBy={sortBy}
                setSortBy={setSortBy}
                catalogView={catalogView}
                setCatalogView={setCatalogView}
                showAllStatuses={showAllStatuses}
                setShowAllStatuses={setShowAllStatuses}
                loadItems={loadItems}
                showAlert={showAlert}
                blockedBookingDates={blockedBookingDates}
                setBlockedBookingDates={setBlockedBookingDates}
                selectedItem={selectedItem}
                setSelectedItem={setSelectedItem}
                showBookingModal={showBookingModal}
                setShowBookingModal={setShowBookingModal}
                bookingForm={bookingForm}
                setBookingForm={setBookingForm}
                bookItem={bookItem}
                loadBlockedBookingDates={loadBlockedBookingDates}
              />
            </TabsContent>

            <TabsContent value="bookings">
              {currentUser ? (
                <BookingsTab
                  currentUser={currentUser}
                  showAlert={showAlert}
                  loadBookings={loadBookings}
                  bookings={bookings}
                />
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Пожалуйста, войдите в систему для просмотра бронирований</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="profile">
              {currentUser ? (
                <Profile
                  currentUser={currentUser}
                  showAlert={showAlert}
                  onRoleChange={handleRoleChange}
                  onVerifyRequest={handleVerifyRequest}
                />
              ) : (
                <div className="text-center py-12">
                  <Settings className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Пожалуйста, войдите в систему для просмотра профиля</p>
                </div>
              )}
            </TabsContent>

            {(currentUser?.role === 'moderator' || currentUser?.role === 'admin') && (
              <TabsContent value="admin">
                <AdminTab
                  currentUser={currentUser}
                  showAlert={showAlert}
                  loadAdminData={loadAdminData}
                  pendingUsers={pendingUsers}
                  pendingItems={pendingItems}
                  stats={stats}
                  allUsers={allUsers}
                />
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>

      {showAuth && (
        <AuthModal
          showAuth={showAuth}
          onLogin={handleLogin}
          onRegister={handleRegister}
          onClose={() => setShowAuth(false)}
          loginEmail={loginEmail}
          setLoginEmail={setLoginEmail}
          loginPassword={loginPassword}
          setLoginPassword={setLoginPassword}
          authAlert={authAlert}
          setAuthAlert={setAuthAlert}
        />
      )}
    </div>
  );
}
