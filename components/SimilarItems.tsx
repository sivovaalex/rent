'use client';
import { useState, useEffect } from 'react';
import { Star, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import { withCommission, formatPrice } from '@/lib/constants';
import type { Item } from '@/types';

interface SimilarItemsProps {
  itemId: string;
  onViewItem?: (id: string) => void;
}

const MOBILE_PAGE_SIZE = 2;

function SimilarCard({ item, onViewItem }: { item: Item; onViewItem?: (id: string) => void }) {
  return (
    <div
      className="rounded-lg border bg-white hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
      onClick={() => {
        if (onViewItem) {
          onViewItem(item._id);
        } else {
          window.location.href = `/item/${item._id}`;
        }
      }}
    >
      <div className="w-full h-[100px] sm:h-[120px] bg-gray-100">
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
  );
}

export default function SimilarItems({ itemId, onViewItem }: SimilarItemsProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobilePage, setMobilePage] = useState(0);

  useEffect(() => {
    setLoading(true);
    setMobilePage(0);
    fetch(`/api/items/${itemId}/similar`)
      .then(res => res.ok ? res.json() : { items: [] })
      .then(data => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading) return null;
  if (items.length === 0) return null;

  const mobileTotalPages = Math.ceil(items.length / MOBILE_PAGE_SIZE);
  const mobileSlice = items.slice(
    mobilePage * MOBILE_PAGE_SIZE,
    mobilePage * MOBILE_PAGE_SIZE + MOBILE_PAGE_SIZE
  );

  return (
    <div className="pt-4 border-t">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-lg flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Похожие предложения
        </h3>
        {/* Navigation buttons — always visible when > 1 page on mobile / > visible on desktop */}
        {items.length > MOBILE_PAGE_SIZE && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setMobilePage(p => Math.max(0, p - 1))}
              disabled={mobilePage === 0}
              aria-label="Листать назад"
              className="p-1.5 rounded-full border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-opacity"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-gray-400 min-w-[3ch] text-center">
              {mobilePage + 1}/{mobileTotalPages}
            </span>
            <button
              type="button"
              onClick={() => setMobilePage(p => Math.min(mobileTotalPages - 1, p + 1))}
              disabled={mobilePage >= mobileTotalPages - 1}
              aria-label="Листать вперёд"
              className="p-1.5 rounded-full border bg-white hover:bg-gray-50 disabled:opacity-30 disabled:cursor-default transition-opacity"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Grid: 2 columns, no horizontal overflow */}
      <div className="grid grid-cols-2 gap-3">
        {mobileSlice.map((item) => (
          <SimilarCard key={item._id} item={item} onViewItem={onViewItem} />
        ))}
      </div>
    </div>
  );
}
