'use client';
import { useState, useCallback } from 'react';
import { getAuthHeaders } from '@/hooks/use-auth';
import type { Booking, User } from '@/types';

interface UseBookingsOptions {
  currentUser: User | null;
  onShowAlert?: (message: string, type?: 'success' | 'error') => void;
}

export function useBookings({ currentUser, onShowAlert }: UseBookingsOptions) {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadBookings = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/bookings', {
        headers: getAuthHeaders(),
      });
      const data = await res.json();

      if (res.ok) {
        setBookings(data.bookings || []);
      }
    } catch (error) {
      console.error('Ошибка загрузки бронирований:', error);
      onShowAlert?.('Ошибка загрузки бронирований', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, onShowAlert]);

  const confirmReturn = useCallback(async (bookingId: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const res = await fetch(`/api/bookings/${bookingId}/confirm-return`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json();

      if (res.ok) {
        onShowAlert?.('Возврат подтверждён! Залог возвращён.');
        await loadBookings();
        return true;
      } else {
        onShowAlert?.(data.error, 'error');
        return false;
      }
    } catch {
      onShowAlert?.('Ошибка подтверждения возврата', 'error');
      return false;
    }
  }, [currentUser, onShowAlert, loadBookings]);

  return {
    bookings,
    isLoading,
    loadBookings,
    confirmReturn,
  };
}
