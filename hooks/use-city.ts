'use client';
import { useState } from 'react';
import { CITIES, DEFAULT_CITY_KEY, CITY_STORAGE_KEY } from '@/lib/constants';
import type { City } from '@/lib/constants';

export function useCity() {
  const [cityKey, setCityKeyState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CITY_STORAGE_KEY) || DEFAULT_CITY_KEY;
    }
    return DEFAULT_CITY_KEY;
  });

  const city: City = CITIES.find(c => c.key === cityKey) || CITIES[0];

  const setCityKey = (key: string) => {
    setCityKeyState(key);
    if (typeof window !== 'undefined') {
      localStorage.setItem(CITY_STORAGE_KEY, key);
    }
  };

  return { city, cityKey, setCityKey, cities: CITIES };
}
