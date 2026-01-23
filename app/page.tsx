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
import { useAlert, useAuth, useItems, useBookings, useAdmin } from '@/hooks';

export default function App() {
  const [currentTab, setCurrentTab] = useState('catalog');
  const [currentPage, setCurrentPage] = useState<'home' | 'app'>('home');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Custom hooks
  const { alert, showAlert } = useAlert();

  const {
    currentUser,
    isLoading: authLoading,
    showAuth,
    authAlert,
    setAuthAlert,
    handleLogin,
    handleRegister,
    handleLogout,
    handleRoleChange,
    openAuth,
    closeAuth,
  } = useAuth({ onShowAlert: showAlert });

  const {
    items,
    loadItems,
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    subCategoryFilter,
    setSubCategoryFilter,
    sortBy,
    setSortBy,
    catalogView,
    setCatalogView,
    showAllStatuses,
    setShowAllStatuses,
    selectedItem,
    setSelectedItem,
    showBookingModal,
    setShowBookingModal,
    blockedBookingDates,
    setBlockedBookingDates,
    bookingForm,
    setBookingForm,
    bookItem,
    loadBlockedBookingDates,
  } = useItems({ currentUser, onShowAlert: showAlert });

  const { bookings, loadBookings } = useBookings({ currentUser, onShowAlert: showAlert });

  const { pendingUsers, pendingItems, allUsers, stats, loadAdminData } = useAdmin({
    currentUser,
    onShowAlert: showAlert,
  });

  // Navigate based on auth state
  useEffect(() => {
    if (!authLoading) {
      if (currentUser) {
        setCurrentPage('app');
      } else {
        setCurrentPage('home');
      }
    }
  }, [currentUser, authLoading]);

  // Load data based on current tab
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

  const onLogin = async (email: string, password: string): Promise<boolean> => {
    const success = await handleLogin(email, password);
    if (success) {
      setCurrentPage('app');
    }
    return success;
  };

  const onRegister = async (userData: Parameters<typeof handleRegister>[0]): Promise<boolean> => {
    const success = await handleRegister(userData);
    if (success) {
      setCurrentPage('app');
    }
    return success;
  };

  const onLogout = () => {
    handleLogout();
    setCurrentPage('home');
  };

  const onBookItem = async () => {
    await bookItem(loadBookings);
  };

  const handleVerifyRequest = () => {
    showAlert('Верификация временно недоступна в демо-версии');
  };

  const showHomePage = currentPage === 'home';

  return (
    <div className="min-h-screen bg-gray-50">
      <Header currentUser={currentUser} onLogout={onLogout} onOpenAuth={openAuth} />

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
          <HomePage onOpenAuth={openAuth} />
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
                bookItem={onBookItem}
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
          onLogin={onLogin}
          onRegister={onRegister}
          onClose={closeAuth}
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
