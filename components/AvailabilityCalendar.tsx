'use client';
import { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { format } from 'date-fns';
import { CalendarDays } from 'lucide-react';

interface AvailabilityCalendarProps {
  itemId: string;
}

export default function AvailabilityCalendar({ itemId }: AvailabilityCalendarProps) {
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/items/${itemId}/blocked-booking-dates`)
      .then(res => res.ok ? res.json() : { dates: [] })
      .then(data => setBlockedDates(data.dates || []))
      .catch(() => setBlockedDates([]))
      .finally(() => setLoading(false));
  }, [itemId]);

  const isDateBlocked = (date: Date): boolean => {
    return blockedDates.includes(format(date, 'yyyy-MM-dd'));
  };

  const tileClassName = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null;
    if (isDateBlocked(date)) return 'availability-blocked';
    if (date >= new Date(new Date().setHours(0, 0, 0, 0))) return 'availability-free';
    return null;
  };

  return (
    <div>
      <h3 className="font-semibold mb-2 flex items-center gap-2">
        <CalendarDays className="w-4 h-4" />
        Календарь доступности
      </h3>
      {loading ? (
        <div className="h-[280px] flex items-center justify-center text-gray-400 text-sm">
          Загрузка...
        </div>
      ) : (
        <>
          <div className="availability-calendar">
            <Calendar
              minDate={new Date()}
              tileClassName={tileClassName}
              locale="ru-RU"
              selectRange={false}
              value={null}
            />
          </div>
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-green-100 border border-green-300 inline-block" />
              Свободно
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm bg-red-100 border border-red-300 inline-block" />
              Занято
            </div>
          </div>
        </>
      )}
    </div>
  );
}
