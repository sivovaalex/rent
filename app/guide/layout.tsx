import { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft, Package } from 'lucide-react';
import { COMPANY_INFO } from '@/lib/constants/company';
import Footer from '@/components/Footer';

interface GuideLayoutProps {
  children: ReactNode;
}

export default function GuideLayout({ children }: GuideLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
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

            <nav className="hidden md:flex items-center gap-6">
              <Link href="/guide" className="text-sm text-indigo-600 font-medium">
                Руководство
              </Link>
              <Link href="/legal" className="text-sm text-gray-600 hover:text-indigo-600 transition-colors">
                Юридическая информация
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Breadcrumb */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/" className="hover:text-indigo-600 transition-colors">
              Главная
            </Link>
            <span>/</span>
            <span className="text-gray-900">Руководство пользователя</span>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1">
        {children}
      </main>

      <Footer />
    </div>
  );
}
