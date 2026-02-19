'use client';

import Link from 'next/link';
import { Package } from 'lucide-react';
import { COMPANY_INFO } from '@/lib/constants/company';
import { FOOTER_HELP_LINKS, FOOTER_LEGAL_LINKS } from '@/lib/constants/legal-links';

const categories = [
  'Стрим-оборудование',
  'Электроника',
  'Одежда',
  'Спорт',
  'Инструменты',
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-white py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8">
        {/* Брендинг */}
        <div className="col-span-2 sm:col-span-2 md:col-span-1">
          <div className="flex items-center mb-3 sm:mb-4">
            <Package className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-400" />
            <span className="ml-2 text-xl sm:text-2xl font-bold">{COMPANY_INFO.brandName}</span>
          </div>
          <p className="text-gray-400 text-sm sm:text-base">
            Платформа для аренды и сдачи вещей
          </p>
        </div>

        {/* Категории */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Категории</h3>
          <ul className="space-y-1 sm:space-y-2">
            {categories.map((category) => (
              <li key={category}>
                <span className="text-gray-400 hover:text-white transition-colors cursor-pointer text-sm sm:text-base">
                  {category}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Помощь */}
        <div>
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Помощь</h3>
          <ul className="space-y-1 sm:space-y-2">
            {FOOTER_HELP_LINKS.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="text-gray-400 hover:text-white transition-colors text-sm sm:text-base"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Контакты */}
        <div className="col-span-2 sm:col-span-1">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Контакты</h3>
          <ul className="space-y-1 sm:space-y-2 text-gray-400">
            <li>
              <a
                href={`mailto:${COMPANY_INFO.email}`}
                className="hover:text-white transition-colors text-sm sm:text-base"
              >
                {COMPANY_INFO.email}
              </a>
            </li>
            <li>
              <a
                href={`tel:${COMPANY_INFO.phone.replace(/[^+\d]/g, '')}`}
                className="hover:text-white transition-colors text-sm sm:text-base"
              >
                {COMPANY_INFO.phone}
              </a>
            </li>
            <li className="text-xs sm:text-sm">{COMPANY_INFO.supportHours}</li>
          </ul>
        </div>
      </div>

      {/* Юридические ссылки */}
      <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-6 sm:pt-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-3 sm:mb-4 text-xs sm:text-sm">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-gray-400 hover:text-white transition-colors"
              >
                {link.shortLabel || link.label}
              </Link>
            ))}
            <Link
              href="/legal"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Все документы
            </Link>
          </div>
          {/*<p className="text-center text-gray-500 text-xs sm:text-sm">
            © {currentYear} {COMPANY_INFO.shortName}. Все права защищены.
          </p>*/}
          <p className="text-center text-gray-500 text-xs sm:text-sm">
            © {currentYear} ИНН 246609008720. Все права защищены.
          </p>
        </div>
      </div>
    </footer>
  );
}
