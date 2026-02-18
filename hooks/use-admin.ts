'use client';
import { useState, useCallback } from 'react';
import type { User, Item } from '@/types';
import { getAuthHeaders } from './use-auth';

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

interface UseAdminOptions {
  currentUser: User | null;
  onShowAlert?: (message: string, type?: 'success' | 'error') => void;
}

export function useAdmin({ currentUser, onShowAlert }: UseAdminOptions) {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allUsersTotal, setAllUsersTotal] = useState(0);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const loadAdminData = useCallback(async () => {
    if (!currentUser) return;

    setIsLoading(true);
    try {
      const headers = getAuthHeaders();

      const [usersRes, itemsRes, statsRes, allUsersRes] = await Promise.all([
        fetch('/api/admin/users?status=pending', { headers }),
        fetch('/api/admin/items?status=pending', { headers }),
        fetch('/api/admin/stats', { headers }),
        fetch('/api/admin/users/all?limit=50&offset=0', { headers }),
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
        setAllUsersTotal(allUsersData.total || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных админки:', error);
      onShowAlert?.('Ошибка загрузки данных админки', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, onShowAlert]);

  const verifyUser = useCallback(async (userId: string, action: 'approve' | 'reject', reason?: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const res = await fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, reason }),
      });

      if (res.ok) {
        onShowAlert?.(action === 'approve' ? 'Пользователь верифицирован' : 'Верификация отклонена');
        await loadAdminData();
        return true;
      } else {
        const data = await res.json();
        onShowAlert?.(data.error || 'Ошибка верификации', 'error');
        return false;
      }
    } catch {
      onShowAlert?.('Ошибка верификации', 'error');
      return false;
    }
  }, [currentUser, onShowAlert, loadAdminData]);

  const moderateItem = useCallback(async (itemId: string, action: 'approve' | 'reject', reason?: string): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const res = await fetch(`/api/admin/items/${itemId}/moderate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action, reason }),
      });

      if (res.ok) {
        onShowAlert?.(action === 'approve' ? 'Лот одобрен' : 'Лот отклонён');
        await loadAdminData();
        return true;
      } else {
        const data = await res.json();
        onShowAlert?.(data.error || 'Ошибка модерации', 'error');
        return false;
      }
    } catch {
      onShowAlert?.('Ошибка модерации', 'error');
      return false;
    }
  }, [currentUser, onShowAlert, loadAdminData]);

  const loadMoreUsers = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    setIsLoadingMore(true);
    try {
      const headers = getAuthHeaders();
      const offset = allUsers.length;
      const res = await fetch(`/api/admin/users/all?limit=50&offset=${offset}`, { headers });
      const data = await res.json();
      if (res.ok) {
        setAllUsers((prev) => [...prev, ...(data.users || [])]);
        setAllUsersTotal(data.total || 0);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователей:', error);
      onShowAlert?.('Ошибка загрузки пользователей', 'error');
    } finally {
      setIsLoadingMore(false);
    }
  }, [currentUser, allUsers.length, onShowAlert]);

  const blockUser = useCallback(async (userId: string, isBlocked: boolean): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const res = await fetch(`/api/admin/users/${userId}/block`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ is_blocked: isBlocked }),
      });

      if (res.ok) {
        onShowAlert?.(isBlocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован');
        await loadAdminData();
        return true;
      } else {
        const data = await res.json();
        onShowAlert?.(data.error || 'Ошибка блокировки', 'error');
        return false;
      }
    } catch {
      onShowAlert?.('Ошибка блокировки', 'error');
      return false;
    }
  }, [currentUser, onShowAlert, loadAdminData]);

  return {
    pendingUsers,
    pendingItems,
    allUsers,
    allUsersTotal,
    stats,
    isLoading,
    isLoadingMore,
    loadAdminData,
    loadMoreUsers,
    verifyUser,
    moderateItem,
    blockUser,
  };
}

export type { AdminStats, PendingUser, PendingItem };
