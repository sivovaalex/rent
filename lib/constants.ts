/**
 * Application constants
 */

// ==================== CATEGORY ATTRIBUTES ====================

export interface CategoryAttribute {
  key: string;
  label: string;
  type: 'text' | 'select';
  options?: string[];
  placeholder?: string;
}

export const CATEGORY_ATTRIBUTES: Record<string, CategoryAttribute[]> = {
  electronics: [
    { key: 'brand', label: 'Бренд', type: 'select', options: ['Apple', 'Samsung', 'Sony', 'Xiaomi', 'Huawei', 'Asus', 'Lenovo', 'Canon', 'Nikon', 'Другой'] },
    { key: 'model', label: 'Модель', type: 'text', placeholder: 'Например: iPhone 15 Pro' },
    { key: 'condition', label: 'Состояние', type: 'select', options: ['Новое', 'Отличное', 'Хорошее', 'Удовлетворительное'] },
  ],
  clothes: [
    { key: 'brand', label: 'Бренд', type: 'select', options: ['Nike', 'Adidas', 'Zara', 'H&M', 'Uniqlo', 'Gucci', 'Prada', 'The North Face', 'Columbia', 'Другой'] },
    { key: 'size', label: 'Размер', type: 'select', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL'] },
    { key: 'gender', label: 'Пол', type: 'select', options: ['Мужской', 'Женский', 'Унисекс'] },
    { key: 'season', label: 'Сезон', type: 'select', options: ['Лето', 'Зима', 'Весна/Осень', 'Всесезонный'] },
  ],
  stream: [
    { key: 'brand', label: 'Бренд', type: 'select', options: ['Elgato', 'Logitech', 'Razer', 'HyperX', 'Blue', 'Rode', 'Shure', 'Sony', 'Другой'] },
    { key: 'connectionType', label: 'Тип подключения', type: 'select', options: ['USB', 'XLR', 'HDMI', 'Wi-Fi', 'Bluetooth', 'Jack 3.5mm'] },
  ],
  sports: [
    { key: 'brand', label: 'Бренд', type: 'select', options: ['Nike', 'Adidas', 'Puma', 'Reebok', 'Salomon', 'Head', 'Fischer', 'Burton', 'Другой'] },
    { key: 'size', label: 'Размер', type: 'text', placeholder: 'Например: L, 42, 175 см' },
    { key: 'level', label: 'Уровень', type: 'select', options: ['Любительский', 'Полупрофессиональный', 'Профессиональный'] },
  ],
  tools: [
    { key: 'brand', label: 'Бренд', type: 'select', options: ['Bosch', 'Makita', 'DeWalt', 'Metabo', 'Husqvarna', 'Stihl', 'Интерскол', 'Другой'] },
    { key: 'powerType', label: 'Тип питания', type: 'select', options: ['Аккумулятор', 'Сеть 220В', 'Ручной', 'Бензиновый'] },
    { key: 'purpose', label: 'Назначение', type: 'select', options: ['Строительство', 'Ремонт', 'Сад и огород', 'Автомобиль', 'Сантехника', 'Электрика', 'Универсальный'] },
  ],
};

export function getCategoryAttributes(category: string): CategoryAttribute[] {
  return CATEGORY_ATTRIBUTES[category] ?? [];
}

// ==================== CATEGORY SUBCATEGORIES ====================

export type CategoryKey = 'stream' | 'electronics' | 'clothes' | 'sports' | 'tools';

export const CATEGORY_SUBCATEGORIES: Record<CategoryKey, string[]> = {
  stream: ['Микрофоны', 'Камеры', 'Освещение', 'Звуковое оборудование', 'Триподы'],
  electronics: ['Телефоны', 'Ноутбуки', 'Планшеты', 'Фотоаппараты', 'Аудиотехника'],
  clothes: ['Верхняя одежда', 'Обувь', 'Аксессуары', 'Спортивная одежда', 'Одежда для мероприятий'],
  sports: ['Велосипеды', 'Лыжи', 'Сноуборды', 'Спортивные залы', 'Инвентарь'],
  tools: ['Строительные', 'Садовые', 'Ручные инструменты', 'Электроинструменты', 'Измерительные приборы'],
};

// ==================== PRICING ====================

// Commission rate (15%)
export const COMMISSION_RATE = 0.15;

// Commission multiplier for price calculation (1 + COMMISSION_RATE)
export const COMMISSION_MULTIPLIER = 1 + COMMISSION_RATE;

/**
 * Calculate price with commission
 * @param price - base price
 * @returns price with commission, rounded to 2 decimal places
 */
export function withCommission(price: number): number {
  return Math.round(price * COMMISSION_MULTIPLIER * 100) / 100;
}

/**
 * Convert price with commission back to base price
 * @param priceWithCommission - price including commission
 * @returns base price, rounded to 2 decimal places
 */
export function withoutCommission(priceWithCommission: number): number {
  return Math.round((priceWithCommission / COMMISSION_MULTIPLIER) * 100) / 100;
}

/**
 * Calculate commission amount
 * @param price - base price
 * @returns commission amount, rounded to 2 decimal places
 */
export function calculateCommission(price: number): number {
  return Math.round(price * COMMISSION_RATE * 100) / 100;
}

/**
 * Format price for display
 * @param price - price value
 * @returns formatted price string
 */
export function formatPrice(price: number): string {
  const rounded = Math.round(price * 100) / 100;
  // If whole number, don't show decimals
  if (rounded === Math.floor(rounded)) {
    return rounded.toString();
  }
  return rounded.toFixed(2);
}

// ==================== CITIES ====================

export interface City {
  key: string;
  name: string;
  bounds: string;
}

export const CITIES: City[] = [
  { key: 'moscow', name: 'Москва', bounds: 'Москва' },
];

export const DEFAULT_CITY_KEY = 'moscow';

export const CITY_STORAGE_KEY = 'selected_city';
