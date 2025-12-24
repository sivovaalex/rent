'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Star, AlertCircle, CheckCircle } from 'lucide-react';
import ReviewModal from './ReviewModal';

export default function BookingsTab({ currentUser, showAlert, loadBookings, bookings }) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [reviewForm, setReviewForm] = useState({ rating: 5, text: '' });

  useEffect(() => {
    if (currentUser) {
      loadBookings();
    }
  }, [currentUser]);

  const confirmReturn = async (bookingId) => {
    try {
      const res = await fetch(`/api/bookings/${bookingId}/confirm-return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Возврат подтверждён! Залог возвращён.');
        loadBookings();
      } else {
        showAlert(data.error, 'error');
      }
    } catch (error) {
      showAlert('Ошибка подтверждения возврата', 'error');
    }
  };

  // Обработчик открытия модалки отзыва
  const handleOpenReviewModal = (booking) => {
    if (!currentUser) {
      showAlert('Пожалуйста, войдите в систему, чтобы оставить отзыв', 'error');
      return;
    }
    
    if (booking.status !== 'completed') {
      showAlert('Отзыв можно оставить только после завершения аренды', 'error');
      return;
    }
    
    // Проверяем, не оставлял ли уже пользователь отзыв
    if (booking.review) {
      showAlert('Вы уже оставили отзыв для этого бронирования', 'error');
      return;
    }
    
    setSelectedBooking(booking);
    setShowReviewModal(true);
  };

  // Обработчик успешной отправки отзыва
  const handleReviewSubmit = () => {
    showAlert('Отзыв успешно отправлен!', 'success');
    loadBookings(); // Обновляем список бронирований
  };

  const createReview = async () => {
    try {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify({
          booking_id: selectedBooking._id,
          item_id: selectedBooking.item_id,
          ...reviewForm
        })
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Отзыв добавлен!');
        setShowReviewModal(false);
        setSelectedBooking(null);
        setReviewForm({ rating: 5, text: '' });
        loadBookings();
      } else {
        showAlert(data.error, 'error');
      }
    } catch (error) {
      showAlert('Ошибка добавления отзыва', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {bookings.map((booking) => (
          <Card key={booking._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{booking.item?.title}</CardTitle>
                  <CardDescription>
                    {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant={booking.status === 'completed' ? 'success' : 'default'}>
                  {booking.status === 'paid' && 'Оплачено'}
                  {booking.status === 'completed' && 'Завершено'}
                  {booking.status === 'pending_payment' && 'Ожидает оплаты'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Аренда:</span>
                  <span>{booking.rental_price+booking.commission} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Залог:</span>
                  <span>{booking.deposit} ₽</span>
                </div>
                {booking.insurance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Страховка:</span>
                    <span>{booking.insurance} ₽</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-2 border-t">
                  <span>Итого:</span>
                  <span>{booking.total_price} ₽</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex gap-2">
              {booking.status === 'paid' && booking.item?.owner_id === currentUser._id && (
                <Button onClick={() => confirmReturn(booking._id)} className="flex-1">
                  Подтвердить возврат
                </Button>
              )}
              {booking.status === 'completed' && booking.renter_id === currentUser._id && (
                booking.review ? (
                  <div className="flex items-center gap-1 text-yellow-500 flex-1 justify-center">
                    <Star className="w-4 h-4 fill-current" />
                    <span>{booking.review.rating}/5</span>
                    <span className="text-gray-500 text-sm">(отзыв оставлен)</span>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleOpenReviewModal(booking)}
                    className="flex-1"
                  >
                    Оставить отзыв
                  </Button>
                )
              )}
            </CardFooter>
          </Card>
        ))}
      </div>
      
      {bookings.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">У вас пока нет бронирований</p>
        </div>
      )}
      
      {showReviewModal && selectedBooking && (
        <ReviewModal 
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          booking={selectedBooking}
          currentUser={currentUser}
          onSubmit={handleReviewSubmit}
        />
      )}
    </div>
  );
}