'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Star, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { withCommission, formatPrice } from '@/lib/constants';
import type { Item } from '@/types';

interface SimilarItemsProps {
  itemId: string;
  onViewItem?: (id: string) => void;
}

export default function SimilarItems({ itemId, onViewItem }: SimilarItemsProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/items/${itemId}/similar`)
      .then(res => res.ok ? res.json() : { items: [] })
      .then(data => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [itemId]);

  const updateScrollButtons = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    updateScrollButtons();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollButtons, { passive: true });
    const ro = new ResizeObserver(updateScrollButtons);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollButtons);
      ro.disconnect();
    };
  }, [items, updateScrollButtons]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.clientWidth * 0.7;
    el.scrollBy({ left: direction === 'left' ? -distance : distance, behavior: 'smooth' });
  };

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="pt-4 border-t max-w-full overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Похожие предложения
        </h3>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            aria-label="Листать назад"
            className="p-1.5 rounded-full border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-opacity"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            aria-label="Листать вперёд"
            className="p-1.5 rounded-full border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-opacity"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {items.map((item) => (
          <div
            key={item._id}
            className="flex-shrink-0 w-[160px] sm:w-[180px] rounded-lg border bg-white hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
            onClick={() => {
              if (onViewItem) {
                onViewItem(item._id);
              } else {
                window.location.href = `/item/${item._id}`;
              }
            }}
          >
            <div className="relative w-full h-[100px] sm:h-[120px] bg-gray-100">
              {item.photos && item.photos.length > 0 ? (
                <img
                  src={item.photos[0]}
                  alt={item.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                  Нет фото
                </div>
              )}
            </div>
            <div className="p-2">
              <p className="text-sm font-medium truncate" title={item.title}>
                {item.title}
              </p>
              <p className="text-sm font-bold text-indigo-600 mt-1">
                {formatPrice(withCommission(item.pricePerDay || item.price_per_day || 0))} ₽/день
              </p>
              {item.rating !== undefined && item.rating !== null && (
                <div className="flex items-center gap-1 mt-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-xs text-gray-500">{Number(item.rating).toFixed(1)}</span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
