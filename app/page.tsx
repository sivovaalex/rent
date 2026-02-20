'use client';
import { useState, useEffect } from 'react';
import Header from '@/components/Header';
import AuthModal from '@/components/AuthModal';
import Catalog from '@/components/Catalog';
import Profile from '@/components/Profile';
import BookingsTab from '@/components/BookingsTab';
import ChatTab from '@/components/ChatTab';
import AnalyticsTab from '@/components/AnalyticsTab';
import AdminTab from '@/components/AdminTab';
import VerificationModal from '@/components/VerificationModal';
import HomePage from '@/components/HomePage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, Package, Calendar, Settings, BarChart, BarChart3, MessageCircle } from 'lucide-react';
import { useAlert, useAuth, useItems, useBookings, useAdmin, useChat, useFavorites, useCity } from '@/hooks';

export default function App() {
  const VALID_TABS = ['catalog', 'bookings', 'chat', 'analytics', 'profile', 'admin'];

  // Parse hash like "admin-verification-history" → { tab: "admin", subHash: "verification-history" }
  const parseHash = (rawHash: string): { tab: string; subHash: string } => {
    const hash = rawHash.replace('#', '');
    const sep = hash.indexOf('-');
    const tab = sep >= 0 ? hash.slice(0, sep) : hash;
    const subHash = sep >= 0 ? hash.slice(sep + 1) : '';
    return { tab: VALID_TABS.includes(tab) ? tab : 'catalog', subHash };
  };

  const [currentTab, setCurrentTabState] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseHash(window.location.hash).tab;
    }
    return 'catalog';
  });

  // Sub-hash state for admin tab
  const [adminSubHash, setAdminSubHashState] = useState(() => {
    if (typeof window !== 'undefined') {
      const { tab, subHash } = parseHash(window.location.hash);
      return tab === 'admin' ? subHash : '';
    }
    return '';
  });

  const [currentPage, setCurrentPage] = useState<'home' | 'app'>('home');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [chatInitialBookingId, setChatInitialBookingId] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);

  // Update hash with optional sub-part
  const updateHash = (tab: string, subHash?: string) => {
    window.location.hash = subHash ? `${tab}-${subHash}` : tab;
  };

  // Sync tab ↔ hash (preserves sub-hash for admin/catalog)
  const setCurrentTab = (tab: string) => {
    setCurrentTabState(tab);
    if (tab === 'admin') {
      updateHash(tab, adminSubHash || undefined);
    } else {
      updateHash(tab);
    }
  };

  // Called by AdminTab when its sub-tab changes
  const handleAdminSubHashChange = (subHash: string) => {
    setAdminSubHashState(subHash);
    updateHash('admin', subHash || undefined);
  };

  // Custom hooks
  const { city } = useCity();
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
    refreshUser,
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
    nearLat,
    nearLon,
    radius,
    setNearLocation,
    setRadius,
    setCityName,
    priceMin,
    priceMax,
    setPriceMin,
    setPriceMax,
    availableFrom,
    availableTo,
    setAvailableFrom,
    setAvailableTo,
  } = useItems({ currentUser, onShowAlert: showAlert });

  const { bookings, isLoading: bookingsLoading, loadBookings } = useBookings({ currentUser, onShowAlert: showAlert });

  const { pendingUsers, pendingItems, allUsers, allUsersTotal, stats, isLoading: adminLoading, isLoadingMore: adminLoadingMore, loadAdminData, loadMoreUsers } = useAdmin({
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

  const [supportUnread, setSupportUnread] = useState(0);

  // Load support unread count when user is authenticated
  useEffect(() => {
    if (!currentUser) return;
    fetch('/api/support', { headers: { Authorization: `Bearer ${typeof window !== 'undefined' ? localStorage.getItem('auth_token') : ''}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.tickets) {
          const count = data.tickets.filter((t: { unreadByUser?: boolean }) => t.unreadByUser).length;
          setSupportUnread(count);
        }
      })
      .catch(() => {});
  }, [currentUser]);

  // Sync city → items filter
  useEffect(() => {
    setCityName(city.name);
  }, [city.name, setCityName]);

  // Sync tab ↔ hash (handles sub-hashes like #admin-verification-history, #catalog-mine)
  useEffect(() => {
    const onHashChange = () => {
      const { tab, subHash } = parseHash(window.location.hash);
      setCurrentTabState(tab);
      if (tab === 'admin') {
        setAdminSubHashState(subHash);
      } else if (tab === 'catalog') {
        setCatalogView(subHash === 'mine' ? 'mine' : 'all');
      }
      if (currentPage === 'home' && currentUser) setCurrentPage('app');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [currentPage, currentUser, setCatalogView]);

  // Sync catalogView from initial hash on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const { tab, subHash } = parseHash(window.location.hash);
      if (tab === 'catalog' && subHash === 'mine') {
        setCatalogView('mine');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    setVerificationModalOpen(true);
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
        cityName={city.name}
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
            <TabsList className="flex w-full overflow-x-auto">
              <TabsTrigger value="catalog" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                <Package className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Каталог</span>
              </TabsTrigger>
              <TabsTrigger value="bookings" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                <Calendar className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Аренды</span>
              </TabsTrigger>
              <TabsTrigger value="chat" className="relative text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                <MessageCircle className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Чат</span>
                {unreadTotal > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadTotal > 99 ? '99+' : unreadTotal}
                  </span>
                )}
              </TabsTrigger>
              {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                <TabsTrigger value="analytics" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                  <BarChart3 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Аналитика</span>
                </TabsTrigger>
              )}
              <TabsTrigger value="profile" className="text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                <Settings className="w-4 h-4 sm:mr-2" />
                <span className="hidden sm:inline">Профиль</span>
              </TabsTrigger>
              {(currentUser?.role === 'moderator' || currentUser?.role === 'admin') && (
                <TabsTrigger value="admin" className="relative text-xs sm:text-sm px-2 sm:px-3 whitespace-nowrap flex-shrink-0">
                  <BarChart className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Админ</span>
                  {(pendingUsers.length + pendingItems.length) > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingUsers.length + pendingItems.length > 99 ? '99+' : pendingUsers.length + pendingItems.length}
                    </span>
                  )}
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
                setCatalogView={(view: string) => {
                  setCatalogView(view);
                  updateHash('catalog', view === 'mine' ? 'mine' : undefined);
                }}
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
                priceMin={priceMin}
                setPriceMin={setPriceMin}
                priceMax={priceMax}
                setPriceMax={setPriceMax}
                availableFrom={availableFrom}
                setAvailableFrom={setAvailableFrom}
                availableTo={availableTo}
                setAvailableTo={setAvailableTo}
                nearLat={nearLat}
                nearLon={nearLon}
                radius={radius}
                setNearLocation={setNearLocation}
                setRadius={setRadius}
                cityName={city.name}
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
                  supportUnread={supportUnread}
                />
              ) : (
                <div className="text-center py-12">
                  <MessageCircle className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                  <p className="text-gray-500">Войдите для просмотра сообщений</p>
                </div>
              )}
            </TabsContent>

            {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
              <TabsContent value="analytics">
                {currentUser && (
                  <AnalyticsTab currentUser={currentUser} showAlert={showAlert} />
                )}
              </TabsContent>
            )}

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
                  allUsersTotal={allUsersTotal}
                  isLoading={adminLoading}
                  isLoadingMore={adminLoadingMore}
                  loadMoreUsers={loadMoreUsers}
                  initialSubHash={adminSubHash}
                  onSubHashChange={handleAdminSubHashChange}
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

      {currentUser && (
        <VerificationModal
          isOpen={verificationModalOpen}
          onClose={() => setVerificationModalOpen(false)}
          currentUser={currentUser}
          onSuccess={refreshUser}
        />
      )}
    </div>
  );
}
