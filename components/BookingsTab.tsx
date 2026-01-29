'use client';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Star, MessageCircle } from 'lucide-react';
import ReviewModal from './ReviewModal';
import { SkeletonList } from '@/components/ui/spinner';
import type { User, Booking, AlertType } from '@/types';
import { getAuthHeaders } from '@/hooks/use-auth';

interface BookingsTabProps {
  currentUser: User | null;
  showAlert: (message: string, type?: AlertType) => void;
  loadBookings: () => Promise<void>;
  bookings: Booking[];
  isLoading?: boolean;
  onOpenChat?: (bookingId: string) => void;
}

export default function BookingsTab({ currentUser, showAlert, loadBookings, bookings, isLoading, onOpenChat }: BookingsTabProps) {
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

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
        headers: getAuthHeaders(),
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

  const canLeaveReview = (booking: Booking): boolean => {
    const renterId = booking.renterId ?? booking.renter_id;
    if (!currentUser || renterId !== currentUser._id) return false;
    if (booking.review) return false;
    if (booking.status === 'pending_payment' || booking.status === 'cancelled') return false;
    // Можно оставить отзыв после окончания периода аренды
    const endDateStr = booking.endDate ?? booking.end_date;
    if (!endDateStr) return false;
    const endDate = new Date(endDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate < today || booking.status === 'completed';
  };

  const handleOpenReviewModal = (booking: Booking) => {
    if (!currentUser) {
      showAlert('Пожалуйста, войдите в систему, чтобы оставить отзыв', 'error');
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

  const getStatusLabel = (status: Booking['status']) => {
    switch (status) {
      case 'pending_payment': return 'Ожидает оплаты';
      case 'paid': return 'Оплачено';
      case 'active': return 'Активно';
      case 'completed': return 'Завершено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <SkeletonList count={3} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4">
        {bookings.map((booking) => {
          const startDate = booking.startDate ?? booking.start_date;
          const endDate = booking.endDate ?? booking.end_date;
          const rentalPrice = booking.rentalPrice ?? booking.rental_price ?? 0;
          const totalPrice = booking.totalPrice ?? booking.total_price ?? 0;
          const renterId = booking.renterId ?? booking.renter_id;
          const ownerId = booking.item?.ownerId ?? booking.item?.owner_id;

          return (
            <Card key={booking._id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{booking.item?.title}</CardTitle>
                    <CardDescription>
                      {startDate && new Date(startDate).toLocaleDateString()} - {endDate && new Date(endDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant={booking.status === 'completed' ? 'secondary' : 'default'}>
                    {getStatusLabel(booking.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Аренда:</span>
                    <span>{rentalPrice + (booking.commission || 0)} ₽</span>
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
                    <span>{totalPrice} ₽</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                {booking.status !== 'cancelled' && onOpenChat && (
                  <Button variant="outline" onClick={() => onOpenChat(booking._id)} className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    Чат
                  </Button>
                )}
                {(booking.status === 'active' || booking.status === 'paid') && ownerId === currentUser?._id && (
                  <Button onClick={() => confirmReturn(booking._id)} className="flex-1">
                    Подтвердить возврат
                  </Button>
                )}
                {renterId === currentUser?._id && (
                  booking.review ? (
                    <div className="flex items-center gap-1 text-yellow-500 flex-1 justify-center">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{booking.review.rating}/5</span>
                      <span className="text-gray-500 text-sm">(отзыв оставлен)</span>
                    </div>
                  ) : canLeaveReview(booking) ? (
                    <Button
                      onClick={() => handleOpenReviewModal(booking)}
                      className="flex-1"
                    >
                      Оставить отзыв
                    </Button>
                  ) : null
                )}
              </CardFooter>
            </Card>
          );
        })}
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
