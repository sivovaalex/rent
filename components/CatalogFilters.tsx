'use client';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Zap, Camera, Shirt, Dumbbell, Hammer, Heart, MapPin, List, Loader2 } from 'lucide-react';
import { getCategoryAttributes, CATEGORY_SUBCATEGORIES, type CategoryKey } from '@/lib/constants';
import type { User, AlertType } from '@/types';

interface CatalogFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  subCategoryFilter: string;
  setSubCategoryFilter: (subcategory: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  catalogView: string;
  setCatalogView: (view: string) => void;
  showAllStatuses: boolean;
  setShowAllStatuses: (show: boolean) => void;
  loadItems: () => Promise<void>;
  showAlert: (message: string, type?: AlertType) => void;
  attributeFilters: Record<string, string>;
  setAttributeFilters: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  viewMode: 'list' | 'map';
  setViewMode: (mode: 'list' | 'map') => void;
  currentUser: User | null;
  // Geo
  nearLat?: number | null;
  nearLon?: number | null;
  radius?: number;
  setNearLocation?: (lat: number | null, lon: number | null) => void;
  setRadius?: (radius: number) => void;
  // Price
  priceMin: string;
  setPriceMin: (value: string) => void;
  priceMax: string;
  setPriceMax: (value: string) => void;
  // Favorites
  showFavoritesOnly: boolean;
  setShowFavoritesOnly?: (show: boolean) => void;
  favoriteIds?: Set<string>;
}

const CatalogFilters = React.memo(function CatalogFilters({
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  subCategoryFilter,
  setSubCategoryFilter,
  sortBy,
  setSortBy,
  catalogView,
  setCatalogView,
  showAllStatuses,
  setShowAllStatuses,
  loadItems,
  showAlert,
  attributeFilters,
  setAttributeFilters,
  viewMode,
  setViewMode,
  currentUser,
  nearLat,
  nearLon,
  radius = 10,
  setNearLocation,
  setRadius,
  priceMin,
  setPriceMin,
  priceMax,
  setPriceMax,
  showFavoritesOnly,
  setShowFavoritesOnly,
  favoriteIds,
}: CatalogFiltersProps) {
  const [geoLoading, setGeoLoading] = useState(false);

  return (
    <>
      {/* View tabs */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="flex gap-1 sm:gap-2 border-b border-gray-200 overflow-x-auto">
          <button
            onClick={() => setCatalogView('all')}
            className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base whitespace-nowrap ${catalogView === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
          >
            Все лоты
          </button>
          {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
            <button
              onClick={() => setCatalogView('mine')}
              className={`px-3 sm:px-4 py-2 font-medium text-sm sm:text-base whitespace-nowrap ${catalogView === 'mine' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
            >
              Мои лоты
            </button>
          )}
        </div>
        {catalogView === 'mine' && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="showAllStatuses"
              checked={showAllStatuses}
              onCheckedChange={(checked) => setShowAllStatuses(checked as boolean)}
            />
            <Label htmlFor="showAllStatuses" className="text-xs sm:text-sm">Показать все статусы</Label>
          </div>
        )}
      </div>

      {/* Search + selects */}
      <div className="flex flex-col gap-2 sm:gap-4">
        <Input
          placeholder="Поиск..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyUp={(e) => e.key === 'Enter' && loadItems()}
          className="w-full text-sm sm:text-base"
        />
        <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-4">
          <Select value={categoryFilter} onValueChange={(value) => {
            setCategoryFilter(value);
            setSubCategoryFilter('all');
            setAttributeFilters({});
          }}>
            <SelectTrigger className="w-full sm:w-[180px] text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              <SelectItem value="stream">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" />
                  <span className="hidden sm:inline">Стрим-</span>оборудование
                </div>
              </SelectItem>
              <SelectItem value="electronics">
                <div className="flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Электроника
                </div>
              </SelectItem>
              <SelectItem value="clothes">
                <div className="flex items-center gap-2">
                  <Shirt className="w-4 h-4" />
                  Одежда
                </div>
              </SelectItem>
              <SelectItem value="sports">
                <div className="flex items-center gap-2">
                  <Dumbbell className="w-4 h-4" />
                  Спорт
                </div>
              </SelectItem>
              <SelectItem value="tools">
                <div className="flex items-center gap-2">
                  <Hammer className="w-4 h-4" />
                  Инструменты
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-full sm:w-[140px] text-xs sm:text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Новые</SelectItem>
              <SelectItem value="price_asc">Цена ↑</SelectItem>
              <SelectItem value="price_desc">Цена ↓</SelectItem>
              <SelectItem value="rating">Рейтинг</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1 col-span-2 sm:col-span-1">
            <Input
              type="number"
              placeholder="Цена от"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && loadItems()}
              className="w-full sm:w-[100px] text-xs sm:text-sm"
              min={0}
              aria-label="Цена от"
            />
            <span className="text-gray-400 text-xs">–</span>
            <Input
              type="number"
              placeholder="до"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              onKeyUp={(e) => e.key === 'Enter' && loadItems()}
              className="w-full sm:w-[100px] text-xs sm:text-sm"
              min={0}
              aria-label="Цена до"
            />
          </div>
          {categoryFilter !== 'all' && (
            <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
              <SelectTrigger className="w-full col-span-2 sm:w-[180px] text-xs sm:text-sm">
                <SelectValue placeholder="Подкатегория" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все подкатегории</SelectItem>
                {CATEGORY_SUBCATEGORIES[categoryFilter as CategoryKey]?.map((subcat) => (
                  <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button onClick={loadItems} className="col-span-2 sm:col-span-1 text-sm">Поиск</Button>
          {/* View toggle */}
          <div className="flex gap-1 border rounded-md p-0.5">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode('list')}
              aria-label="Списком"
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'map' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 px-2"
              onClick={() => setViewMode('map')}
              aria-label="На карте"
            >
              <MapPin className="w-4 h-4" />
            </Button>
          </div>
          {/* Near me button */}
          {setNearLocation && (
            <Button
              variant={nearLat !== null && nearLat !== undefined ? 'default' : 'outline'}
              className="col-span-2 sm:col-span-1 text-sm"
              disabled={geoLoading}
              onClick={() => {
                if (nearLat !== null && nearLat !== undefined) {
                  setNearLocation(null, null);
                  loadItems();
                } else {
                  setGeoLoading(true);
                  navigator.geolocation.getCurrentPosition(
                    (pos) => {
                      setNearLocation(pos.coords.latitude, pos.coords.longitude);
                      setGeoLoading(false);
                    },
                    () => {
                      showAlert('Не удалось определить местоположение. Разрешите доступ к геолокации.', 'error');
                      setGeoLoading(false);
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                  );
                }
              }}
            >
              {geoLoading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <MapPin className="w-4 h-4 mr-1" />}
              {nearLat !== null && nearLat !== undefined ? 'Сбросить' : 'Рядом со мной'}
            </Button>
          )}
          {currentUser && setShowFavoritesOnly && (
            <Button
              variant={showFavoritesOnly ? 'default' : 'outline'}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
              className="col-span-2 sm:col-span-1 text-sm"
            >
              <Heart className={`w-4 h-4 mr-1 ${showFavoritesOnly ? 'fill-current' : ''}`} />
              Избранное
              {favoriteIds && favoriteIds.size > 0 && (
                <span className="ml-1 text-xs">({favoriteIds.size})</span>
              )}
            </Button>
          )}
          {(searchQuery || categoryFilter !== 'all' || showFavoritesOnly || priceMin || priceMax || Object.keys(attributeFilters).length > 0) && (
            <Button
              variant="ghost"
              size="sm"
              className="col-span-2 sm:col-span-1 text-sm text-red-500 hover:text-red-600"
              onClick={() => {
                setSearchQuery('');
                setCategoryFilter('all');
                setSubCategoryFilter('all');
                setAttributeFilters({});
                setPriceMin('');
                setPriceMax('');
                if (setShowFavoritesOnly) setShowFavoritesOnly(false);
              }}
            >
              Сбросить все фильтры
            </Button>
          )}
        </div>
      </div>

      {/* Attribute filters */}
      {categoryFilter !== 'all' && getCategoryAttributes(categoryFilter).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {getCategoryAttributes(categoryFilter).filter(attr => attr.type === 'select').map((attr) => (
            <Select
              key={attr.key}
              value={attributeFilters[attr.key] || 'all'}
              onValueChange={(value) => {
                setAttributeFilters(prev => {
                  const next = { ...prev };
                  if (value === 'all') {
                    delete next[attr.key];
                  } else {
                    next[attr.key] = value;
                  }
                  return next;
                });
              }}
            >
              <SelectTrigger className="w-full sm:w-[150px] text-xs sm:text-sm">
                <SelectValue placeholder={attr.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все: {attr.label}</SelectItem>
                {attr.options?.map((opt) => (
                  <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
          {Object.keys(attributeFilters).length > 0 && (
            <Button variant="ghost" size="sm" onClick={() => setAttributeFilters({})}>
              Сбросить фильтры
            </Button>
          )}
        </div>
      )}

      {/* Radius slider */}
      {nearLat !== null && nearLat !== undefined && setRadius && (
        <div className="flex items-center gap-4 p-3 rounded-lg bg-indigo-50 border border-indigo-200">
          <MapPin className="w-4 h-4 text-indigo-600 shrink-0" />
          <span className="text-sm text-indigo-700 whitespace-nowrap">Радиус: {radius} км</span>
          <Slider
            value={[radius]}
            min={1}
            max={50}
            step={1}
            onValueChange={([v]) => setRadius(v)}
            className="flex-1"
          />
          <Button size="sm" variant="outline" onClick={loadItems} className="shrink-0">
            Применить
          </Button>
        </div>
      )}
    </>
  );
});

export default CatalogFilters;
