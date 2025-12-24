'use client';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Star } from 'lucide-react';

export default function ReviewList({ reviews = [], currentUser, onReply }) {
  const [visibleCount, setVisibleCount] = useState(3);
  const displayedReviews = reviews.slice(0, visibleCount);
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };
  
  return (
    <div className="space-y-4">
      {displayedReviews.map((review) => (
        <Card key={review._id} className="border">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="w-10 h-10">
                <AvatarImage src={review.user_photo} alt={review.user_name} />
                <AvatarFallback>{review.user_name?.charAt(0)}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">{review.user_name}</h4>
                    <p className="text-sm text-gray-500">{formatDate(review.createdAt)}</p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                </div>
                
                <p className="mt-2 text-gray-700">{review.text}</p>
                
                {/* Отображение фото отзыва */}
                {review.photos && review.photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {review.photos.slice(0, 3).map((photo, index) => (
                      <div key={index} className="aspect-square overflow-hidden rounded">
                        <img 
                          src={photo} 
                          alt={`review photo ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                    {review.photos.length > 3 && (
                      <div className="aspect-square bg-gray-100 border-2 border-dashed border-gray-300 rounded flex items-center justify-center text-gray-500 text-sm">
                        +{review.photos.length - 3}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Ответ владельца */}
                {review.reply && (
                  <div className="mt-3 bg-gray-50 p-3 rounded-lg border-l-4 border-indigo-500">
                    <div className="flex items-start gap-2">
                      <div className="bg-indigo-100 w-6 h-6 rounded-full flex items-center justify-center">
                        <span className="text-indigo-700 font-bold text-xs">A</span>
                      </div>
                      <div>
                        <p className="font-medium text-indigo-700">Ответ арендодателя</p>
                        <p className="mt-1 text-gray-700">{review.reply.text}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(review.reply.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Кнопка ответа для владельца */}
                {currentUser?.role === 'owner' && !review.reply && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-3"
                    onClick={() => onReply(review)}
                  >
                    Ответить
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {reviews.length > 3 && visibleCount < reviews.length && (
        <Button 
          variant="outline" 
          onClick={() => setVisibleCount(prev => prev + 3)}
          className="w-full"
        >
          Показать еще отзывы
        </Button>
      )}
      
      {reviews.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Пока нет отзывов об этом лоте</p>
        </div>
      )}
    </div>
  );
}