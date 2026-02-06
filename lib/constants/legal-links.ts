/**
 * Конфигурация ссылок на юридические страницы
 */

export interface LegalLink {
  href: string;
  label: string;
  shortLabel?: string;
  description?: string;
}

// Основные юридические документы
export const LEGAL_LINKS: Record<string, LegalLink> = {
  privacy: {
    href: '/legal/privacy',
    label: 'Политика конфиденциальности',
    shortLabel: 'Конфиденциальность',
    description: 'Информация о сборе и обработке персональных данных',
  },
  consent: {
    href: '/legal/consent',
    label: 'Согласие на обработку персональных данных',
    shortLabel: 'Согласие на обработку ПД',
    description: 'Текст согласия на обработку персональных данных',
  },
  terms: {
    href: '/legal/terms',
    label: 'Пользовательское соглашение',
    shortLabel: 'Соглашение',
    description: 'Правила использования платформы',
  },
  offer: {
    href: '/legal/offer',
    label: 'Публичная оферта',
    shortLabel: 'Оферта',
    description: 'Условия оказания услуг платформой',
  },
  about: {
    href: '/legal/about',
    label: 'О компании',
    shortLabel: 'О компании',
    description: 'Реквизиты и контактная информация',
  },
  listingRules: {
    href: '/legal/listing-rules',
    label: 'Правила размещения объявлений',
    shortLabel: 'Правила размещения',
    description: 'Требования к объявлениям и запрещённый контент',
  },
  rentalRules: {
    href: '/legal/rental-rules',
    label: 'Правила аренды',
    shortLabel: 'Правила аренды',
    description: 'Условия аренды, залог, ответственность',
  },
};

// Ссылки для раздела "Помощь" в футере
export const FOOTER_HELP_LINKS: LegalLink[] = [
  {
    href: '/guide',
    label: 'Руководство пользователя',
  },
  {
    href: '/legal/rental-rules',
    label: 'Как арендовать',
  },
  {
    href: '/legal/listing-rules',
    label: 'Как сдать в аренду',
  },
  {
    href: '/legal/terms',
    label: 'Безопасность',
  },
  {
    href: '/legal/about',
    label: 'О компании',
  },
  {
    href: '/legal/privacy',
    label: 'Конфиденциальность',
  },
];

// Ссылки для нижней части футера (юридическая информация)
export const FOOTER_LEGAL_LINKS: LegalLink[] = [
  LEGAL_LINKS.privacy,
  LEGAL_LINKS.terms,
  LEGAL_LINKS.offer,
];

// Ссылки для чек-боксов при регистрации
export const REGISTRATION_CONSENT_LINKS = {
  termsAndOffer: [LEGAL_LINKS.terms, LEGAL_LINKS.offer],
  privacy: LEGAL_LINKS.privacy,
  consent: LEGAL_LINKS.consent,
};

// Ссылки для чек-бокса при бронировании
export const BOOKING_CONSENT_LINKS = {
  rentalRules: LEGAL_LINKS.rentalRules,
};

// Все юридические страницы для индексной страницы
export const ALL_LEGAL_PAGES: LegalLink[] = [
  LEGAL_LINKS.about,
  LEGAL_LINKS.terms,
  LEGAL_LINKS.offer,
  LEGAL_LINKS.privacy,
  LEGAL_LINKS.consent,
  LEGAL_LINKS.listingRules,
  LEGAL_LINKS.rentalRules,
];
