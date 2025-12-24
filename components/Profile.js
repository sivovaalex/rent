'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Star, CheckCircle, AlertCircle, Shield } from 'lucide-react';

export default function Profile({ currentUser, showAlert, onRoleChange, onVerifyRequest }) {
  const [name, setName] = useState(currentUser?.name || '');
  const [editingName, setEditingName] = useState(false);
  
  useEffect(() => {
    setName(currentUser?.name || '');
  }, [currentUser]);
  
  const handleNameUpdate = async () => {
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify({ name })
      });
      
      if (res.ok) {
        showAlert('Имя успешно обновлено');
        setEditingName(false);
      } else {
        const data = await res.json();
        showAlert(data.error || 'Ошибка обновления имени', 'error');
      }
    } catch (error) {
      showAlert('Ошибка обновления имени', 'error');
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Профиль пользователя</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Имя пользователя */}
        <div className="space-y-2">
          <Label>Имя</Label>
          {editingName ? (
            <div className="flex gap-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ваше имя"
              />
              <Button onClick={handleNameUpdate}>Сохранить</Button>
              <Button variant="outline" onClick={() => {
                setName(currentUser?.name || '');
                setEditingName(false);
              }}>Отмена</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-lg font-medium">{name || 'Не указано'}</p>
              <Button variant="outline" size="sm" onClick={() => setEditingName(true)}>
                Редактировать
              </Button>
            </div>
          )}
        </div>
        
        {/* Основная информация */}
        <div className="space-y-4">
          <div>
            <Label>Телефон</Label>
            <p className="text-lg font-medium">{currentUser?.phone || 'Не указан'}</p>
          </div>
          
          <div>
            <Label>Email</Label>
            <p className="text-lg font-medium">{currentUser?.email || 'Не указан'}</p>
          </div>
          
          <div>
            <Label>Роль</Label>
            <div className="mt-1 flex items-center justify-between">
              <p className="text-lg font-medium">
                {currentUser?.role === 'renter' && 'Арендатор'}
                {currentUser?.role === 'owner' && 'Арендодатель'}
                {currentUser?.role === 'moderator' && 'Модератор'}
                {currentUser?.role === 'admin' && 'Администратор'}
              </p>
              {/*
              {currentUser?.role === 'renter' && (
                <Button onClick={() => onRoleChange('owner')} size="sm">
                  Стать арендодателем
                </Button>
              )}
              {currentUser?.role === 'owner' && (
                <Button onClick={() => onRoleChange('renter')} size="sm" variant="outline">
                  Стать арендатором
                </Button>
              )}
               */}
            </div>
          </div>
          
          <div>
            <Label>Рейтинг</Label>
            <div className="flex items-center gap-2 mt-1">
              <Star className="w-6 h-6 fill-yellow-400 text-yellow-400" />
              <span className="text-2xl font-bold">{currentUser?.rating?.toFixed(2) || '5.00'}</span>
            </div>
          </div>
          
          <div>
            <Label>Статус верификации</Label>
            <div className="mt-1">
              {currentUser?.is_verified ? (
                <Badge variant="success" className="text-lg px-3 py-1">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Верифицирован
                </Badge>
              ) : (
                <div className="space-y-2">
                  <Badge variant="outline" className="text-lg px-3 py-1">
                    <AlertCircle className="w-5 h-5 mr-2 text-yellow-500" />
                    {currentUser?.verification_status === 'pending'
                      ? 'На проверке'
                      : 'Требуется верификация'}
                  </Badge>
                  
                  {currentUser?.verification_status !== 'pending' && (
                    <Button onClick={onVerifyRequest} className="w-full sm:w-auto">
                      <Shield className="w-4 h-4 mr-2" />
                      Пройти верификацию
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Предупреждение для арендодателей */}
        {currentUser?.role === 'owner' && !currentUser?.is_verified && (
          <Alert variant="warning">
            <AlertDescription>
              Чтобы создавать лоты и получать доход от аренды, необходимо пройти верификацию личности. Загрузите скан паспорта или иного документа, удостоверяющего личность.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}