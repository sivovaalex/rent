import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Star, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const CATEGORY_NAMES: Record<string, string> = {
  electronics: 'Электроника',
  clothes: 'Одежда',
  stream: 'Стрим-оборудование',
  sports: 'Спорт',
  tools: 'Инструменты',
  other: 'Другое',
};

export const metadata: Metadata = {
  title: 'Каталог аренды — Аренда PRO',
  description: 'Каталог товаров для аренды: электроника, одежда, стрим-оборудование, спорт, инструменты. Аренда от 1 дня.',
  openGraph: {
    title: 'Каталог аренды — Аренда PRO',
    description: 'Каталог товаров для аренды: электроника, одежда, стрим-оборудование, спорт, инструменты.',
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Аренда PRO',
  },
};

interface CatalogPageProps {
  searchParams: Promise<{ category?: string; q?: string }>;
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const where: any = { status: 'approved' as const };

  if (params.category && params.category !== 'all') {
    where.category = params.category;
  }
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: 'insensitive' } },
      { description: { contains: params.q, mode: 'insensitive' } },
    ];
  }

  const items = await prisma.item.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: {
      owner: { select: { name: true, rating: true } },
    },
  });

  const categories = Object.entries(CATEGORY_NAMES);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">Каталог аренды</h1>

        {/* Category filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Link href="/catalog">
            <Badge variant={!params.category ? 'default' : 'outline'} className="cursor-pointer">
              Все
            </Badge>
          </Link>
          {categories.map(([key, name]) => (
            <Link key={key} href={`/catalog?category=${key}`}>
              <Badge
                variant={params.category === key ? 'default' : 'outline'}
                className="cursor-pointer"
              >
                {name}
              </Badge>
            </Link>
          ))}
        </div>

        {items.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            <p className="text-lg">Товары не найдены</p>
            <Link href="/catalog" className="text-indigo-600 hover:underline mt-2 inline-block">
              Показать все
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((item) => (
              <Link key={item.id} href={`/item/${item.id}`}>
                <Card className="hover:shadow-lg transition-shadow h-full">
                  {item.photos.length > 0 && (
                    <div className="aspect-video overflow-hidden rounded-t-lg bg-gray-100">
                      <img
                        src={item.photos[0]}
                        alt={item.title}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  )}
                  <CardContent className="pt-4 space-y-2">
                    <Badge variant="secondary" className="text-xs">
                      {CATEGORY_NAMES[item.category] || item.category}
                    </Badge>
                    <h2 className="font-semibold line-clamp-2">{item.title}</h2>
                    <p className="text-lg font-bold text-indigo-600">
                      {item.pricePerDay.toLocaleString('ru-RU')} ₽<span className="text-sm text-gray-500 font-normal">/день</span>
                    </p>
                    <div className="flex items-center justify-between text-sm text-gray-500">
                      <span>{item.owner.name}</span>
                      {item.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-current" />
                          {item.rating.toFixed(1)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin className="w-3 h-3" />
                      <span className="truncate">{item.address}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <div className="text-center mt-8">
          <Link href="/#catalog">
            <Badge variant="outline" className="text-base px-4 py-2 cursor-pointer">
              Открыть полный каталог в приложении →
            </Badge>
          </Link>
        </div>
      </div>
    </div>
  );
}
