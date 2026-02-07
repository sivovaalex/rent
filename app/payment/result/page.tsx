'use client';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

type PaymentState = 'pending' | 'success' | 'failed';

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const bookingId = searchParams.get('bookingId');
  const [state, setState] = useState<PaymentState>('pending');
  const [attempts, setAttempts] = useState(0);

  const MAX_ATTEMPTS = 10;
  const POLL_INTERVAL = 3000;

  const checkStatus = useCallback(async () => {
    if (!bookingId) {
      setState('failed');
      return;
    }

    try {
      const res = await fetch(`/api/bookings/${bookingId}/status`);
      const data = await res.json();

      if (data.status === 'paid' || data.status === 'active' || data.status === 'completed') {
        setState('success');
        return;
      }

      if (data.status === 'cancelled') {
        setState('failed');
        return;
      }

      // Still pending
      setAttempts(prev => prev + 1);
    } catch {
      setAttempts(prev => prev + 1);
    }
  }, [bookingId]);

  useEffect(() => {
    if (state !== 'pending') return;

    if (attempts >= MAX_ATTEMPTS) {
      setState('failed');
      return;
    }

    const timer = setTimeout(checkStatus, attempts === 0 ? 500 : POLL_INTERVAL);
    return () => clearTimeout(timer);
  }, [attempts, state, checkStatus]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
        {state === 'pending' && (
          <>
            <Loader2 className="w-16 h-16 mx-auto text-indigo-500 animate-spin mb-6" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Обработка оплаты</h1>
            <p className="text-gray-500 mb-4">
              Пожалуйста, подождите. Мы проверяем статус вашего платежа...
            </p>
            <p className="text-xs text-gray-400">
              Попытка {attempts + 1} из {MAX_ATTEMPTS}
            </p>
          </>
        )}

        {state === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Оплата прошла успешно!</h1>
            <p className="text-gray-500 mb-6">
              Комиссия сервиса оплачена. Свяжитесь с владельцем для передачи вещи и оплаты аренды при встрече.
            </p>
            <Button
              onClick={() => window.location.href = '/#bookings'}
              className="w-full"
            >
              Перейти к бронированиям
            </Button>
          </>
        )}

        {state === 'failed' && (
          <>
            <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
              <XCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Оплата не подтверждена</h1>
            <p className="text-gray-500 mb-6">
              {!bookingId
                ? 'Не указан идентификатор бронирования.'
                : 'Не удалось подтвердить оплату. Если средства были списаны, статус обновится автоматически.'}
            </p>
            <Button
              onClick={() => window.location.href = '/#bookings'}
              className="w-full"
            >
              Перейти к бронированиям
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export default function PaymentResultPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
      </div>
    }>
      <PaymentResultContent />
    </Suspense>
  );
}
