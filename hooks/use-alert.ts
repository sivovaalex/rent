'use client';
import { useState, useCallback } from 'react';
import type { AlertState, AlertType } from '@/types';

export function useAlert() {
  const [alert, setAlert] = useState<AlertState | null>(null);

  const showAlert = useCallback((message: string, type: AlertType = 'success') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3000);
  }, []);

  const clearAlert = useCallback(() => {
    setAlert(null);
  }, []);

  return {
    alert,
    showAlert,
    clearAlert,
  };
}
