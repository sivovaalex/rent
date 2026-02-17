'use client';
import { useState, useEffect, useCallback, useMemo, useRef, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, Package, Zap, Camera, Shirt, Dumbbell, Hammer } from 'lucide-react';
import ItemCard from './ItemCard';
import ItemDetailModal from './ItemDetailModal';
import BookingModal from './BookingModal';
import { MapView } from './MapView';
import { SkeletonCard } from '@/components/ui/spinner';
import CatalogFilters from './CatalogFilters';
import NewItemModal from './NewItemModal';
import { getAuthHeaders } from '@/hooks/use-auth';
import type { User, Item, ItemStatus, Category, BookingForm, AlertType } from '@/types';

interface CatalogProps {
  currentUser: User | null;
  items: Item[];
  isLoading?: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  subCategoryFilter: string;
  setSubCategoryFilter: (subcategory: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  catalogView: string;
  setCatalogView: (view: string) => void;
  showAllStatuses: boolean;
  setShowAllStatuses: (show: boolean) => void;
  loadItems: () => Promise<void>;
  showAlert: (message: string, type?: AlertType) => void;
  blockedBookingDates: string[];
  setBlockedBookingDates: (dates: string[]) => void;
  setSelectedItem: (item: Item | null) => void;
  setShowBookingModal: (show: boolean) => void;
  selectedItem: Item | null;
  showBookingModal: boolean;
  bookingForm: BookingForm;
  setBookingForm: React.Dispatch<React.SetStateAction<BookingForm>>;
  bookItem: () => Promise<void>;
  loadBlockedBookingDates: (itemId: string) => Promise<void>;
  isFavorite?: (itemId: string) => boolean;
  onToggleFavorite?: (itemId: string) => void;
  showFavoritesOnly?: boolean;
  setShowFavoritesOnly?: (show: boolean) => void;
  favoriteIds?: Set<string>;
  // Price
  priceMin: string;
  setPriceMin: (value: string) => void;
  priceMax: string;
  setPriceMax: (value: string) => void;
  // Date availability
  availableFrom: string;
  setAvailableFrom: (value: string) => void;
  availableTo: string;
  setAvailableTo: (value: string) => void;
  // Geo
  nearLat?: number | null;
  nearLon?: number | null;
  radius?: number;
  setNearLocation?: (lat: number | null, lon: number | null) => void;
  setRadius?: (radius: number) => void;
  cityName?: string;
}

const getCategoryIcon = (category: Category): ReactNode => {
  switch (category) {
    case 'stream': return <Zap className="w-4 h-4" />;
    case 'electronics': return <Camera className="w-4 h-4" />;
    case 'clothes': return <Shirt className="w-4 h-4" />;
    case 'sports': return <Dumbbell className="w-4 h-4" />;
    case 'tools': return <Hammer className="w-4 h-4" />;
    default: return <Package className="w-4 h-4" />;
  }
};

const getCategoryName = (category: Category): string => {
  switch (category) {
    case 'stream': return 'Стрим-оборудование';
    case 'electronics': return 'Электроника';
    case 'clothes': return 'Одежда';
    case 'sports': return 'Спорт';
    case 'tools': return 'Инструменты';
    default: return category;
  }
};

const getStatusBadge = (status: ItemStatus): ReactNode => {
  switch (status) {
    case 'approved': return <Badge variant="secondary" className="text-xs">Опубликован</Badge>;
    case 'pending': return <Badge variant="outline" className="text-xs">На модерации</Badge>;
    case 'rejected': return <Badge variant="destructive" className="text-xs">Отклонен</Badge>;
    case 'draft': return <Badge variant="outline" className="text-xs">Снят</Badge>;
    default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
  }
};

export default function Catalog({
  currentUser,
  items,
  isLoading,
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
  loadItems,
  showAlert,
  blockedBookingDates,
  setBlockedBookingDates,
  setSelectedItem,
  setShowBookingModal,
  selectedItem,
  showBookingModal,
  bookingForm,
  setBookingForm,
  bookItem,
  isFavorite,
  onToggleFavorite,
  showFavoritesOnly = false,
  setShowFavoritesOnly,
  favoriteIds,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  availableFrom,
  setAvailableFrom,
  availableTo,
  setAvailableTo,
  nearLat,
  nearLon,
  radius = 10,
  setNearLocation,
  setRadius,
  cityName,
}: CatalogProps) {
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (hash.startsWith('#item/')) return hash.replace('#item/', '');
    }
    return null;
  });
  const [showItemDetailModal, setShowItemDetailModal] = useState(() => {
    if (typeof window !== 'undefined') return window.location.hash.startsWith('#item/');
    return false;
  });
  const [attributeFilters, setAttributeFilters] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const blockedDatesAbortRef = useRef<AbortController | null>(null);

  const loadBlockedDates = useCallback((itemId: string) => {
    blockedDatesAbortRef.current?.abort();
    const controller = new AbortController();
    blockedDatesAbortRef.current = controller;

    setBlockedBookingDates([]);
    fetch(`/api/items/${itemId}/blocked-booking-dates`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        if (data.dates) setBlockedBookingDates(data.dates);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          console.error('Failed to load blocked dates');
        }
      });
  }, [setBlockedBookingDates]);

  // Sync item modal ↔ hash
  const openItemDetail = useCallback((itemId: string) => {
    setSelectedItemId(itemId);
    setShowItemDetailModal(true);
    window.location.hash = `item/${itemId}`;
  }, []);

  const closeItemDetail = useCallback(() => {
    setShowItemDetailModal(false);
    window.location.hash = 'catalog';
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#item/')) {
        const id = hash.replace('#item/', '');
        setSelectedItemId(id);
        setShowItemDetailModal(true);
      } else if (showItemDetailModal) {
        setShowItemDetailModal(false);
      }
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, [showItemDetailModal]);

  // Memoized filtered items
  const filteredItems = useMemo(() => {
    let result = showFavoritesOnly && favoriteIds
      ? items.filter(item => favoriteIds.has(item._id))
      : items;

    if (Object.keys(attributeFilters).length > 0) {
      result = result.filter((item) => {
        const attrs = (item.attributes || {}) as Record<string, string>;
        return Object.entries(attributeFilters).every(
          ([key, value]) => attrs[key] === value
        );
      });
    }

    return result;
  }, [items, showFavoritesOnly, favoriteIds, attributeFilters]);

  // Memoized handlers
  const handleDelete = useCallback(async (item: Item) => {
    if (!currentUser) return;
    if (confirm('Вы уверены, что хотите удалить этот лот?')) {
      try {
        const res = await fetch(`/api/items/${item._id}`, {
          method: 'DELETE',
          headers: getAuthHeaders()
        });
        if (res.ok) {
          showAlert('Лот удален');
          loadItems();
        } else {
          const data = await res.json();
          showAlert(data.error, 'error');
        }
      } catch {
        showAlert('Ошибка удаления лота', 'error');
      }
    }
  }, [currentUser, showAlert, loadItems]);

  const handlePublish = useCallback(async (item: Item) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/items/${item._id}/publish`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      showAlert('Лот опубликован');
      loadItems();
    } catch {
      showAlert('Ошибка публикации лота', 'error');
    }
  }, [currentUser, showAlert, loadItems]);

  const handleUnpublish = useCallback(async (item: Item) => {
    if (!currentUser) return;
    try {
      await fetch(`/api/items/${item._id}/unpublish`, {
        method: 'POST',
        headers: getAuthHeaders()
      });
      showAlert('Лот снят с публикации');
      loadItems();
    } catch {
      showAlert('Ошибка снятия с публикации', 'error');
    }
  }, [currentUser, showAlert, loadItems]);

  const handleBook = useCallback((item: Item) => {
    if (!currentUser) {
      showAlert('Необходимо войти в систему', 'error');
      return;
    }
    setSelectedItem(item);
    setShowBookingModal(true);
    loadBlockedDates(item._id);
  }, [currentUser, showAlert, setSelectedItem, setShowBookingModal, loadBlockedDates]);

  const handleEdit = useCallback((item: Item) => {
    setSelectedItem(item);
    setShowItemModal(true);
  }, [setSelectedItem]);

  const handleItemSubmit = useCallback(async (itemData: any) => {
    if (!currentUser) return null;
    try {
      if (selectedItem) {
        const res = await fetch(`/api/items/${selectedItem._id}`, {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify(itemData)
        });
        const data = await res.json();
        if (data.success) {
          showAlert(data.reModeration ? 'Лот обновлён и отправлен на повторную модерацию' : 'Лот обновлён');
          setShowItemModal(false);
          setSelectedItem(null);
          loadItems();
          return null;
        } else if (data.details && Array.isArray(data.details)) {
          return data.details;
        } else {
          showAlert(data.error || 'Ошибка обновления лота', 'error');
          return null;
        }
      } else {
        const res = await fetch('/api/items', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(itemData)
        });
        const data = await res.json();
        if (data.success) {
          showAlert('Лот создан и отправлен на модерацию');
          setShowItemModal(false);
          loadItems();
          return null;
        } else if (data.details && Array.isArray(data.details)) {
          return data.details;
        } else {
          showAlert(data.error || 'Ошибка создания лота', 'error');
          return null;
        }
      }
    } catch {
      showAlert('Ошибка сохранения лота', 'error');
      return null;
    }
  }, [currentUser, selectedItem, showAlert, setSelectedItem, loadItems]);

  return (
    <div className="space-y-4 sm:space-y-6">
      <CatalogFilters
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
        attributeFilters={attributeFilters}
        setAttributeFilters={setAttributeFilters}
        viewMode={viewMode}
        setViewMode={setViewMode}
        currentUser={currentUser}
        nearLat={nearLat}
        nearLon={nearLon}
        radius={radius}
        setNearLocation={setNearLocation}
        setRadius={setRadius}
        priceMin={priceMin}
        setPriceMin={setPriceMin}
        priceMax={priceMax}
        setPriceMax={setPriceMax}
        availableFrom={availableFrom}
        setAvailableFrom={setAvailableFrom}
        availableTo={availableTo}
        setAvailableTo={setAvailableTo}
        showFavoritesOnly={showFavoritesOnly}
        setShowFavoritesOnly={setShowFavoritesOnly}
        favoriteIds={favoriteIds}
      />

      {currentUser?.is_verified && (currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
        <Button onClick={() => setShowItemModal(true)} className="w-full lg:w-auto">
          <Upload className="w-4 h-4 mr-2" />
          Разместить лот
        </Button>
      )}

      {viewMode === 'map' ? (
        <MapView
          items={filteredItems}
          onItemClick={(id) => openItemDetail(id)}
          userLocation={nearLat !== null && nearLat !== undefined && nearLon !== null && nearLon !== undefined ? [nearLat, nearLon] : null}
          radiusKm={radius}
        />
      ) : (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))
        ) : (
          filteredItems.map((item) => (
            <ItemCard
              key={item._id}
              item={item}
              currentUser={currentUser}
              getStatusBadge={getStatusBadge}
              getCategoryIcon={getCategoryIcon}
              getCategoryName={getCategoryName}
              onEdit={() => handleEdit(item)}
              onDelete={() => handleDelete(item)}
              onPublish={() => handlePublish(item)}
              onUnpublish={() => handleUnpublish(item)}
              distance={(item as any).distance}
              isFavorite={isFavorite?.(item._id)}
              onToggleFavorite={onToggleFavorite ? () => onToggleFavorite(item._id) : undefined}
              onViewDetails={() => openItemDetail(item._id)}
              onBook={() => handleBook(item)}
            />
          ))
        )}
      </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {catalogView === 'mine' ? 'У вас пока нет лотов' : 'Лотов не найдено'}
          </p>
        </div>
      )}

      <ItemDetailModal
        isOpen={showItemDetailModal}
        onClose={closeItemDetail}
        itemId={selectedItemId}
        currentUser={currentUser}
        isFavorite={selectedItemId ? isFavorite?.(selectedItemId) : false}
        onToggleFavorite={selectedItemId && onToggleFavorite ? () => onToggleFavorite(selectedItemId) : undefined}
        onBook={(item) => {
          setSelectedItem(item);
          setShowBookingModal(true);
          setShowItemDetailModal(false);
          loadBlockedDates(item._id);
        }}
      />

      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        item={selectedItem}
        bookingForm={bookingForm}
        setBookingForm={setBookingForm}
        blockedBookingDates={blockedBookingDates}
        onSubmit={bookItem}
      />

      <NewItemModal
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        currentUser={currentUser}
        cityName={cityName}
        onSubmit={handleItemSubmit}
      />
    </div>
  );
}
