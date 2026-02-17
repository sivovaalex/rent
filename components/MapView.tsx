'use client';

import { useState, useMemo } from 'react';
import { YandexMap, MapMarker } from './YandexMap';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Category, Item } from '@/types';
import { withCommission } from '@/lib/constants';
const CATEGORY_LABELS: Record<string, string> = {
  stream: 'Стрим-оборудование',
  electronics: 'Электроника',
  clothes: 'Одежда',
  sports: 'Спорт',
  tools: 'Инструменты',
};

interface MapViewProps {
  items: Item[];
  onItemClick: (id: string) => void;
  userLocation?: [number, number] | null;
  radiusKm?: number;
}

export function MapView({ items, onItemClick, userLocation, radiusKm }: MapViewProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [priceMax, setPriceMax] = useState<string>('');

  const filteredItems = useMemo(() => {
    let result = items.filter((item) => item.latitude && item.longitude);
    if (categoryFilter !== 'all') {
      result = result.filter((item) => item.category === categoryFilter);
    }
    if (priceMax) {
      const max = parseFloat(priceMax);
      if (!isNaN(max)) {
        result = result.filter((item) => withCommission(item.pricePerDay) <= max);
      }
    }
    return result;
  }, [items, categoryFilter, priceMax]);

  const markers: MapMarker[] = useMemo(() =>
    filteredItems.map((item) => ({
      id: item._id,
      lat: item.latitude!,
      lng: item.longitude!,
      title: item.title,
      price: withCommission(item.pricePerDay),
      priceMonth: item.pricePerMonth ? withCommission(item.pricePerMonth) : undefined,
      deposit: item.deposit,
      photo: item.photos?.[0] || undefined,
      category: item.category,
    })),
    [filteredItems]
  );

  const center: [number, number] = useMemo(() => {
    if (userLocation) return userLocation;
    if (markers.length > 0) {
      const avgLat = markers.reduce((s, m) => s + m.lat, 0) / markers.length;
      const avgLng = markers.reduce((s, m) => s + m.lng, 0) / markers.length;
      return [avgLat, avgLng];
    }
    return [55.751574, 37.573856]; // Moscow
  }, [markers, userLocation]);

  return (
    <div className="space-y-3">
      {/* Filters bar */}
      <div className="flex flex-wrap gap-2">
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Категория" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            {Object.entries(CATEGORY_LABELS).map(([key, label]: [string, string]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          type="number"
          placeholder="Макс. цена/день"
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          className="w-[160px]"
        />

        <div className="flex items-center text-sm text-muted-foreground ml-auto">
          {filteredItems.length} {filteredItems.length === 1 ? 'лот' : 'лотов'} на карте
        </div>
      </div>

      {/* Map */}
      <YandexMap
        center={center}
        zoom={userLocation ? 13 : 12}
        markers={markers}
        onMarkerClick={onItemClick}
        showUserLocation={userLocation}
        radiusKm={radiusKm}
        className="h-[calc(100vh-280px)] min-h-[400px]"
      />
    </div>
  );
}
