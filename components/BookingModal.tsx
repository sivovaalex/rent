'use client';
import { useState, useEffect, FormEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import type { Item, BookingForm, RentalType } from '@/types';
import { withCommission, formatPrice } from '@/lib/constants';

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

  useEffect(() => {
    if (isOpen && item) {
      setMinDate(new Date());
      setMaxDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
      setSelectedDates([]);
      setDateError('');

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

  const calculateTotalPrice = (): number => {
    if (!bookingForm.start_date || !bookingForm.end_date || !item) return 0;

    const startDate = new Date(bookingForm.start_date);
    const endDate = new Date(bookingForm.end_date);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;

    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    let totalPrice = 0;

    if (bookingForm.rental_type === 'day') {
      totalPrice = diffDays * getItemPrice(item, 'day');
    } else if (bookingForm.rental_type === 'month') {
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      totalPrice = months * getItemPrice(item, 'month') + remainingDays * getItemPrice(item, 'day');
    }

    if (hasInsurance) {
      totalPrice += totalPrice * 0.1;
    }

    return Math.round(withCommission(totalPrice));
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Забронировать {item.title}</DialogTitle>
          <DialogDescription>
            Выберите период аренды и условия
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div>
              <Label>Период аренды</Label>
              <div className="mt-2 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <span className="text-gray-500">
                  {bookingForm.start_date && bookingForm.end_date
                    ? `${format(new Date(bookingForm.start_date), 'dd.MM.yyyy')} - ${format(new Date(bookingForm.end_date), 'dd.MM.yyyy')}`
                    : 'Выберите даты в календаре'}
                </span>
              </div>
            </div>

            <div className="border rounded-lg p-4">
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

          <div className="space-y-4">
            <div>
              <Label>Тип аренды</Label>
              <div className="mt-2 grid grid-cols-2 gap-4">
                <Button
                  type="button"
                  variant={bookingForm.rental_type === 'day' ? 'default' : 'outline'}
                  onClick={() => setBookingForm({ ...bookingForm, rental_type: 'day' as RentalType })}
                  className="flex flex-col items-center justify-center h-24 p-3"
                >
                  <span className="font-medium">Почасовая/Посуточная</span>
                  <span className="text-sm text-gray-500 mt-1">
                    {formatPrice(withCommission(getItemPrice(item, 'day')))} ₽/день
                  </span>
                </Button>
                <Button
                  type="button"
                  variant={bookingForm.rental_type === 'month' ? 'default' : 'outline'}
                  onClick={() => setBookingForm({ ...bookingForm, rental_type: 'month' as RentalType })}
                  className="flex flex-col items-center justify-center h-24 p-3"
                >
                  <span className="font-medium">Долгосрочная</span>
                  <span className="text-sm text-gray-500 mt-1">
                    {formatPrice(withCommission(getItemPrice(item, 'month')))} ₽/месяц
                  </span>
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start space-x-2">
              <Checkbox
                id="insurance"
                checked={hasInsurance}
                onCheckedChange={(checked) => setHasInsurance(checked as boolean)}
              />
              <div className="grid gap-1.5 leading-none">
                <Label htmlFor="insurance" className="text-sm font-medium">
                  Страховка от повреждений
                </Label>
                <p className="text-sm text-gray-500">
                  Страховка покрывает 90% стоимости предмета в случае повреждения. Стоимость страховки - 10% от общей суммы аренды.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Залог:</span>
              <span className="font-bold text-lg">{item.deposit} ₽</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600">Сумма аренды:</span>
              <span className="font-bold text-xl">
                {calculateTotalPrice()} ₽
              </span>
            </div>

            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-gray-600">Итоговая сумма:</span>
              <span className="font-bold text-xl text-indigo-600">
                {+item.deposit + calculateTotalPrice()} ₽
              </span>
            </div>

            <div className="text-xs text-gray-500">
              <p>Залог возвращается после возврата предмета в том же состоянии.</p>
              <p>Страховка действует только при возврате предмета в течение 24 часов после истечения срока аренды.</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Отмена
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? 'Бронирование...' : 'Подтвердить бронирование'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
