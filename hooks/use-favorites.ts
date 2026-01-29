'use client';
import { useState, useEffect, useCallback } from 'react';
import { getAuthHeaders } from './use-auth';

interface UseFavoritesOptions {
  currentUserId?: string;
}

export function useFavorites({ currentUserId }: UseFavoritesOptions = {}) {
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const loadFavorites = useCallback(async () => {
    if (!currentUserId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/favorites', { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFavoriteIds(new Set(data.favoriteIds ?? []));
      }
    } catch {
      // тихо
    } finally {
      setIsLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = useCallback(async (itemId: string) => {
    if (!currentUserId) return;

    const isFav = favoriteIds.has(itemId);

    // Оптимистичное обновление
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (isFav) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });

    try {
      const res = await fetch('/api/favorites', {
        method: isFav ? 'DELETE' : 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) {
        // Откатить при ошибке
        setFavoriteIds(prev => {
          const next = new Set(prev);
          if (isFav) {
            next.add(itemId);
          } else {
            next.delete(itemId);
          }
          return next;
        });
      }
    } catch {
      // Откатить
      setFavoriteIds(prev => {
        const next = new Set(prev);
        if (isFav) {
          next.add(itemId);
        } else {
          next.delete(itemId);
        }
        return next;
      });
    }
  }, [currentUserId, favoriteIds]);

  const isFavorite = useCallback((itemId: string) => favoriteIds.has(itemId), [favoriteIds]);

  return { favoriteIds, isLoading, toggleFavorite, isFavorite, loadFavorites };
}
