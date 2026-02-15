'use client';
import { useState, useCallback } from 'react';
import type { Item, User, BookingForm } from '@/types';
import { getAuthHeaders } from './use-auth';

interface UseItemsOptions {
  currentUser: User | null;
  onShowAlert?: (message: string, type?: 'success' | 'error') => void;
}

interface CatalogFilters {
  searchQuery: string;
  categoryFilter: string;
  subCategoryFilter: string;
  sortBy: string;
  catalogView: 'all' | 'mine';
  showAllStatuses: boolean;
  nearLat: number | null;
  nearLon: number | null;
  radius: number;
  cityName: string;
}

export function useItems({ currentUser, onShowAlert }: UseItemsOptions) {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Filters state
  const [filters, setFilters] = useState<CatalogFilters>({
    searchQuery: '',
    categoryFilter: 'all',
    subCategoryFilter: 'all',
    sortBy: 'newest',
    catalogView: 'all',
    showAllStatuses: false,
    nearLat: null,
    nearLon: null,
    radius: 10,
    cityName: '',
  });

  // Booking modal state
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [blockedBookingDates, setBlockedBookingDates] = useState<string[]>([]);
  const [bookingForm, setBookingForm] = useState<BookingForm>({
    start_date: '',
    end_date: '',
    rental_type: 'day',
    is_insured: false,
  });

  const loadItems = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.categoryFilter !== 'all') params.append('category', filters.categoryFilter);
      if (filters.subCategoryFilter !== 'all') params.append('subcategory', filters.subCategoryFilter);
      if (filters.searchQuery) params.append('search', filters.searchQuery);
      params.append('sort', filters.sortBy);

      if (filters.catalogView === 'mine' && currentUser) {
        params.append('owner_id', currentUser._id);
        if (filters.showAllStatuses) {
          params.append('show_all_statuses', 'true');
        }
      }

      // City filter
      if (filters.cityName) {
        params.append('city', filters.cityName);
      }

      // Geo filters
      if (filters.nearLat !== null && filters.nearLon !== null) {
        params.append('lat', String(filters.nearLat));
        params.append('lon', String(filters.nearLon));
        params.append('radius', String(filters.radius));
      }

      const res = await fetch(`/api/items?${params}`);
      const data = await res.json();

      if (res.ok) {
        setItems(data.items || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки лотов:', error);
      onShowAlert?.('Ошибка загрузки лотов', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentUser, onShowAlert]);

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

  const bookItem = useCallback(async (onSuccess?: () => void) => {
    if (!currentUser || !selectedItem) return;

    try {
      const res = await fetch(`/api/items/${selectedItem._id}/book`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(bookingForm),
      });

      const data = await res.json();

      if (res.ok) {
        if (data.paymentUrl) {
          // Redirect to YooKassa payment page
          window.location.href = data.paymentUrl;
          return;
        }

        onShowAlert?.(data.message || 'Бронирование создано!');
        setShowBookingModal(false);
        setSelectedItem(null);
        setBookingForm({
          start_date: '',
          end_date: '',
          rental_type: 'day',
          is_insured: false,
        });
        onSuccess?.();
      } else {
        onShowAlert?.(data.error || 'Ошибка бронирования', 'error');
      }
    } catch {
      onShowAlert?.('Ошибка бронирования', 'error');
    }
  }, [currentUser, selectedItem, bookingForm, onShowAlert]);

  // Filter setters
  const setSearchQuery = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, searchQuery: value }));
  }, []);

  const setCategoryFilter = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, categoryFilter: value, subCategoryFilter: 'all' }));
  }, []);

  const setSubCategoryFilter = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, subCategoryFilter: value }));
  }, []);

  const setSortBy = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, sortBy: value }));
  }, []);

  const setCatalogView = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, catalogView: value as 'all' | 'mine' }));
  }, []);

  const setShowAllStatuses = useCallback((value: boolean) => {
    setFilters(prev => ({ ...prev, showAllStatuses: value }));
  }, []);

  const setNearLocation = useCallback((lat: number | null, lon: number | null) => {
    setFilters(prev => ({ ...prev, nearLat: lat, nearLon: lon }));
  }, []);

  const setRadius = useCallback((value: number) => {
    setFilters(prev => ({ ...prev, radius: value }));
  }, []);

  const setCityName = useCallback((value: string) => {
    setFilters(prev => ({ ...prev, cityName: value }));
  }, []);

  return {
    items,
    isLoading,
    loadItems,
    // Filters
    searchQuery: filters.searchQuery,
    setSearchQuery,
    categoryFilter: filters.categoryFilter,
    setCategoryFilter,
    subCategoryFilter: filters.subCategoryFilter,
    setSubCategoryFilter,
    sortBy: filters.sortBy,
    setSortBy,
    catalogView: filters.catalogView,
    setCatalogView,
    showAllStatuses: filters.showAllStatuses,
    setShowAllStatuses,
    // Geo
    nearLat: filters.nearLat,
    nearLon: filters.nearLon,
    radius: filters.radius,
    setNearLocation,
    setRadius,
    // City
    cityName: filters.cityName,
    setCityName,
    // Booking modal
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
  };
}
