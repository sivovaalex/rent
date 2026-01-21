'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Star } from 'lucide-react';
import ReviewModal from './ReviewModal';
import type { User, Booking, AlertType } from '@/types';

interface BookingsTabProps {
  currentUser: User | null;
  showAlert: (message: string, type?: AlertType) => void;
  loadBookings: () => Promise<void>;
  bookings: Booking[];
}

interface BookingWithReview extends Booking {
  review?: {
    rating: number;
  };
  rental_price?: number;
  commission?: number;
  insurance?: number;
}

export default function BookingsTab({ currentUser, showAlert, loadBookings, bookings }: BookingsTabProps) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<BookingWithReview | null>(null);

  useEffect(() => {
    if (currentUser) {
      loadBookings();
    }
  }, [currentUser, loadBookings]);

  const confirmReturn = async (bookingId: string) => {
    if (!currentUser) return;

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
    } catch {
      showAlert('Ошибка подтверждения возврата', 'error');
    }
  };

  const handleOpenReviewModal = (booking: BookingWithReview) => {
    if (!currentUser) {
      showAlert('Пожалуйста, войдите в систему, чтобы оставить отзыв', 'error');
      return;
    }

    if (booking.status !== 'completed') {
      showAlert('Отзыв можно оставить только после завершения аренды', 'error');
      return;
    }

    if (booking.review) {
      showAlert('Вы уже оставили отзыв для этого бронирования', 'error');
      return;
    }

    setSelectedBooking(booking);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = () => {
    showAlert('Отзыв успешно отправлен!', 'success');
    loadBookings();
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {(bookings as BookingWithReview[]).map((booking) => (
          <Card key={booking._id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{booking.item?.title}</CardTitle>
                  <CardDescription>
                    {new Date(booking.start_date).toLocaleDateString()} - {new Date(booking.end_date).toLocaleDateString()}
                  </CardDescription>
                </div>
                <Badge variant={booking.status === 'completed' ? 'secondary' : 'default'}>
                  {booking.status === 'confirmed' && 'Оплачено'}
                  {booking.status === 'completed' && 'Завершено'}
                  {booking.status === 'pending' && 'Ожидает оплаты'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Аренда:</span>
                  <span>{(booking.rental_price || 0) + (booking.commission || 0)} ₽</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Залог:</span>
                  <span>{booking.deposit} ₽</span>
                </div>
                {(booking.insurance || 0) > 0 && (
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
              {booking.status === 'confirmed' && booking.item?.owner_id === currentUser?._id && (
                <Button onClick={() => confirmReturn(booking._id)} className="flex-1">
                  Подтвердить возврат
                </Button>
              )}
              {booking.status === 'completed' && booking.renter_id === currentUser?._id && (
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

      {showReviewModal && selectedBooking && currentUser && (
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
