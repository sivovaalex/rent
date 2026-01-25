'use client';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { AlertState, RegisterData, UserRole } from '@/types';

interface AuthModalProps {
  showAuth: boolean;
  onLogin: (email: string, password: string) => Promise<boolean>;
  onRegister: (userData: RegisterData) => Promise<boolean>;
  onClose: () => void;
  loginEmail: string;
  setLoginEmail: (email: string) => void;
  loginPassword: string;
  setLoginPassword: (password: string) => void;
  authAlert: AlertState | null;
  setAuthAlert: (alert: AlertState | null) => void;
}

export default function AuthModal({
  showAuth,
  onLogin,
  onRegister,
  onClose,
  loginEmail,
  setLoginEmail,
  loginPassword,
  setLoginPassword,
  authAlert,
  setAuthAlert
}: AuthModalProps) {
  const [registerMode, setRegisterMode] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>('renter');
  const [registerPhone, setRegisterPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!showAuth) {
      setRegisterMode(false);
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterPhone('');
      setAuthAlert(null);
    }
  }, [showAuth, setAuthAlert]);

  const handleLogin = async () => {
    if (!loginEmail || !loginPassword) {
      setAuthAlert({ message: 'Пожалуйста, заполните все поля', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const success = await onLogin(loginEmail, loginPassword);
      if (success) {
        onClose();
      }
    } catch {
      setAuthAlert({ message: 'Ошибка при входе', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!registerName || !registerEmail || !registerPassword || !registerPhone) {
      setAuthAlert({ message: 'Пожалуйста, заполните все обязательные поля', type: 'error' });
      return;
    }

    if (registerPassword !== registerConfirmPassword) {
      setAuthAlert({ message: 'Пароли не совпадают', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const success = await onRegister({
        name: registerName,
        email: registerEmail,
        password: registerPassword,
        phone: registerPhone,
        role: registerRole
      });

      if (success) {
        onClose();
      }
    } catch {
      setAuthAlert({ message: 'Ошибка при регистрации', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!showAuth) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-indigo-600">
            {registerMode ? 'Регистрация' : 'Вход'}
          </CardTitle>
          <CardDescription>
            {registerMode
              ? 'Создайте аккаунт для доступа к платформе'
              : 'Введите ваши учетные данные для входа'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {authAlert && (
            <Alert variant={authAlert.type === 'error' ? 'destructive' : 'default'} className="mb-4">
              {authAlert.type === 'error' ? (
                <AlertCircle className="h-4 w-4" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              <AlertTitle>{authAlert.type === 'error' ? 'Ошибка' : 'Успешно'}</AlertTitle>
              <AlertDescription>{authAlert.message}</AlertDescription>
            </Alert>
          )}

          {!registerMode ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="example@mail.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Пароль</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  onKeyUp={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>

              <Button onClick={handleLogin} className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Вход...' : 'Войти'}
              </Button>

              <div className="text-center mt-4">
                <Button
                  variant="link"
                  onClick={() => setRegisterMode(true)}
                  className="text-indigo-600 hover:text-indigo-800 p-0 h-auto font-medium"
                >
                  Нет аккаунта? Зарегистрироваться
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Иван Иванов"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="example@mail.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="register-password">Пароль</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Подтверждение пароля</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Роль</Label>
                <select
                  id="role"
                  value={registerRole}
                  onChange={(e) => setRegisterRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="renter">Арендатор</option>
                  <option value="owner">Арендодатель</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Арендаторы могут арендовать вещи, арендодатели могут сдавать свои вещи в аренду
                </p>
              </div>

              <Button onClick={handleRegister} className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? 'Регистрация...' : 'Зарегистрироваться'}
              </Button>

              <div className="text-center mt-4">
                <Button
                  variant="link"
                  onClick={() => setRegisterMode(false)}
                  className="text-indigo-600 hover:text-indigo-800 p-0 h-auto font-medium"
                >
                  Уже есть аккаунт? Войти
                </Button>
              </div>
            </div>
          )}

          <div className="mt-6 text-center pt-4 border-t">
            <Button
              variant="link"
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 p-0 h-auto font-medium"
            >
              Вернуться на главную страницу
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
