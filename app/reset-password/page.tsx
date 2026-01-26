'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Package, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setIsValidating(false);
      setError('Ссылка для сброса пароля недействительна');
      return;
    }

    fetch(`/api/auth/reset-password?token=${token}`)
      .then(res => res.json())
      .then(data => {
        if (data.valid) {
          setIsValid(true);
          setEmail(data.email);
        } else {
          setError(data.error || 'Ссылка недействительна или истекла');
        }
      })
      .catch(() => {
        setError('Ошибка при проверке ссылки');
      })
      .finally(() => {
        setIsValidating(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!password) {
      setSubmitError('Введите новый пароль');
      return;
    }

    if (password.length < 6) {
      setSubmitError('Пароль должен содержать минимум 6 символов');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Пароли не совпадают');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setIsSuccess(true);
      } else {
        setSubmitError(data.error || 'Ошибка при сбросе пароля');
      }
    } catch {
      setSubmitError('Ошибка при отправке запроса');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isValidating) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12">
            <div className="text-center">
              <Loader2 className="w-12 h-12 mx-auto text-indigo-600 animate-spin mb-4" />
              <p className="text-gray-600">Проверка ссылки...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Invalid token state
  if (!isValid) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Package className="w-12 h-12 text-indigo-600" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">
              Ссылка недействительна
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
              Запросите новую ссылку для сброса пароля.
            </p>

            <div className="space-y-3">
              <Link href="/" className="block">
                <Button className="w-full">
                  Вернуться на главную
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSuccess) {
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
              Пароль изменён
            </CardTitle>
            <CardDescription>
              Ваш пароль был успешно изменён
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-center mb-6">
              Теперь вы можете войти в систему с новым паролем.
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

  // Reset password form
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Package className="w-12 h-12 text-indigo-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Новый пароль
          </CardTitle>
          <CardDescription>
            Введите новый пароль для аккаунта {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {submitError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Ошибка</AlertTitle>
                <AlertDescription>{submitError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Новый пароль</Label>
              <Input
                id="password"
                type="password"
                placeholder="Минимум 6 символов"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirm-password">Подтвердите пароль</Label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Повторите пароль"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Сохранение...' : 'Сохранить новый пароль'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link href="/" className="text-indigo-600 hover:text-indigo-800 text-sm">
              Вернуться на главную
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
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
      <ResetPasswordContent />
    </Suspense>
  );
}
