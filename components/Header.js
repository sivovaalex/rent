'use client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, User, CheckCircle, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Header({ currentUser, onLogout, onOpenAuth, showBackButton = false, onBack }) {
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
            <h1 className="text-2xl font-bold text-indigo-600">Аренда PRO</h1>
          </div>
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
                      <Badge variant="success" className="text-xs">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Верифицирован
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
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