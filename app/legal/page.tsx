import { Metadata } from 'next';
import Link from 'next/link';
import { FileText, Shield, Users, Scroll, Building2, ListChecks, Package } from 'lucide-react';
import { ALL_LEGAL_PAGES } from '@/lib/constants/legal-links';
import { COMPANY_INFO } from '@/lib/constants/company';

export const metadata: Metadata = {
  title: 'Юридическая информация - Аренда Про',
  description: 'Юридические документы и правила платформы Аренда Про',
};

const icons: Record<string, React.ReactNode> = {
  '/legal/about': <Building2 className="w-6 h-6" />,
  '/legal/terms': <Users className="w-6 h-6" />,
  '/legal/offer': <Scroll className="w-6 h-6" />,
  '/legal/privacy': <Shield className="w-6 h-6" />,
  '/legal/consent': <FileText className="w-6 h-6" />,
  '/legal/listing-rules': <ListChecks className="w-6 h-6" />,
  '/legal/rental-rules': <Package className="w-6 h-6" />,
};

export default function LegalIndexPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Юридическая информация</h1>
        <p className="text-gray-600">
          Ознакомьтесь с правилами и условиями использования платформы {COMPANY_INFO.brandName}.
          Все документы соответствуют законодательству Российской Федерации.
        </p>
      </div>

      <div className="grid gap-4">
        {ALL_LEGAL_PAGES.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="flex items-start gap-4 p-6 bg-white rounded-lg border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all group"
          >
            <div className="flex-shrink-0 w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 group-hover:bg-indigo-100 transition-colors">
              {icons[page.href] || <FileText className="w-6 h-6" />}
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                {page.label}
              </h2>
              {page.description && (
                <p className="text-gray-500 text-sm mt-1">{page.description}</p>
              )}
            </div>
            <div className="flex-shrink-0 text-gray-400 group-hover:text-indigo-600 transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-12 p-6 bg-gray-50 rounded-lg">
        <h2 className="font-semibold text-gray-900 mb-3">Остались вопросы?</h2>
        <p className="text-gray-600 text-sm mb-4">
          Если у вас есть вопросы по документам или правилам платформы, обратитесь в службу поддержки.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 text-sm">
          <a
            href={`mailto:${COMPANY_INFO.email}`}
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {COMPANY_INFO.email}
          </a>
          <a
            href={`tel:${COMPANY_INFO.phone.replace(/[^+\d]/g, '')}`}
            className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-800"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {COMPANY_INFO.phone}
          </a>
        </div>
      </div>
    </div>
  );
}
