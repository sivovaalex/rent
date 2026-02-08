'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, AlertState, RegisterData, UserRole } from '@/types';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'user';

interface UseAuthOptions {
  onShowAlert?: (message: string, type?: 'success' | 'error') => void;
}

// Helper to get auth headers
export function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export function useAuth(options: UseAuthOptions = {}) {
  const router = useRouter();
  const { onShowAlert } = options;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authAlert, setAuthAlert] = useState<AlertState | null>(null);

  // Initialize user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem(USER_KEY);
    const storedToken = localStorage.getItem(TOKEN_KEY);

    if (storedUser && storedToken) {
      try {
        const user = JSON.parse(storedUser) as User;
        setCurrentUser(user);
      } catch {
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem(TOKEN_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const saveAuth = useCallback((user: User, token: string) => {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    localStorage.setItem(TOKEN_KEY, token);
    setCurrentUser(user);
  }, []);

  const clearAuth = useCallback(() => {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(TOKEN_KEY);
    setCurrentUser(null);
  }, []);

  const handleLogin = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        saveAuth(data.user, data.token);
        setAuthAlert(null);
        return true;
      } else {
        setAuthAlert({ message: data.error || 'Неверный email или пароль', type: 'error' });
        return false;
      }
    } catch {
      setAuthAlert({ message: 'Ошибка сервера при входе', type: 'error' });
      return false;
    }
  }, [saveAuth]);

  const handleRegister = useCallback(async (userData: RegisterData): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (res.ok && data.token) {
        saveAuth(data.user, data.token);
        setAuthAlert(null);
        return true;
      } else {
        setAuthAlert({ message: data.error || 'Ошибка регистрации', type: 'error' });
        return false;
      }
    } catch {
      setAuthAlert({ message: 'Ошибка сервера при регистрации', type: 'error' });
      return false;
    }
  }, [saveAuth]);

  const handleLogout = useCallback(() => {
    clearAuth();
    setShowAuth(false);
    router.push('/');
  }, [router, clearAuth]);

  const handleRoleChange = useCallback(async (newRole: UserRole): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      // Use dedicated endpoint for becoming an owner
      const isBecomingOwner = newRole === 'owner';
      const res = await fetch(
        isBecomingOwner ? '/api/profile/become-owner' : '/api/profile',
        {
          method: isBecomingOwner ? 'POST' : 'PATCH',
          headers: getAuthHeaders(),
          ...(!isBecomingOwner && { body: JSON.stringify({ role: newRole }) }),
        }
      );

      const data = await res.json();

      if (res.ok && data.user) {
        const updatedUser = data.user as User;
        setCurrentUser(updatedUser);
        localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
        onShowAlert?.(isBecomingOwner ? 'Вы стали арендодателем!' : 'Роль успешно изменена!');
        return true;
      } else {
        onShowAlert?.(data.error || 'Ошибка изменения роли', 'error');
        return false;
      }
    } catch {
      onShowAlert?.('Ошибка изменения роли', 'error');
      return false;
    }
  }, [currentUser, onShowAlert]);

  const openAuth = useCallback(() => {
    setShowAuth(true);
    setAuthAlert(null);
  }, []);

  const closeAuth = useCallback(() => {
    setShowAuth(false);
  }, []);

  const updateUser = useCallback((user: User) => {
    setCurrentUser(user);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }, []);

  return {
    currentUser,
    isLoading,
    showAuth,
    authAlert,
    setAuthAlert,
    handleLogin,
    handleRegister,
    handleLogout,
    handleRoleChange,
    openAuth,
    closeAuth,
    updateUser,
  };
}
