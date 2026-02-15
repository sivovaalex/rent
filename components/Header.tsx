'use client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, User, CheckCircle, ArrowLeft, MessageCircle, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { User as UserType } from '@/types';

interface HeaderProps {
  currentUser: UserType | null;
  onLogout: () => void;
  onOpenAuth: (mode?: string) => void;
  showBackButton?: boolean;
  onBack?: () => void;
  unreadMessages?: number;
  onOpenChat?: () => void;
  cityName?: string;
}

export default function Header({
  currentUser,
  onLogout,
  onOpenAuth,
  showBackButton = false,
  onBack,
  unreadMessages = 0,
  onOpenChat,
  cityName,
}: HeaderProps) {
  const router = useRouter();

  return (
    <header className="bg-white border-b sticky top-0 z-50 shadow-sm">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Назад"
            >
              <ArrowLeft className="w-6 h-6 text-gray-600" />
            </button>
          )}
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/')}>
            <Package className="w-8 h-8 text-indigo-600" />
            <h1 className="text-2xl font-bold text-indigo-600">Арендол</h1>
          </div>
          {cityName && (
            <div className="flex items-center gap-1 text-sm text-gray-600 ml-3">
              <MapPin className="w-4 h-4" />
              <span>{cityName}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          {currentUser ? (
            <>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="text-sm font-medium">{currentUser.name}</p>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-xs">
                      {currentUser.role === 'renter' && 'Арендатор'}
                      {currentUser.role === 'owner' && 'Арендодатель'}
                      {currentUser.role === 'moderator' && 'Модератор'}
                      {currentUser.role === 'admin' && 'Администратор'}
                    </Badge>
                    {currentUser.is_verified && (
                      <Badge variant="secondary" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Верифицирован
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              {onOpenChat && (
                <button
                  onClick={onOpenChat}
                  className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Сообщения"
                >
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                  {unreadMessages > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </button>
              )}
              <Button variant="outline" size="sm" onClick={onLogout}>
                Выйти
              </Button>
            </>
          ) : (
            <Button onClick={() => onOpenAuth('login')}>Войти</Button>
          )}
        </div>
      </div>
    </header>
  );
}
