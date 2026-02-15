/// <reference types="vitest/globals" />
import { renderHook, act } from '@testing-library/react';
import { useCity } from '@/hooks/use-city';
import { DEFAULT_CITY_KEY, CITY_STORAGE_KEY } from '@/lib/constants';

describe('useCity', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('начальное значение — DEFAULT_CITY_KEY (moscow)', () => {
    const { result } = renderHook(() => useCity());

    expect(result.current.cityKey).toBe(DEFAULT_CITY_KEY);
    expect(result.current.city.name).toBe('Москва');
  });

  test('при смене города — записывается в localStorage', () => {
    const { result } = renderHook(() => useCity());

    act(() => {
      result.current.setCityKey('moscow');
    });

    expect(localStorage.getItem(CITY_STORAGE_KEY)).toBe('moscow');
    expect(result.current.cityKey).toBe('moscow');
  });

  test('при инициализации — читает из localStorage', () => {
    localStorage.setItem(CITY_STORAGE_KEY, 'moscow');

    const { result } = renderHook(() => useCity());

    expect(result.current.cityKey).toBe('moscow');
    expect(result.current.city.name).toBe('Москва');
  });

  test('неизвестный ключ — fallback на первый город', () => {
    localStorage.setItem(CITY_STORAGE_KEY, 'unknown-city');

    const { result } = renderHook(() => useCity());

    expect(result.current.cityKey).toBe('unknown-city');
    expect(result.current.city.name).toBe('Москва'); // fallback to first city
  });

  test('cities содержит список доступных городов', () => {
    const { result } = renderHook(() => useCity());

    expect(result.current.cities.length).toBeGreaterThan(0);
    expect(result.current.cities[0].key).toBe('moscow');
  });
});
