'use client';

import { ReactNode } from 'react';
import { COMPANY_INFO } from '@/lib/constants/company';

interface LegalPageWrapperProps {
  title: string;
  lastUpdated: string;
  effectiveDate?: string;
  version?: string;
  children: ReactNode;
}

export default function LegalPageWrapper({
  title,
  lastUpdated,
  effectiveDate,
  version,
  children,
}: LegalPageWrapperProps) {
  return (
    <article className="max-w-4xl mx-auto">
      {/* Заголовок документа */}
      <header className="mb-8 pb-6 border-b">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{title}</h1>
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          {version && (
            <span>Версия: {version}</span>
          )}
          <span>Дата обновления: {formatDate(lastUpdated)}</span>
          {effectiveDate && (
            <span>Вступает в силу: {formatDate(effectiveDate)}</span>
          )}
        </div>
      </header>

      {/* Содержимое документа */}
      <div className="prose prose-gray max-w-none prose-headings:text-gray-900 prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h3:text-lg prose-h3:mt-6 prose-h3:mb-3 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-strong:text-gray-900">
        {children}
      </div>

      {/* Контактная информация */}
      <footer className="mt-12 pt-6 border-t">
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">Контактная информация</h3>
          <p className="text-sm text-gray-600 mb-2">
            По вопросам, связанным с данным документом, обращайтесь:
          </p>
          <ul className="text-sm text-gray-700 space-y-1">
            <li>Email: <a href={`mailto:${COMPANY_INFO.email}`} className="text-indigo-600 hover:underline">{COMPANY_INFO.email}</a></li>
            <li>Телефон: <a href={`tel:${COMPANY_INFO.phone.replace(/[^+\d]/g, '')}`} className="text-indigo-600 hover:underline">{COMPANY_INFO.phone}</a></li>
            <li>Режим работы: {COMPANY_INFO.supportHours}</li>
          </ul>
        </div>
      </footer>
    </article>
  );
}

// Вспомогательная функция для форматирования даты
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
