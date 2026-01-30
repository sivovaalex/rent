'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, Search, Loader2, CheckCircle2 } from 'lucide-react';

interface AddressSuggestProps {
  value: string;
  onChange: (address: string, lat: number | null, lng: number | null) => void;
  placeholder?: string;
  className?: string;
}

// Status: idle (empty), typing (user is typing), geocoding (loading), resolved (coords found), failed (not found)
type GeoStatus = 'idle' | 'typing' | 'geocoding' | 'resolved' | 'failed';

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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [localValue, setLocalValue] = useState(value);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [geoStatus, setGeoStatus] = useState<GeoStatus>('idle');

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const geocodeAddress = useCallback((address: string) => {
    if (!address.trim() || !window.ymaps) return;
    setGeoStatus('geocoding');
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
          setGeoStatus('resolved');
          onChange(fullAddress, lat, lng);
        } else {
          setGeoStatus('failed');
          setShowMap(true);
        }
      }).catch(() => {
        setGeoStatus('failed');
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
          setGeoStatus('geocoding');

          window.ymaps.geocode(selectedValue, { results: 1 }).then((res: any) => {
            const firstGeoObject = res.geoObjects.get(0);
            if (firstGeoObject) {
              const coordsArr = firstGeoObject.geometry.getCoordinates();
              const lat = coordsArr[0];
              const lng = coordsArr[1];
              setCoords({ lat, lng });
              setShowMap(false);
              setGeoStatus('resolved');
              onChange(selectedValue, lat, lng);
            } else {
              setGeoStatus('failed');
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
    setGeoStatus('geocoding');
    window.ymaps.geocode([lat, lng], { results: 1 }).then((res: any) => {
      const firstGeoObject = res.geoObjects.get(0);
      if (firstGeoObject) {
        const address = firstGeoObject.getAddressLine();
        setLocalValue(address);
        setCoords({ lat, lng });
        setGeoStatus('resolved');
        onChange(address, lat, lng);
      } else {
        setCoords({ lat, lng });
        setGeoStatus('resolved');
        onChange(localValue, lat, lng);
      }
    });
  };

  const statusIndicator = () => {
    switch (geoStatus) {
      case 'geocoding':
        return (
          <span className="absolute right-24 top-1/2 -translate-y-1/2">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
          </span>
        );
      case 'resolved':
        return (
          <span className="absolute right-24 top-1/2 -translate-y-1/2">
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </span>
        );
      default:
        return null;
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
            const val = e.target.value;
            setLocalValue(val);
            setCoords(null);
            onChange(val, null, null);

            if (debounceRef.current) clearTimeout(debounceRef.current);

            if (val.trim().length >= 5) {
              setGeoStatus('typing');
              debounceRef.current = setTimeout(() => {
                geocodeAddress(val);
              }, 1000);
            } else {
              setGeoStatus(val.trim() ? 'typing' : 'idle');
            }
          }}
          placeholder={placeholder}
          className="pl-9 pr-28"
        />
        {statusIndicator()}
        <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-1">
          {localValue.trim() && !coords && geoStatus !== 'geocoding' && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
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

      {geoStatus === 'resolved' && coords && (
        <p className="text-xs text-green-600 flex items-center gap-1">
          <CheckCircle2 className="w-3 h-3" />
          Координаты определены
        </p>
      )}

      {geoStatus === 'failed' && (
        <p className="text-xs text-amber-600">
          Не удалось определить координаты. Уточните адрес или укажите на карте.
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
