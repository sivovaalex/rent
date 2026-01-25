import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';
import { COMPANY_INFO } from '@/lib/constants/company';
import { FOOTER_HELP_LINKS, FOOTER_LEGAL_LINKS } from '@/lib/constants/legal-links';

interface LegalLayoutProps {
  children: ReactNode;
}

export default function LegalLayout({ children }: LegalLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Кнопка назад и логотип */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
                <span className="hidden sm:inline">На главную</span>
              </Link>
              <div className="h-6 w-px bg-gray-200" />
              <Link href="/" className="flex items-center gap-2">
                <Package className="w-6 h-6 text-indigo-600" />
                <span className="text-xl font-bold text-indigo-600">{COMPANY_INFO.brandName}</span>
              </Link>
            </div>

            {/* Навигация */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/legal" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                Юридическая информация
              </Link>
              <Link href="/legal/about" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                О компании
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Хлебные крошки */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-indigo-600 transition-colors">
              Главная
            </Link>
            <span>/</span>
            <Link href="/legal" className="hover:text-indigo-600 transition-colors">
              Юридическая информация
            </Link>
          </nav>
        </div>
      </div>

      {/* Основное содержимое */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* О компании */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Package className="w-6 h-6" />
                <span className="text-xl font-bold">{COMPANY_INFO.brandName}</span>
              </div>
              <p className="text-gray-400 text-sm">
                Платформа для аренды и сдачи в аренду вещей. Надёжно, удобно, выгодно.
              </p>
            </div>

            {/* Помощь */}
            <div>
              <h3 className="font-semibold mb-4">Помощь</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                {FOOTER_HELP_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-white transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Юридическая информация */}
            <div>
              <h3 className="font-semibold mb-4">Документы</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                {FOOTER_LEGAL_LINKS.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="hover:text-white transition-colors">
                      {link.shortLabel || link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Контакты */}
            <div>
              <h3 className="font-semibold mb-4">Контакты</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>
                  <a href={`mailto:${COMPANY_INFO.email}`} className="hover:text-white transition-colors">
                    {COMPANY_INFO.email}
                  </a>
                </li>
                <li>
                  <a href={`tel:${COMPANY_INFO.phone.replace(/[^+\d]/g, '')}`} className="hover:text-white transition-colors">
                    {COMPANY_INFO.phone}
                  </a>
                </li>
                <li className="pt-2">
                  <span className="text-gray-500">{COMPANY_INFO.supportHours}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Нижняя часть футера */}
          <div className="border-t border-gray-800 mt-12 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-gray-500 text-sm">
                &copy; {new Date().getFullYear()} {COMPANY_INFO.shortName}. Все права защищены.
              </p>
              <div className="flex gap-6 text-sm text-gray-500">
                <Link href="/legal/privacy" className="hover:text-white transition-colors">
                  Конфиденциальность
                </Link>
                <Link href="/legal/terms" className="hover:text-white transition-colors">
                  Условия использования
                </Link>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
