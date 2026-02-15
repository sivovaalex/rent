import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Providers } from '@/components/Providers';

const inter = Inter({ subsets: ['latin', 'cyrillic'] });

const isProduction = process.env.NEXT_PUBLIC_BASE_URL === 'https://arendol.ru';

export const metadata: Metadata = {
  title: 'Арендол - Единая шеринг-платформа',
  description: 'Платформа для аренды стрим-оборудования, электроники и премиальной одежды',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Arendol',
  },
  ...(!isProduction && {
    robots: { index: false, follow: false },
  }),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#4f46e5',
};

interface RootLayoutProps {
  children: ReactNode;
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ru">
      <body className={inter.className}>
        <Script
          src={`https://api-maps.yandex.ru/2.1/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY}&lang=ru_RU`}
          strategy="beforeInteractive"
        />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
