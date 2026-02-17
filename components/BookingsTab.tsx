'use client';
import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Star, MessageCircle, Clock, CheckCircle, XCircle, AlertTriangle, CreditCard, Loader2, Filter, ArrowUpDown } from 'lucide-react';
import ReviewModal from './ReviewModal';
import { SkeletonList } from '@/components/ui/spinner';
import type { User, Booking, AlertType, ReviewType } from '@/types';
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
  const [reviewType, setReviewType] = useState<ReviewType>('renter_review');
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectBookingId, setRejectBookingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isRejecting, setIsRejecting] = useState(false);
  const [isPaying, setIsPaying] = useState<string | null>(null);
  const [isConfirmingHandover, setIsConfirmingHandover] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');

  const filteredBookings = useMemo(() => {
    let result = [...bookings];
    if (statusFilter !== 'all') {
      result = result.filter(b => b.status === statusFilter);
    }
    result.sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
    return result;
  }, [bookings, statusFilter, sortOrder]);

  const cancelBooking = async (bookingId: string) => {
    if (!confirm('Вы уверены, что хотите отменить бронирование?')) return;
    setIsCancelling(bookingId);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Бронирование отменено', 'success');
        loadBookings().catch(() => {});
      } else {
        showAlert(data.error || 'Ошибка при отмене', 'error');
      }
    } catch {
      showAlert('Ошибка при отмене бронирования', 'error');
    } finally {
      setIsCancelling(null);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadBookings().catch(() => {});
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
        loadBookings().catch(() => {});
      } else {
        showAlert(data.error, 'error');
      }
    } catch {
      showAlert('Ошибка подтверждения возврата', 'error');
    }
  };

  const approveBooking = async (bookingId: string) => {
    if (!currentUser) return;
    setIsApproving(bookingId);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/approve`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.paymentUrl) {
          showAlert('Бронирование одобрено! Арендатору отправлена ссылка на оплату комиссии.', 'success');
        } else {
          showAlert('Бронирование одобрено!', 'success');
        }
        loadBookings().catch(() => {});
      } else {
        showAlert(data.error, 'error');
      }
    } catch {
      showAlert('Ошибка одобрения', 'error');
    } finally {
      setIsApproving(null);
    }
  };

  const payCommission = async (bookingId: string) => {
    if (!currentUser) return;
    setIsPaying(bookingId);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (res.ok && data.paymentUrl) {
        window.location.href = data.paymentUrl;
      } else {
        showAlert(data.error || 'Ошибка инициализации оплаты', 'error');
      }
    } catch {
      showAlert('Ошибка оплаты', 'error');
    } finally {
      setIsPaying(null);
    }
  };

  const confirmHandover = async (bookingId: string, depositConfirmed: boolean, remainderConfirmed: boolean) => {
    if (!currentUser) return;
    setIsConfirmingHandover(bookingId);

    try {
      const res = await fetch(`/api/bookings/${bookingId}/confirm-handover`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ depositConfirmed, remainderConfirmed }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.allConfirmed) {
          showAlert('Обе стороны подтвердили передачу! Аренда активна.', 'success');
        } else {
          showAlert('Подтверждение сохранено. Ожидается подтверждение другой стороны.', 'success');
        }
        loadBookings().catch(() => {});
      } else {
        showAlert(data.error, 'error');
      }
    } catch {
      showAlert('Ошибка подтверждения', 'error');
    } finally {
      setIsConfirmingHandover(null);
    }
  };

  const openRejectModal = (bookingId: string) => {
    setRejectBookingId(bookingId);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const submitReject = async () => {
    if (!rejectBookingId || !rejectReason.trim()) return;
    setIsRejecting(true);

    try {
      const res = await fetch(`/api/bookings/${rejectBookingId}/reject`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showAlert('Бронирование отклонено', 'success');
        setShowRejectModal(false);
        loadBookings().catch(() => {});
      } else {
        showAlert(data.error, 'error');
      }
    } catch {
      showAlert('Ошибка отклонения', 'error');
    } finally {
      setIsRejecting(false);
    }
  };

  const canLeaveRenterReview = (booking: Booking): boolean => {
    const renterId = booking.renterId ?? booking.renter_id;
    if (!currentUser || renterId !== currentUser._id) return false;
    const renterReview = booking.reviews?.find(r => r.type === 'renter_review') ?? booking.review;
    if (renterReview) return false;
    if (booking.status === 'pending_payment' || booking.status === 'cancelled' || booking.status === 'pending_approval') return false;
    const endDateStr = booking.endDate ?? booking.end_date;
    if (!endDateStr) return false;
    const endDate = new Date(endDateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return endDate < today || booking.status === 'completed';
  };

  const canLeaveOwnerReview = (booking: Booking): boolean => {
    const ownerId = booking.item?.ownerId ?? booking.item?.owner_id;
    if (!currentUser || ownerId !== currentUser._id) return false;
    const ownerReview = booking.reviews?.find(r => r.type === 'owner_review');
    if (ownerReview) return false;
    if (booking.status !== 'completed') return false;
    return true;
  };

  const handleOpenReviewModal = (booking: Booking, type: ReviewType) => {
    if (!currentUser) {
      showAlert('Пожалуйста, войдите в систему', 'error');
      return;
    }
    setSelectedBooking(booking);
    setReviewType(type);
    setShowReviewModal(true);
  };

  const handleReviewSubmit = () => {
    showAlert('Отзыв успешно отправлен!', 'success');
    loadBookings().catch(() => {});
  };

  const getStatusLabel = (status: Booking['status']) => {
    switch (status) {
      case 'pending_approval': return 'Ожидает одобрения';
      case 'pending_payment': return 'Ожидает оплаты';
      case 'paid': return 'Оплачено';
      case 'active': return 'Активно';
      case 'completed': return 'Завершено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  const getStatusVariant = (status: Booking['status']): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'pending_approval': return 'outline';
      case 'cancelled': return 'destructive';
      case 'completed': return 'secondary';
      default: return 'default';
    }
  };

  const getDeadlineText = (deadline: string | undefined): string | null => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const now = new Date();
    const diff = d.getTime() - now.getTime();
    if (diff <= 0) return 'Время истекло';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}ч ${minutes}мин`;
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
      {/* Фильтры и сортировка */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Статус" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все статусы</SelectItem>
            <SelectItem value="pending_approval">Ожидает одобрения</SelectItem>
            <SelectItem value="pending_payment">Ожидает оплаты</SelectItem>
            <SelectItem value="paid">Оплачено</SelectItem>
            <SelectItem value="active">Активно</SelectItem>
            <SelectItem value="completed">Завершено</SelectItem>
            <SelectItem value="cancelled">Отменено</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortOrder} onValueChange={(v) => setSortOrder(v as 'newest' | 'oldest')}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <ArrowUpDown className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Сортировка" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Сначала новые</SelectItem>
            <SelectItem value="oldest">Сначала старые</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredBookings.map((booking) => {
          const startDate = booking.startDate ?? booking.start_date;
          const endDate = booking.endDate ?? booking.end_date;
          const rentalPrice = booking.rentalPrice ?? booking.rental_price ?? 0;
          const totalPrice = booking.totalPrice ?? booking.total_price ?? 0;
          const renterId = booking.renterId ?? booking.renter_id;
          const ownerId = booking.item?.ownerId ?? booking.item?.owner_id;
          const renterReview = booking.reviews?.find(r => r.type === 'renter_review') ?? booking.review;
          const ownerReview = booking.reviews?.find(r => r.type === 'owner_review');

          return (
            <Card key={booking._id}>
              <CardHeader className="pb-3">
                <div className="flex gap-3">
                  {/* Item photo thumbnail */}
                  {booking.item?.photos && booking.item.photos.length > 0 ? (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-100">
                      <img
                        src={booking.item.photos[0]}
                        alt={booking.item.title || ''}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg flex-shrink-0 bg-gray-100 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base sm:text-lg truncate">{booking.item?.title}</CardTitle>
                      <Badge variant={getStatusVariant(booking.status)} className="flex-shrink-0 text-xs">
                        {booking.status === 'pending_approval' && <Clock className="w-3 h-3 mr-1" />}
                        {getStatusLabel(booking.status)}
                      </Badge>
                    </div>
                    <CardDescription className="mt-0.5">
                      {startDate && new Date(startDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} — {endDate && new Date(endDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </CardDescription>
                    {ownerId === currentUser?._id && booking.renter && (
                      <p className="text-xs text-gray-500 mt-0.5">Арендатор: {booking.renter.name}</p>
                    )}
                    {booking.status === 'pending_approval' && booking.approvalDeadline && (
                      <div className="flex items-center gap-1 text-xs text-amber-600 mt-0.5">
                        <Clock className="w-3 h-3" />
                        <span>Осталось: {getDeadlineText(booking.approvalDeadline)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between font-semibold">
                    <span>Итого:</span>
                    <span>{totalPrice} ₽</span>
                  </div>
                  <div className="text-xs text-gray-500 space-y-0.5">
                    <div className="flex justify-between">
                      <span>Комиссия (онлайн):</span>
                      <span>{booking.commission || 0} ₽</span>
                    </div>
                    <div className="flex justify-between">
                      <span>При встрече (аренда {rentalPrice} ₽ + залог {booking.deposit} ₽):</span>
                      <span>{rentalPrice + booking.deposit} ₽</span>
                    </div>
                  </div>

                  {booking.status === 'cancelled' && booking.rejectionReason && (
                    <div className="flex items-start gap-2 pt-2 text-red-600 bg-red-50 rounded p-2 mt-1">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-xs">Причина отклонения:</span>
                        <p className="text-xs">{booking.rejectionReason}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-3">
                {/* Handover checklist for 'paid' status */}
                {booking.status === 'paid' && (renterId === currentUser?._id || ownerId === currentUser?._id) && (
                  <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <p className="text-sm font-medium text-blue-800">
                      {renterId === currentUser?._id ? 'Подтвердите передачу при встрече' : 'Подтвердите получение при встрече'}
                    </p>
                    {(() => {
                      const isRenter = renterId === currentUser?._id;
                      const depositDone = isRenter ? booking.depositConfirmedByRenter : booking.depositConfirmedByOwner;
                      const remainderDone = isRenter ? booking.remainderConfirmedByRenter : booking.remainderConfirmedByOwner;
                      const otherDepositDone = isRenter ? booking.depositConfirmedByOwner : booking.depositConfirmedByRenter;
                      const otherRemainderDone = isRenter ? booking.remainderConfirmedByOwner : booking.remainderConfirmedByRenter;
                      const alreadyConfirmed = depositDone && remainderDone;

                      if (alreadyConfirmed) {
                        return (
                          <div className="text-sm text-blue-700">
                            <p className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-600" /> Вы подтвердили передачу</p>
                            {otherDepositDone && otherRemainderDone
                              ? <p className="flex items-center gap-1"><CheckCircle className="w-4 h-4 text-green-600" /> Другая сторона тоже подтвердила</p>
                              : <p className="flex items-center gap-1"><Clock className="w-4 h-4 text-amber-500" /> Ожидается подтверждение другой стороны</p>
                            }
                          </div>
                        );
                      }

                      return (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Checkbox id={`deposit-${booking._id}`} disabled />
                            <label htmlFor={`deposit-${booking._id}`} className="text-sm text-gray-700">
                              {isRenter ? 'Залог передан владельцу' : 'Залог получен от арендатора'}
                            </label>
                          </div>
                          <div className="flex items-center gap-2">
                            <Checkbox id={`remainder-${booking._id}`} disabled />
                            <label htmlFor={`remainder-${booking._id}`} className="text-sm text-gray-700">
                              {isRenter ? 'Аренда оплачена владельцу' : 'Оплата аренды получена'}
                            </label>
                          </div>
                          <Button
                            size="sm"
                            className="w-full mt-1"
                            disabled={isConfirmingHandover === booking._id}
                            onClick={() => confirmHandover(booking._id, true, true)}
                          >
                            {isConfirmingHandover === booking._id
                              ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Подтверждение...</>
                              : <><CheckCircle className="w-4 h-4 mr-1" />Подтвердить передачу</>
                            }
                          </Button>
                        </div>
                      );
                    })()}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 w-full">
                {booking.status !== 'cancelled' && booking.status !== 'pending_approval' && onOpenChat && (
                  <Button variant="outline" size="sm" onClick={() => onOpenChat(booking._id)} className="flex items-center gap-1">
                    <MessageCircle className="w-4 h-4" />
                    Чат
                  </Button>
                )}

                {/* Cancel booking (renter or owner, in pending statuses) */}
                {(booking.status === 'pending_approval' || booking.status === 'pending_payment') &&
                  (renterId === currentUser?._id || ownerId === currentUser?._id) && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => cancelBooking(booking._id)}
                    disabled={isCancelling === booking._id}
                  >
                    {isCancelling === booking._id
                      ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Отмена...</>
                      : <><XCircle className="w-4 h-4 mr-1" />Отменить</>
                    }
                  </Button>
                )}

                {/* Renter: Pay commission */}
                {booking.status === 'pending_payment' && renterId === currentUser?._id && (
                  <Button
                    size="sm"
                    onClick={() => payCommission(booking._id)}
                    disabled={isPaying === booking._id}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-xs sm:text-sm"
                  >
                    {isPaying === booking._id
                      ? <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Переход к оплате...</>
                      : <><CreditCard className="w-4 h-4 mr-1" /><span className="hidden sm:inline">Оплатить комиссию</span><span className="sm:hidden">Оплатить</span></>
                    }
                  </Button>
                )}

                {/* Owner: Approve / Reject */}
                {booking.status === 'pending_approval' && ownerId === currentUser?._id && (
                  <>
                    <Button
                      size="sm"
                      onClick={() => approveBooking(booking._id)}
                      disabled={isApproving === booking._id}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-xs sm:text-sm"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {isApproving === booking._id ? 'Одобрение...' : 'Одобрить'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openRejectModal(booking._id)}
                      className="flex-1 text-xs sm:text-sm"
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Отклонить
                    </Button>
                  </>
                )}

                {/* Owner: Confirm return */}
                {booking.status === 'active' && ownerId === currentUser?._id && (
                  <Button size="sm" onClick={() => confirmReturn(booking._id)} className="flex-1">
                    Подтвердить возврат
                  </Button>
                )}

                {/* Renter: leave review on item */}
                {renterId === currentUser?._id && (
                  renterReview ? (
                    <div className="flex items-center gap-1 text-yellow-500 text-sm">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{renterReview.rating}/5</span>
                      <span className="text-gray-500">(отзыв оставлен)</span>
                    </div>
                  ) : canLeaveRenterReview(booking) ? (
                    <Button size="sm" onClick={() => handleOpenReviewModal(booking, 'renter_review')}>
                      Оставить отзыв
                    </Button>
                  ) : null
                )}

                {/* Owner: leave review on renter */}
                {ownerId === currentUser?._id && (
                  ownerReview ? (
                    <div className="flex items-center gap-1 text-blue-500 text-sm">
                      <Star className="w-4 h-4 fill-current" />
                      <span>{ownerReview.rating}/5</span>
                      <span className="text-gray-500">(оценка арендатора)</span>
                    </div>
                  ) : canLeaveOwnerReview(booking) ? (
                    <Button size="sm" variant="outline" onClick={() => handleOpenReviewModal(booking, 'owner_review')}>
                      Оценить арендатора
                    </Button>
                  ) : null
                )}
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {filteredBookings.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {statusFilter !== 'all' ? 'Нет бронирований с выбранным статусом' : 'У вас пока нет бронирований'}
          </p>
        </div>
      )}

      {showReviewModal && selectedBooking && currentUser && (
        <ReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          booking={selectedBooking}
          currentUser={currentUser}
          onSubmit={handleReviewSubmit}
          reviewType={reviewType}
        />
      )}

      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Отклонить бронирование</DialogTitle>
            <DialogDescription>Укажите причину отказа. Арендатор получит уведомление.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Причина отклонения (минимум 5 символов)..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 text-right">{rejectReason.length}/500</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowRejectModal(false)}>Отмена</Button>
            <Button
              variant="destructive"
              onClick={submitReject}
              disabled={isRejecting || rejectReason.trim().length < 5}
            >
              {isRejecting ? 'Отклонение...' : 'Отклонить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
