'use client';
import { useState, useEffect, FormEvent } from 'react';
import Link from 'next/link';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import type { Item, BookingForm, RentalType, ApprovalMode } from '@/types';
import { withCommission, calculateCommission, formatPrice, COMMISSION_RATE } from '@/lib/constants';
import { BOOKING_CONSENT_LINKS } from '@/lib/constants/legal-links';

type ValuePiece = Date | null;
type Value = ValuePiece | [ValuePiece, ValuePiece];

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  bookingForm: BookingForm;
  setBookingForm: React.Dispatch<React.SetStateAction<BookingForm>>;
  blockedBookingDates: string[];
  onSubmit: () => void | Promise<void>;
}

// Helper to get item price with camelCase priority
const getItemPrice = (item: Item | null, type: 'day' | 'month'): number => {
  if (!item) return 0;
  if (type === 'day') {
    return item.pricePerDay ?? getItemPrice(item, 'day') ?? 0;
  }
  return item.pricePerMonth ?? getItemPrice(item, 'month') ?? 0;
};

export default function BookingModal({
  isOpen,
  onClose,
  item,
  bookingForm,
  setBookingForm,
  blockedBookingDates,
  onSubmit
}: BookingModalProps) {
  const [selectedDates, setSelectedDates] = useState<Date[]>([]);
  const [dateError, setDateError] = useState('');
  const [hasInsurance, setHasInsurance] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [minDate, setMinDate] = useState(new Date());
  const [maxDate, setMaxDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [acceptRentalRules, setAcceptRentalRules] = useState(false);

  useEffect(() => {
    if (isOpen && item) {
      setMinDate(new Date());
      setMaxDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      setSelectedDates([]);
      setDateError('');
      setAcceptRentalRules(false);

      if (bookingForm.start_date && bookingForm.end_date) {
        const startDate = new Date(bookingForm.start_date);
        const endDate = new Date(bookingForm.end_date);

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          const dates: Date[] = [];
          const currentDate = new Date(startDate);

          while (currentDate <= endDate) {
            dates.push(new Date(currentDate));
            currentDate.setDate(currentDate.getDate() + 1);
          }

          setSelectedDates(dates);
        }
      }
    }
  }, [isOpen, item, bookingForm]);

  const isDateBlocked = (date: Date): boolean => {
    const formattedDate = format(date, 'yyyy-MM-dd');
    return blockedBookingDates.includes(formattedDate);
  };

  const handleDateChange = (value: Value) => {
    if (!Array.isArray(value)) return;

    const [start, end] = value;

    if (!start || !end) return;

    let hasBlockedDates = false;
    let currentDate = new Date(start);

    while (currentDate <= end) {
      if (isDateBlocked(currentDate)) {
        hasBlockedDates = true;
        break;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (hasBlockedDates) {
      setDateError('В выбранном периоде есть даты, которые уже забронированы');
      return;
    }

    setDateError('');

    setBookingForm(prev => ({
      ...prev,
      start_date: format(start, 'yyyy-MM-dd'),
      end_date: format(end, 'yyyy-MM-dd')
    }));

    const dates: Date[] = [];
    currentDate = new Date(start);

    while (currentDate <= end) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    setSelectedDates(dates);
  };

  const calculateRentalPrice = (): number => {
    if (!bookingForm.start_date || !bookingForm.end_date || !item) return 0;

    const startDate = new Date(bookingForm.start_date);
    const endDate = new Date(bookingForm.end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let price = 0;

    if (bookingForm.rental_type === 'day') {
      price = diffDays * getItemPrice(item, 'day');
    } else if (bookingForm.rental_type === 'month') {
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      price = months * getItemPrice(item, 'month') + remainingDays * getItemPrice(item, 'day');
    }

    if (hasInsurance) {
      price += price * 0.1;
    }

    return Math.round(price);
  };

  const calculateCommissionAmount = (): number => {
    return calculateCommission(calculateRentalPrice());
  };

  const calculateTotalPrice = (): number => {
    return Math.round(withCommission(calculateRentalPrice()));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!bookingForm.start_date || !bookingForm.end_date) {
      setDateError('Пожалуйста, выберите период аренды');
      return;
    }

    let hasBlockedDates = false;
    let currentDate = new Date(bookingForm.start_date);
    const endDate = new Date(bookingForm.end_date);

    while (currentDate <= endDate) {
      if (isDateBlocked(currentDate)) {
        hasBlockedDates = true;
        break;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    if (hasBlockedDates) {
      setDateError('В выбранном периоде есть даты, которые уже забронированы');
      return;
    }

    if (!acceptRentalRules) {
      setDateError('Необходимо принять правила аренды');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit();
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !item) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-[calc(100%-1rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl pr-6">Забронировать {item.title}</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Выберите период аренды и условия
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 py-2 sm:py-4">
          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-sm sm:text-base">Период аренды</Label>
              <div className="mt-1 sm:mt-2 flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 flex-shrink-0" />
                <span className="text-gray-500 text-xs sm:text-sm">
                  {bookingForm.start_date && bookingForm.end_date
                    ? `${format(new Date(bookingForm.start_date), 'dd.MM.yyyy')} - ${format(new Date(bookingForm.end_date), 'dd.MM.yyyy')}`
                    : 'Выберите даты в календаре'}
                </span>
              </div>
            </div>

            <div className="border rounded-lg p-2 sm:p-4 overflow-x-auto">
              <Calendar
                selectRange={true}
                value={selectedDates.length > 0 ? [selectedDates[0], selectedDates[selectedDates.length - 1]] : undefined}
                onChange={handleDateChange}
                minDate={minDate}
                maxDate={maxDate}
                tileDisabled={({ date }) => isDateBlocked(date)}
                tileClassName={({ date }) =>
                  isDateBlocked(date) ? 'bg-red-100 text-red-500 line-through' : ''
                }
              />
            </div>

            {dateError && (
              <p className="text-red-500 text-sm">{dateError}</p>
            )}

            <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
              <p>Серым цветом отмечены даты, которые уже забронированы и недоступны для выбора.</p>
              <p>Минимальный срок аренды - 1 день, максимальный - 30 дней.</p>
            </div>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div>
              <Label className="text-sm sm:text-base">Тип аренды</Label>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:gap-4">
                <Button
                  type="button"
                  variant={bookingForm.rental_type === 'day' ? 'default' : 'outline'}
                  onClick={() => setBookingForm({ ...bookingForm, rental_type: 'day' as RentalType })}
                  className="flex flex-col items-center justify-center h-16 sm:h-24 p-2 sm:p-3"
                >
                  <span className="font-medium text-xs sm:text-sm">Посуточная</span>
                  <span className="text-xs sm:text-sm text-gray-500 mt-1">
                    {formatPrice(withCommission(getItemPrice(item, 'day')))} ₽/день
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={bookingForm.rental_type === 'month' ? 'default' : 'outline'}
                  onClick={() => setBookingForm({ ...bookingForm, rental_type: 'month' as RentalType })}
                  className="flex flex-col items-center justify-center h-16 sm:h-24 p-2 sm:p-3"
                >
                  <span className="font-medium text-xs sm:text-sm">Долгосрочная</span>
                  <span className="text-xs sm:text-sm text-gray-500 mt-1">
                    {formatPrice(withCommission(getItemPrice(item, 'month')))} ₽/мес
                  </span>
                </Button>
              </div>
            </div>
          </div>

          {/* Страховка временно отключена
          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="insurance"
                checked={hasInsurance}
                onCheckedChange={(checked) => setHasInsurance(checked as boolean)}
                className="mt-0.5"
              />
              <div className="grid gap-1 leading-none">
                <Label htmlFor="insurance" className="text-xs sm:text-sm font-medium cursor-pointer">
                  Страховка от повреждений
                </Label>
                <p className="text-xs text-gray-500">
                  Покрывает 90% стоимости при повреждении. Стоимость - 10% от суммы аренды.
                </p>
              </div>
            </div>
          </div>
          */}

          <div className="space-y-2 sm:space-y-4 p-3 sm:p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Стоимость аренды:</span>
              <span className="font-medium text-sm">{formatPrice(calculateRentalPrice())} ₽</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Залог:</span>
              <span className="font-medium text-sm">{formatPrice(item.deposit)} ₽</span>
            </div>
            {/* Страховка временно отключена
            {hasInsurance && (
              <div className="flex justify-between items-center">
                <span className="text-gray-600 text-sm">Страховка (10%):</span>
                <span className="font-medium text-sm">включена в аренду</span>
              </div>
            )}
            */}
            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Комиссия сервиса ({Math.round(COMMISSION_RATE * 100)}%):</span>
              <span className="font-medium text-sm">{formatPrice(calculateCommissionAmount())} ₽</span>
            </div>

            <div className="pt-2 border-t space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-gray-900 font-semibold">Итого:</span>
                <span className="font-bold text-lg text-gray-900">
                  {formatPrice(calculateRentalPrice() + item.deposit + calculateCommissionAmount())} ₽
                </span>
              </div>
              <div className="ml-3 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-indigo-700 text-sm font-medium">Оплата онлайн (комиссия):</span>
                  <span className="font-semibold text-sm text-indigo-600">
                    {formatPrice(calculateCommissionAmount())} ₽
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 text-sm">При встрече (аренда + залог):</span>
                  <span className="font-medium text-sm">
                    {formatPrice(calculateRentalPrice() + item.deposit)} ₽
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[10px] sm:text-xs text-gray-500 pt-1">
              <p>Комиссия оплачивается онлайн. Аренда и залог — при встрече с владельцем.</p>
              <p>Залог возвращается после возврата предмета.</p>
            </div>
          </div>

          {/* Инфо о режиме одобрения */}
          {item.approvalMode && item.approvalMode !== 'auto_approve' && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-amber-800">
                {item.approvalMode === 'manual' && (
                  <p>Владелец рассмотрит ваш запрос на бронирование в течение 24 часов.</p>
                )}
                {item.approvalMode === 'rating_based' && (
                  <p>
                    Авто-одобрение при рейтинге от {item.approvalThreshold || 4.0}.
                    Если ваш рейтинг ниже, владелец рассмотрит запрос вручную (до 24 часов).
                  </p>
                )}
                {item.approvalMode === 'verified_only' && (
                  <p>
                    Авто-одобрение только для верифицированных пользователей.
                    Иначе владелец рассмотрит запрос вручную (до 24 часов).
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Согласие с правилами аренды */}
          <div className="flex items-start space-x-2 pt-2 border-t">
            <Checkbox
              id="accept-rental-rules"
              checked={acceptRentalRules}
              onCheckedChange={(checked) => setAcceptRentalRules(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="accept-rental-rules" className="text-xs sm:text-sm text-gray-600 leading-tight cursor-pointer">
              Ознакомлен(а) с{' '}
              <Link
                href={BOOKING_CONSENT_LINKS.rentalRules.href}
                target="_blank"
                className="text-indigo-600 hover:underline"
              >
                {BOOKING_CONSENT_LINKS.rentalRules.shortLabel}
              </Link>
            </label>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3 sm:pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting || !acceptRentalRules} className="w-full sm:w-auto">
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting
                ? (item.approvalMode && item.approvalMode !== 'auto_approve' ? 'Отправка запроса...' : 'Бронирование...')
                : (item.approvalMode && item.approvalMode !== 'auto_approve' ? 'Отправить запрос' : 'Забронировать')
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
