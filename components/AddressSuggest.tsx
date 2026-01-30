'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search } from 'lucide-react';

interface AddressSuggestProps {
  value: string;
  onChange: (address: string, lat: number | null, lng: number | null) => void;
  placeholder?: string;
  className?: string;
}

export function AddressSuggest({
  value,
  onChange,
  placeholder = 'Начните вводить адрес...',
  className = '',
}: AddressSuggestProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const suggestRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const placemarkRef = useRef<any>(null);
  const [localValue, setLocalValue] = useState(value);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Geocode address text to coordinates
  const geocodeAddress = useCallback((address: string) => {
    if (!address.trim() || !window.ymaps) return;
    setGeocoding(true);
    window.ymaps.ready(() => {
      window.ymaps.geocode(address, { results: 1 }).then((res: any) => {
        const firstGeoObject = res.geoObjects.get(0);
        if (firstGeoObject) {
          const coordsArr = firstGeoObject.geometry.getCoordinates();
          const lat = coordsArr[0];
          const lng = coordsArr[1];
          const fullAddress = firstGeoObject.getAddressLine();
          setCoords({ lat, lng });
          setLocalValue(fullAddress);
          onChange(fullAddress, lat, lng);
        } else {
          // Address not found — show map for manual pick
          setShowMap(true);
        }
        setGeocoding(false);
      }).catch(() => {
        setGeocoding(false);
        setShowMap(true);
      });
    });
  }, [onChange]);

  // Init SuggestView
  useEffect(() => {
    if (!inputRef.current || !window.ymaps) return;

    const init = () => {
      window.ymaps.ready(() => {
        if (suggestRef.current) return;

        suggestRef.current = new window.ymaps.SuggestView(inputRef.current!, {
          results: 5,
        });

        suggestRef.current.events.add('select', (e: any) => {
          const selectedValue = e.get('item').value;
          setLocalValue(selectedValue);

          window.ymaps.geocode(selectedValue, { results: 1 }).then((res: any) => {
            const firstGeoObject = res.geoObjects.get(0);
            if (firstGeoObject) {
              const coordsArr = firstGeoObject.geometry.getCoordinates();
              const lat = coordsArr[0];
              const lng = coordsArr[1];
              setCoords({ lat, lng });
              setShowMap(false);
              onChange(selectedValue, lat, lng);
            } else {
              onChange(selectedValue, null, null);
            }
          });
        });
      });
    };

    if (window.ymaps) {
      init();
    } else {
      const interval = setInterval(() => {
        if (window.ymaps) {
          clearInterval(interval);
          init();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, []);

  // Init map picker when shown
  useEffect(() => {
    if (!showMap || !mapContainerRef.current || !window.ymaps) return;

    window.ymaps.ready(() => {
      if (mapRef.current) {
        mapRef.current.destroy();
      }

      const center: [number, number] = coords
        ? [coords.lat, coords.lng]
        : [55.751574, 37.573856];

      const map = new window.ymaps.Map(mapContainerRef.current, {
        center,
        zoom: coords ? 15 : 10,
        controls: ['zoomControl', 'geolocationControl'],
      });

      mapRef.current = map;

      // Add existing placemark if coords known
      if (coords) {
        const placemark = new window.ymaps.Placemark([coords.lat, coords.lng], {}, {
          preset: 'islands#violetDotIcon',
          draggable: true,
        });
        placemarkRef.current = placemark;
        map.geoObjects.add(placemark);

        placemark.events.add('dragend', () => {
          const newCoords = placemark.geometry.getCoordinates();
          reverseGeocode(newCoords[0], newCoords[1]);
        });
      }

      // Click on map to place/move marker
      map.events.add('click', (e: any) => {
        const clickCoords = e.get('coords');

        if (placemarkRef.current) {
          placemarkRef.current.geometry.setCoordinates(clickCoords);
        } else {
          const placemark = new window.ymaps.Placemark(clickCoords, {}, {
            preset: 'islands#violetDotIcon',
            draggable: true,
          });
          placemarkRef.current = placemark;
          map.geoObjects.add(placemark);

          placemark.events.add('dragend', () => {
            const newCoords = placemark.geometry.getCoordinates();
            reverseGeocode(newCoords[0], newCoords[1]);
          });
        }

        reverseGeocode(clickCoords[0], clickCoords[1]);
      });
    });

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
        placemarkRef.current = null;
      }
    };
  }, [showMap]);

  const reverseGeocode = (lat: number, lng: number) => {
    window.ymaps.geocode([lat, lng], { results: 1 }).then((res: any) => {
      const firstGeoObject = res.geoObjects.get(0);
      if (firstGeoObject) {
        const address = firstGeoObject.getAddressLine();
        setLocalValue(address);
        setCoords({ lat, lng });
        onChange(address, lat, lng);
      } else {
        setCoords({ lat, lng });
        onChange(localValue, lat, lng);
      }
    });
  };

  const handleBlur = () => {
    // If address typed manually without selecting from suggest and no coords — try geocoding
    if (localValue.trim() && !coords) {
      geocodeAddress(localValue);
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value);
            setCoords(null);
            onChange(e.target.value, null, null);
          }}
          onBlur={handleBlur}
          placeholder={placeholder}
          className="pl-9 pr-20"
        />
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
          {localValue.trim() && !coords && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              disabled={geocoding}
              onClick={() => geocodeAddress(localValue)}
            >
              <Search className="w-3 h-3" />
            </Button>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowMap(!showMap)}
          >
            {showMap ? 'Скрыть' : 'На карте'}
          </Button>
        </div>
      </div>

      {coords && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Координаты определены: {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
        </p>
      )}

      {!coords && localValue.trim() && !geocoding && (
        <p className="text-xs text-amber-600">
          Координаты не определены. Выберите адрес из подсказок, нажмите поиск или укажите на карте.
        </p>
      )}

      {showMap && (
        <div
          ref={mapContainerRef}
          className="w-full rounded-lg overflow-hidden border"
          style={{ height: 300 }}
        />
      )}
    </div>
  );
}
