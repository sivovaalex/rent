'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type { User, AlertState, RegisterData, UserRole } from '@/types';

interface UseAuthOptions {
  onShowAlert?: (message: string, type?: 'success' | 'error') => void;
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
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser) as User;
        setCurrentUser(user);
      } catch {
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (res.ok) {
        setCurrentUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
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
  }, []);

  const handleRegister = useCallback(async (userData: RegisterData): Promise<boolean> => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (res.ok) {
        // Auto-login after registration
        const loginRes = await fetch('/api/auth', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userData.email, password: userData.password }),
        });

        const loginData = await loginRes.json();

        if (loginRes.ok) {
          setCurrentUser(loginData.user);
          localStorage.setItem('user', JSON.stringify(loginData.user));
          setAuthAlert(null);
          return true;
        } else {
          setAuthAlert({ message: 'Ошибка при входе после регистрации', type: 'error' });
          return false;
        }
      } else {
        setAuthAlert({ message: data.error || 'Ошибка регистрации', type: 'error' });
        return false;
      }
    } catch {
      setAuthAlert({ message: 'Ошибка сервера при регистрации', type: 'error' });
      return false;
    }
  }, []);

  const handleLogout = useCallback(() => {
    localStorage.removeItem('user');
    setCurrentUser(null);
    setShowAuth(false);
    router.push('/');
  }, [router]);

  const handleRoleChange = useCallback(async (newRole: UserRole): Promise<boolean> => {
    if (!currentUser) return false;

    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (res.ok) {
        const updatedUser = { ...currentUser, role: newRole };
        setCurrentUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        onShowAlert?.('Роль успешно изменена!');
        return true;
      } else {
        const data = await res.json();
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
    localStorage.setItem('user', JSON.stringify(user));
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
