'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isVerifying, setIsVerifying] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) {
      setIsVerifying(false);
      setError('Ссылка для подтверждения email недействительна');
      return;
    }

    fetch(`/api/auth/verify-email?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsSuccess(true);
        } else {
          setError(data.error || 'Ссылка недействительна или истекла');
        }
      })
      .catch(() => {
        setError('Ошибка при проверке ссылки');
      })
      .finally(() => {
        setIsVerifying(false);
      });
  }, [token]);

  // Loading state
  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600">Подтверждение email...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (!isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Package className="w-12 h-12 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Ошибка подтверждения
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>

            <p className="text-gray-600 text-center mb-6">
              Возможно, срок действия ссылки истёк или она уже была использована.
            </p>

            <Link href="/" className="block">
              <Button className="w-full">
                Вернуться на главную
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Email подтверждён!
          </CardTitle>
          <CardDescription>
            Ваш email-адрес успешно подтверждён
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600 text-center mb-6">
            Теперь вы можете войти в систему и пройти верификацию для полного доступа к платформе.
          </p>

          <Link href="/" className="block">
            <Button className="w-full">
              Перейти к входу
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600">Загрузка...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    }>
      <VerifyEmailContent />
    </Suspense>
  );
}
