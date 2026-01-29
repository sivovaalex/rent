'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import Catalog from '@/components/Catalog';
import Profile from '@/components/Profile';
import BookingsTab from '@/components/BookingsTab';
import ChatTab from '@/components/ChatTab';
import AdminTab from '@/components/AdminTab';
import HomePage from '@/components/HomePage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Package, Calendar, Settings, BarChart, MessageCircle } from 'lucide-react';
import { useAlert, useAuth, useItems, useBookings, useAdmin, useChat, useFavorites } from '@/hooks';

export default function App() {
  const [currentTab, setCurrentTab] = useState('catalog');
  const [currentPage, setCurrentPage] = useState<'home' | 'app'>('home');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [chatInitialBookingId, setChatInitialBookingId] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

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
    isLoading: itemsLoading,
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

  const { bookings, isLoading: bookingsLoading, loadBookings } = useBookings({ currentUser, onShowAlert: showAlert });

  const { pendingUsers, pendingItems, allUsers, stats, isLoading: adminLoading, loadAdminData } = useAdmin({
    currentUser,
    onShowAlert: showAlert,
  });

  const {
    conversations,
    messages,
    activeBookingId: chatActiveBookingId,
    chatMeta,
    isLoadingConversations,
    isLoadingMessages,
    unreadTotal,
    loadConversations,
    openChat,
    closeChat,
    sendMessage,
    loadUnreadCount,
  } = useChat({ currentUserId: currentUser?._id, onShowAlert: showAlert });

  const { favoriteIds, isFavorite, toggleFavorite } = useFavorites({ currentUserId: currentUser?._id });

  // Загрузка непрочитанных при входе
  useEffect(() => {
    if (currentUser) {
      loadUnreadCount();
      const interval = setInterval(loadUnreadCount, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, loadUnreadCount]);

  const openChatForBooking = (bookingId: string) => {
    setChatInitialBookingId(bookingId);
    setCurrentTab('chat');
  };

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
      <Header
        currentUser={currentUser}
        onLogout={onLogout}
        onOpenAuth={openAuth}
        unreadMessages={unreadTotal}
        onOpenChat={() => { setCurrentPage('app'); setCurrentTab('chat'); }}
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
          <HomePage onOpenAuth={openAuth} />
        ) : (
          <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-4 md:grid-cols-5">
              <TabsTrigger value="catalog">
                <Package className="w-4 h-4 mr-2" />
                Каталог
              </TabsTrigger>
              <TabsTrigger value="bookings">
                <Calendar className="w-4 h-4 mr-2" />
                Аренды
              </TabsTrigger>
              <TabsTrigger value="chat" className="relative">
                <MessageCircle className="w-4 h-4 mr-2" />
                Чат
                {unreadTotal > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadTotal > 99 ? '99+' : unreadTotal}
                  </span>
                )}
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
                isLoading={itemsLoading}
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
                isFavorite={isFavorite}
                onToggleFavorite={toggleFavorite}
                showFavoritesOnly={showFavoritesOnly}
                setShowFavoritesOnly={setShowFavoritesOnly}
                favoriteIds={favoriteIds}
              />
            </TabsContent>

            <TabsContent value="bookings">
              {currentUser ? (
                <BookingsTab
                  currentUser={currentUser}
                  showAlert={showAlert}
                  loadBookings={loadBookings}
                  bookings={bookings}
                  isLoading={bookingsLoading}
                  onOpenChat={openChatForBooking}
                />
              ) : (
                <div className="text-center py-12">
                  <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Пожалуйста, войдите в систему для просмотра бронирований</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="chat">
              {currentUser ? (
                <ChatTab
                  currentUser={currentUser}
                  showAlert={showAlert}
                  conversations={conversations}
                  messages={messages}
                  activeBookingId={chatActiveBookingId}
                  chatMeta={chatMeta}
                  isLoadingConversations={isLoadingConversations}
                  isLoadingMessages={isLoadingMessages}
                  onOpenChat={openChat}
                  onCloseChat={closeChat}
                  onSendMessage={sendMessage}
                  loadConversations={loadConversations}
                  initialBookingId={chatInitialBookingId}
                />
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Войдите для просмотра сообщений</p>
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
                  isLoading={adminLoading}
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
