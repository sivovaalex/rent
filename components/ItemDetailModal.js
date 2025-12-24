'use client';
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, Package, Zap, Camera, Shirt, Dumbbell, Hammer } from 'lucide-react';
import ReviewList from './ReviewList';
import ReviewModal from './ReviewModal';

export default function ItemDetailModal({ isOpen, onClose, itemId, currentUser, onBook }) {
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    if (!isOpen || !itemId) return;
    
    setLoading(true);
    setError(null);
    
    fetch(`/api/items/${itemId}`)
      .then(res => {
        if (!res.ok) throw new Error('Лот не найден');
        return res.json();
      })
      .then(data => {
        setItem(data.item);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => setLoading(false));
  }, [isOpen, itemId]);
  
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'stream': return <Zap className="w-5 h-5" />;
      case 'electronics': return <Camera className="w-5 h-5" />;
      case 'clothing': return <Shirt className="w-5 h-5" />;
      case 'sports': return <Dumbbell className="w-5 h-5" />;
      case 'tools': return <Hammer className="w-5 h-5" />;
      default: return <Package className="w-5 h-5" />;
    }
  };
  
  const getCategoryName = (category) => {
    switch (category) {
      case 'stream': return 'Стрим-оборудование';
      case 'electronics': return 'Электроника';
      case 'clothing': return 'Одежда';
      case 'sports': return 'Спорт';
      case 'tools': return 'Инструменты';
      default: return category;
    }
  };
  
  const getStatusBadge = (status) => {
    switch (status) {
      case 'approved': return <Badge variant="success">Опубликован</Badge>;
      case 'pending': return <Badge variant="warning">На модерации</Badge>;
      case 'rejected': return <Badge variant="destructive">Отклонен</Badge>;
      case 'draft': return <Badge variant="outline">Снят</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (!isOpen) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item?.title || 'Загрузка...'}</DialogTitle>
          <DialogDescription>
            {item && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                {getCategoryIcon(item.category)}
                <span>{getCategoryName(item.category)}</span>
                {item.subcategory && <span>· {item.subcategory}</span>}
                <span>·</span>
                {getStatusBadge(item.status)}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>
        
        {loading && (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Загрузка информации о лоте...</p>
          </div>
        )}
        
        {error && (
          <div className="py-12 text-center">
            <div className="text-red-500 mb-2">❌</div>
            <p className="text-red-500">{error}</p>
            <Button onClick={onClose} className="mt-4">Закрыть</Button>
          </div>
        )}
        
        {item && !loading && !error && (
          <div className="space-y-6">
            {/* Фотографии */}
            <div className="space-y-4">
              {item.photos && item.photos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-1">
                    <img 
                      src={item.photos[0]} 
                      alt={item.title} 
                      className="w-full h-80 object-cover rounded-lg"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {item.photos.slice(1).map((photo, index) => (
                      <img 
                        key={index}
                        src={photo}
                        alt={`${item.title} ${index + 2}`}
                        className="w-full h-40 object-cover rounded"
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-80 bg-gray-100 border-2 border-dashed rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">Нет фотографий</span>
                </div>
              )}
            </div>
            
            {/* Информация о предмете и владельце */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Описание</h3>
                  <p className="text-gray-600 whitespace-pre-line">{item.description || 'Описание отсутствует'}</p>
                </div>
                
                <div className="space-y-2">
                  <h3 className="font-semibold">Характеристики</h3>
                  {Object.keys(item.attributes || {}).length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(item.attributes).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="text-gray-500">{key}:</span>
                          <span className="font-medium ml-1">{value}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">Характеристики не указаны</p>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Информация об арендной плате</h3>
                  <div className="space-y-2">
                    {item.price_per_day && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Цена за день:</span>
                        <span className="font-bold text-lg">{item.price_per_day} ₽</span>
                      </div>
                    )}
                    {item.price_per_month && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Цена за месяц:</span>
                        <span className="font-bold text-lg">{item.price_per_month} ₽</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-gray-600">Залог:</span>
                      <span className="font-bold text-lg">{item.deposit} ₽</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Владелец</h3>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                      {item.owner_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-medium">{item.owner_name}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="w-4 h-4 text-yellow-400 fill-current" />
                        <span className="text-sm">{item.owner_rating?.toFixed(1) || '5.0'}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">Зарегистрирован: {new Date(item.owner_createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Адрес самовывоза</h3>
                  <p className="text-gray-600">{item.address || 'Адрес не указан'}</p>
                </div>
              </div>
            </div>
            
            {/* Отзывы */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg flex justify-between items-center">
                  Отзывы <span className="text-sm">({item.reviews?.length || 0})</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 text-yellow-400 fill-current" />
                    <span className="text-s">{item.rating?.toFixed(1) || '5.0'}</span>
                  </div>
                </h3>
                {/*{currentUser?.is_verified && item.owner_id !== currentUser._id && (
                  <Button onClick={() => {
                    setShowReviewModal(true);
                    setSelectedBooking(null);
                  }} variant="outline" size="sm">
                    Оставить отзыв
                  </Button>
                )}*/}
              </div>
              
              <ReviewList 
                reviews={item.reviews || []} 
                currentUser={currentUser}
                onReply={console.log}
              />
            </div>
            
            {/* Действия с лотом */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4 border-t">
              {currentUser?.is_verified && item.owner_id !== currentUser._id && item.status === 'approved' && (
                <Button onClick={() => onBook(item)} className="flex-1">
                  Забронировать
                </Button>
              )}
              
              {currentUser?.is_verified && item.owner_id === currentUser._id && (
                <Button variant="outline" onClick={() => {
                  // Редактирование лота
                  onClose();
                }} className="flex-1">
                  Редактировать лот
                </Button>
              )}
            </div>
          </div>
        )}
      </DialogContent>
      
      <ReviewModal
        isOpen={showReviewModal}
        onClose={() => {
          setShowReviewModal(false);
          setSelectedBooking(null);
        }}
        itemId={itemId}
        bookingId={selectedBooking?._id}
        currentUser={currentUser}
        onSubmit={() => {
          setShowReviewModal(false);
          // Перезагрузка данных для обновления отзывов
          fetch(`/api/items/${itemId}`)
            .then(res => res.json())
            .then(data => setItem(data.item));
        }}
      />
    </Dialog>
  );
}