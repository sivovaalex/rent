'use client';
import { useState, useEffect } from 'react';
import { Star, Layers } from 'lucide-react';
import { withCommission, formatPrice } from '@/lib/constants';
import type { Item } from '@/types';

interface SimilarItemsProps {
  itemId: string;
  onViewItem?: (id: string) => void;
}

export default function SimilarItems({ itemId, onViewItem }: SimilarItemsProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/items/${itemId}/similar`)
      .then(res => res.ok ? res.json() : { items: [] })
      .then(data => setItems(data.items || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [itemId]);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="pt-4 border-t">
      <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
        <Layers className="w-5 h-5" />
        Похожие предложения
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {items.map((item) => {
          const card = (
            <div
              key={item._id}
              className="flex-shrink-0 w-[180px] rounded-lg border bg-white hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
              onClick={() => {
                if (onViewItem) {
                  onViewItem(item._id);
                } else {
                  window.location.href = `/item/${item._id}`;
                }
              }}
            >
              <div className="relative w-full h-[120px] bg-gray-100">
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
          return card;
        })}
      </div>
    </div>
  );
}
