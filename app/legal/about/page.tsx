import { Metadata } from 'next';
import LegalPageWrapper from '@/components/legal/LegalPageWrapper';
import { COMPANY_INFO, DOCUMENT_VERSIONS } from '@/lib/constants/company';

export const metadata: Metadata = {
  title: 'О компании - Аренда Про',
  description: 'Информация о компании, реквизиты и контактные данные',
};

export default function AboutPage() {
  return (
    <LegalPageWrapper
      title="О компании"
      lastUpdated={DOCUMENT_VERSIONS.terms.lastUpdated}
    >
      <section className="mb-8">
        <h2>Общая информация</h2>
        <p>
          <strong>{COMPANY_INFO.brandName}</strong> — современная платформа для аренды и сдачи в аренду
          различных вещей: стрим-оборудования, электроники, одежды, спортивного инвентаря и инструментов.
        </p>
        <p>
          Мы соединяем арендодателей и арендаторов, обеспечивая безопасные и удобные сделки
          с системой отзывов, страхования и защиты платежей.
        </p>
      </section>

      <section className="mb-8">
        <h2>Реквизиты организации</h2>
        <div className="bg-gray-50 rounded-lg p-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Полное наименование</p>
              <p className="font-medium">{COMPANY_INFO.fullName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Сокращённое наименование</p>
              <p className="font-medium">{COMPANY_INFO.shortName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ОГРН</p>
              <p className="font-medium">{COMPANY_INFO.ogrn}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ИНН</p>
              <p className="font-medium">{COMPANY_INFO.inn}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">КПП</p>
              <p className="font-medium">{COMPANY_INFO.kpp}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">ОКПО</p>
              <p className="font-medium">{COMPANY_INFO.okpo}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2>Адреса</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Юридический адрес</p>
            <p>{COMPANY_INFO.legalAddress}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Почтовый адрес</p>
            <p>{COMPANY_INFO.postalAddress}</p>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2>Банковские реквизиты</h2>
        <div className="bg-gray-50 rounded-lg p-6 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500">Наименование банка</p>
              <p className="font-medium">{COMPANY_INFO.bankName}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">БИК</p>
              <p className="font-medium">{COMPANY_INFO.bik}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Корреспондентский счёт</p>
              <p className="font-medium">{COMPANY_INFO.correspondentAccount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Расчётный счёт</p>
              <p className="font-medium">{COMPANY_INFO.settlementAccount}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h2>Контактная информация</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Электронная почта</p>
            <p>
              <a href={`mailto:${COMPANY_INFO.email}`} className="text-indigo-600 hover:underline">
                {COMPANY_INFO.email}
              </a>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Телефон</p>
            <p>
              <a href={`tel:${COMPANY_INFO.phone.replace(/[^+\d]/g, '')}`} className="text-indigo-600 hover:underline">
                {COMPANY_INFO.phone}
              </a>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Режим работы службы поддержки</p>
            <p>{COMPANY_INFO.supportHours}</p>
          </div>
        </div>
      </section>

      <section>
        <h2>Информация о платформе</h2>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Адрес сайта</p>
            <p>
              <a href={COMPANY_INFO.platformUrl} className="text-indigo-600 hover:underline">
                {COMPANY_INFO.platformUrl}
              </a>
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Комиссия платформы</p>
            <p>{COMPANY_INFO.commissionRatePercent} от стоимости аренды</p>
          </div>
        </div>
      </section>
    </LegalPageWrapper>
  );
}
