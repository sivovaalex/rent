'use client';

import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    ymaps: any;
  }
}

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  price?: number;
  photo?: string;
  category?: string;
}

interface YandexMapProps {
  center?: [number, number]; // [lat, lng]
  zoom?: number;
  markers?: MapMarker[];
  onMarkerClick?: (id: string) => void;
  className?: string;
  showUserLocation?: [number, number] | null;
  radiusKm?: number;
}

export function YandexMap({
  center = [55.751574, 37.573856], // Moscow default
  zoom = 12,
  markers = [],
  onMarkerClick,
  className = '',
  showUserLocation,
  radiusKm,
}: YandexMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const clustererRef = useRef<any>(null);

  const initMap = useCallback(() => {
    if (!containerRef.current || !window.ymaps) return;

    window.ymaps.ready(() => {
      if (mapRef.current) {
        mapRef.current.destroy();
      }

      const map = new window.ymaps.Map(containerRef.current, {
        center,
        zoom,
        controls: ['zoomControl', 'geolocationControl'],
      });

      mapRef.current = map;

      // Clusterer
      const clusterer = new window.ymaps.Clusterer({
        preset: 'islands#invertedVioletClusterIcons',
        groupByCoordinates: false,
        clusterDisableClickZoom: false,
        clusterBalloonContentLayout: 'cluster#balloonCarousel',
      });

      clustererRef.current = clusterer;

      // Add markers
      const placemarks = markers.map((m) => {
        const placemark = new window.ymaps.Placemark(
          [m.lat, m.lng],
          {
            balloonContentHeader: m.title,
            balloonContentBody: [
              m.photo ? `<img src="${m.photo}" style="width:120px;height:80px;object-fit:cover;border-radius:8px;margin-bottom:4px" />` : '',
              m.price ? `<div style="font-weight:600;color:#4f46e5">${m.price} ₽/день</div>` : '',
              `<a href="#" onclick="window.__ymapItemClick__('${m.id}');return false" style="color:#4f46e5;font-size:13px">Подробнее →</a>`,
            ].filter(Boolean).join('<br/>'),
            hintContent: m.title,
          },
          {
            preset: 'islands#violetDotIcon',
          }
        );

        return placemark;
      });

      clusterer.add(placemarks);
      map.geoObjects.add(clusterer);

      // User location circle
      if (showUserLocation && radiusKm) {
        const circle = new window.ymaps.Circle(
          [showUserLocation, radiusKm * 1000],
          { balloonContent: `Радиус поиска: ${radiusKm} км` },
          {
            fillColor: '#4f46e520',
            strokeColor: '#4f46e5',
            strokeWidth: 2,
          }
        );
        map.geoObjects.add(circle);
      }

      // Fit bounds if there are markers
      if (markers.length > 0) {
        map.setBounds(clusterer.getBounds(), { checkZoomRange: true, zoomMargin: 40 });
      }
    });
  }, [center, zoom, markers, showUserLocation, radiusKm]);

  // Global click handler for balloon links
  useEffect(() => {
    (window as any).__ymapItemClick__ = (id: string) => {
      onMarkerClick?.(id);
    };
    return () => {
      delete (window as any).__ymapItemClick__;
    };
  }, [onMarkerClick]);

  useEffect(() => {
    const checkYmaps = () => {
      if (window.ymaps) {
        initMap();
      } else {
        setTimeout(checkYmaps, 200);
      }
    };
    checkYmaps();

    return () => {
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, [initMap]);

  return (
    <div
      ref={containerRef}
      className={`w-full rounded-lg overflow-hidden ${className}`}
      style={{ minHeight: 400 }}
    />
  );
}
