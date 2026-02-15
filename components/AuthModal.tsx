'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { AlertState, RegisterData, UserRole } from '@/types';
import { REGISTRATION_CONSENT_LINKS, LEGAL_LINKS } from '@/lib/constants/legal-links';

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
  const [forgotPasswordMode, setForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const [registerEmailSent, setRegisterEmailSent] = useState(false);
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  const [registerRole, setRegisterRole] = useState<UserRole>('renter');
  const [registerPhone, setRegisterPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Согласия для регистрации
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptDataProcessing, setAcceptDataProcessing] = useState(false);

  useEffect(() => {
    if (!showAuth) {
      setRegisterMode(false);
      setForgotPasswordMode(false);
      setForgotEmail('');
      setForgotEmailSent(false);
      setRegisterEmailSent(false);
      setRegisterName('');
      setRegisterEmail('');
      setRegisterPassword('');
      setRegisterConfirmPassword('');
      setRegisterPhone('');
      setAcceptTerms(false);
      setAcceptPrivacy(false);
      setAcceptDataProcessing(false);
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

  const handleForgotPassword = async () => {
    if (!forgotEmail) {
      setAuthAlert({ message: 'Пожалуйста, введите email', type: 'error' });
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(forgotEmail)) {
      setAuthAlert({ message: 'Введите корректный email', type: 'error' });
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await res.json();

      if (res.ok) {
        setForgotEmailSent(true);
        setAuthAlert({
          message: 'Если указанный email зарегистрирован, на него отправлена ссылка для сброса пароля',
          type: 'success'
        });
      } else {
        setAuthAlert({ message: data.error || 'Ошибка при отправке', type: 'error' });
      }
    } catch {
      setAuthAlert({ message: 'Ошибка при отправке запроса', type: 'error' });
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

    if (!acceptTerms || !acceptPrivacy || !acceptDataProcessing) {
      setAuthAlert({ message: 'Необходимо принять все обязательные соглашения', type: 'error' });
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
        setRegisterEmailSent(true);
      }
    } catch {
      setAuthAlert({ message: 'Ошибка при регистрации', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!showAuth) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
        <CardHeader className="pb-2 sm:pb-6">
          <CardTitle className="text-2xl sm:text-3xl font-bold text-indigo-600">
            {forgotPasswordMode ? 'Восстановление пароля' : registerMode ? 'Регистрация' : 'Вход'}
          </CardTitle>
          <CardDescription>
            {forgotPasswordMode
              ? 'Введите email для получения ссылки сброса пароля'
              : registerMode
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

          {forgotPasswordMode ? (
            <div className="space-y-3 sm:space-y-4">
              {forgotEmailSent ? (
                <div className="text-center py-4">
                  <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-gray-600 mb-4">
                    Если email зарегистрирован в системе, на него отправлена ссылка для сброса пароля.
                  </p>
                  <p className="text-sm text-gray-500 mb-4">
                    Проверьте папку &quot;Спам&quot;, если письмо не пришло.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setForgotPasswordMode(false);
                      setForgotEmailSent(false);
                      setForgotEmail('');
                      setAuthAlert(null);
                    }}
                    className="w-full"
                  >
                    Вернуться к входу
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">Email</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      placeholder="example@mail.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      onKeyUp={(e) => e.key === 'Enter' && handleForgotPassword()}
                    />
                  </div>

                  <Button onClick={handleForgotPassword} className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? 'Отправка...' : 'Отправить ссылку'}
                  </Button>

                  <div className="text-center mt-4">
                    <Button
                      variant="link"
                      onClick={() => {
                        setForgotPasswordMode(false);
                        setForgotEmail('');
                        setAuthAlert(null);
                      }}
                      className="text-indigo-600 hover:text-indigo-800 p-0 h-auto font-medium"
                    >
                      Вернуться к входу
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : !registerMode ? (
            <div className="space-y-3 sm:space-y-4">
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
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Пароль</Label>
                  <Button
                    variant="link"
                    onClick={() => {
                      setForgotPasswordMode(true);
                      setForgotEmail(loginEmail);
                      setAuthAlert(null);
                    }}
                    className="text-xs text-indigo-600 hover:text-indigo-800 p-0 h-auto"
                  >
                    Забыли пароль?
                  </Button>
                </div>
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
          ) : registerEmailSent ? (
            <div className="space-y-3 sm:space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Проверьте почту</h3>
                <p className="text-gray-600 mb-2">
                  На адрес <strong>{registerEmail}</strong> отправлено письмо с ссылкой для подтверждения.
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  Проверьте папку &quot;Спам&quot;, если письмо не пришло.
                </p>
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="w-full"
                >
                  Вернуться на главную
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-4">
              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="name">Имя</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Иван Иванов"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="register-email">Email</Label>
                <Input
                  id="register-email"
                  type="email"
                  placeholder="example@mail.com"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="register-password">Пароль</Label>
                <Input
                  id="register-password"
                  type="password"
                  placeholder="••••••••"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="confirm-password">Подтверждение пароля</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="••••••••"
                  value={registerConfirmPassword}
                  onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
                <Label htmlFor="phone">Телефон</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+7 (999) 123-45-67"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                />
              </div>

              <div className="space-y-1 sm:space-y-2">
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

              {/* Обязательные согласия */}
              <div className="space-y-2 sm:space-y-3 pt-2 border-t">
                <p className="text-xs sm:text-sm font-medium text-gray-700">Обязательные согласия:</p>

                {/* Пользовательское соглашение и оферта */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="accept-terms"
                    checked={acceptTerms}
                    onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="accept-terms" className="text-xs sm:text-sm text-gray-600 leading-tight cursor-pointer">
                    Принимаю{' '}
                    <Link href={REGISTRATION_CONSENT_LINKS.termsAndOffer[0].href} target="_blank" className="text-indigo-600 hover:underline">
                      {REGISTRATION_CONSENT_LINKS.termsAndOffer[0].shortLabel}
                    </Link>
                    {' '}и{' '}
                    <Link href={REGISTRATION_CONSENT_LINKS.termsAndOffer[1].href} target="_blank" className="text-indigo-600 hover:underline">
                      {REGISTRATION_CONSENT_LINKS.termsAndOffer[1].shortLabel}
                    </Link>
                  </label>
                </div>

                {/* Политика конфиденциальности */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="accept-privacy"
                    checked={acceptPrivacy}
                    onCheckedChange={(checked) => setAcceptPrivacy(checked === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="accept-privacy" className="text-xs sm:text-sm text-gray-600 leading-tight cursor-pointer">
                    Ознакомлен(а) с{' '}
                    <Link href={REGISTRATION_CONSENT_LINKS.privacy.href} target="_blank" className="text-indigo-600 hover:underline">
                      {REGISTRATION_CONSENT_LINKS.privacy.shortLabel}
                    </Link>
                  </label>
                </div>

                {/* Согласие на обработку ПД */}
                <div className="flex items-start space-x-2">
                  <Checkbox
                    id="accept-data-processing"
                    checked={acceptDataProcessing}
                    onCheckedChange={(checked) => setAcceptDataProcessing(checked === true)}
                    className="mt-0.5"
                  />
                  <label htmlFor="accept-data-processing" className="text-xs sm:text-sm text-gray-600 leading-tight cursor-pointer">
                    Даю{' '}
                    <Link href={REGISTRATION_CONSENT_LINKS.consent.href} target="_blank" className="text-indigo-600 hover:underline">
                      {REGISTRATION_CONSENT_LINKS.consent.shortLabel}
                    </Link>
                  </label>
                </div>
              </div>

              <Button onClick={handleRegister} className="w-full" disabled={isLoading || !acceptTerms || !acceptPrivacy || !acceptDataProcessing}>
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

          <div className="mt-4 sm:mt-6 text-center pt-3 sm:pt-4 border-t">
            <Button
              variant="link"
              onClick={onClose}
              className="text-gray-600 hover:text-gray-800 p-0 h-auto font-medium text-sm sm:text-base"
            >
              Вернуться на главную
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
