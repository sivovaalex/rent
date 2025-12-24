'use client';
import { useState, useEffect } from 'react';
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

export default function App() {
  const router = useRouter();
  
  // Состояния пользователя и авторизации
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authAlert, setAuthAlert] = useState(null);
  
  // Состояния для формы входа
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Состояния для главной страницы
  const [showHomePage, setShowHomePage] = useState(true);
  const [currentPage, setCurrentPage] = useState('home'); // 'home', 'app'
  
  // Состояния для каталога
  const [currentTab, setCurrentTab] = useState('catalog');
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [catalogView, setCatalogView] = useState('all');
  const [showAllStatuses, setShowAllStatuses] = useState(false);
  
  // Состояния для бронирований
  const [bookings, setBookings] = useState([]);
  
  // Состояния для админки
  const [pendingUsers, setPendingUsers] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [stats, setStats] = useState(null);
  
  // Модальные состояния
  const [alert, setAlert] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [blockedBookingDates, setBlockedBookingDates] = useState([]);
  
  // Форма бронирования
  const [bookingForm, setBookingForm] = useState({
    start_date: '',
    end_date: '',
    rental_type: 'day',
    is_insured: false
  });
  
  // Инициализация при загрузке
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setShowHomePage(false);
      setCurrentPage('app');
      setShowAuth(false);
      
      // Загружаем данные при входе
      if (user.is_verified) {
        loadItems();
      }
    } else {
      setShowHomePage(true);
      setCurrentPage('home');
    }
  }, []);
  
  // Загрузка данных при изменении вкладки
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
  }, [currentTab, currentUser, catalogView, showAllStatuses, currentPage, categoryFilter, subCategoryFilter, searchQuery, sortBy]);
  
  // Функция показа уведомлений
  const showAlert = (message, type = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  };
  
  // Функция входа по email и паролю
  const handleLogin = async (email, password) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Обновляем состояние ПОСЛЕ успешного входа
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
    } catch (error) {
      setAuthAlert({ message: 'Ошибка сервера при входе', type: 'error' });
      return false;
    }
  };
  
  // Функция регистрации
  const handleRegister = async (userData) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        // Сразу выполняем вход после регистрации
        const loginRes = await fetch('/api/auth', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userData.email, password: userData.password })
        });
        
        const loginData = await loginRes.json();
        
        if (loginRes.ok) {
          // Обновляем состояние ПОСЛЕ успешной регистрации+входа
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
    } catch (error) {
      setAuthAlert({ message: 'Ошибка сервера при регистрации', type: 'error' });
      return false;
    }
  };
  
  // Функция выхода
  const handleLogout = () => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    setShowAuth(false);
    setCurrentPage('home');
    setShowHomePage(true);
    router.push('/');
  };
  
  // Функция открытия окна авторизации
  const handleOpenAuth = () => {
    setShowAuth(true);
    setAuthAlert(null);
  };
  
  // Функции для работы с лотами
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
      console.error('Ошибка загрузки лотов:', error);
      showAlert('Ошибка загрузки лотов', 'error');
    }
  };
  
  // Функции для работы с бронированиями
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
      console.error('Ошибка загрузки бронирований:', error);
      showAlert('Ошибка загрузки бронирований', 'error');
    }
  };
  
  // Функции для работы с админкой
  const loadAdminData = async () => {
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
      // Загружаем всех пользователей только если текущий пользователь - админ
      if (allUsersRes.ok && currentUser?.role === 'admin') {
        setAllUsers(allUsersData.users || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных админки:', error);
      showAlert('Ошибка загрузки данных админки', 'error');
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
      console.error('Ошибка загрузки заблокированных дат:', error);
    }
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
    } catch (error) {
      showAlert('Ошибка бронирования', 'error');
    }
  };
  
  // Обработчик изменения роли пользователя
  const handleRoleChange = async (newRole) => {
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
    } catch (error) {
      showAlert('Ошибка изменения роли', 'error');
    }
  };
  
  // Обработчик запроса верификации
  const handleVerifyRequest = () => {
    showAlert('Верификация временно недоступна в демо-версии');
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <Header 
        currentUser={currentUser} 
        onLogout={handleLogout} 
        onOpenAuth={handleOpenAuth}
      />
      
      {/* Alert */}
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
      
      {/* Main Content */}
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
            
            {/* Catalog Tab */}
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
            
            {/* Bookings Tab */}
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
            
            {/* Profile Tab */}
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
            
            {/* Admin Tab */}
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
      
      {/* Auth Modal */}
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