import { Metadata } from 'next';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Star, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import { withCommission } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ITEMS_PER_PAGE = 24;

const CATEGORY_NAMES: Record<string, string> = {
  electronics: 'Электроника',
  clothes: 'Одежда',
  stream: 'Стрим-оборудование',
  sports: 'Спорт',
  tools: 'Инструменты',
  other: 'Другое',
};

interface CatalogPageProps {
  searchParams: Promise<{ category?: string; q?: string; page?: string }>;
}

function buildQuery(params: { category?: string; q?: string }) {
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
  return where;
}

function buildHref(base: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(base)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `/catalog?${s}` : '/catalog';
}

export async function generateMetadata({ searchParams }: CatalogPageProps): Promise<Metadata> {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const categoryName = params.category ? CATEGORY_NAMES[params.category] : null;

  const parts: string[] = [];
  if (categoryName) parts.push(categoryName);
  parts.push('Каталог аренды');
  if (page > 1) parts.push(`страница ${page}`);
  parts.push('Арендол');
  const title = parts.join(' — ');

  const description = categoryName
    ? `${categoryName} в аренду — страница ${page}. Аренда от 1 дня на Арендол.`
    : `Каталог товаров для аренды — страница ${page}. Электроника, одежда, спорт, инструменты.`;

  const canonical = buildHref({
    category: params.category,
    q: params.q,
    page: page > 1 ? String(page) : undefined,
  });

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://arendol.ru';

  return {
    title,
    description,
    alternates: { canonical: `${baseUrl}${canonical}` },
    robots: { index: page <= 10, follow: true },
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'ru_RU',
      siteName: 'Арендол',
    },
  };
}

export default async function CatalogPage({ searchParams }: CatalogPageProps) {
  const params = await searchParams;
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1);
  const where = buildQuery(params);

  const [items, totalCount] = await Promise.all([
    prisma.item.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * ITEMS_PER_PAGE,
      take: ITEMS_PER_PAGE,
      include: {
        owner: { select: { name: true, rating: true } },
      },
    }),
    prisma.item.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const categories = Object.entries(CATEGORY_NAMES);

  // Build page href preserving current filters
  const pageHref = (p: number) =>
    buildHref({
      category: params.category,
      q: params.q,
      page: p > 1 ? String(p) : undefined,
    });

  // Generate visible page numbers (window of 5 around current)
  const pageNumbers: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) pageNumbers.push(i);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold mb-6">
          {params.category && CATEGORY_NAMES[params.category]
            ? `${CATEGORY_NAMES[params.category]} — аренда`
            : 'Каталог аренды'}
        </h1>

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
                      {withCommission(Number(item.pricePerDay)).toLocaleString('ru-RU')} ₽<span className="text-sm text-gray-500 font-normal">/день</span>
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

        {/* Pagination */}
        {totalPages > 1 && (
          <nav aria-label="Пагинация каталога" className="flex justify-center items-center gap-2 mt-8">
            {page > 1 ? (
              <Link
                href={pageHref(page - 1)}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border hover:bg-gray-100 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                Назад
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border text-gray-300 cursor-default">
                <ChevronLeft className="w-4 h-4" />
                Назад
              </span>
            )}

            {start > 1 && (
              <>
                <Link href={pageHref(1)} className="px-3 py-2 text-sm rounded-md border hover:bg-gray-100">1</Link>
                {start > 2 && <span className="px-1 text-gray-400">...</span>}
              </>
            )}

            {pageNumbers.map((p) => (
              <Link
                key={p}
                href={pageHref(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  p === page
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'hover:bg-gray-100'
                }`}
              >
                {p}
              </Link>
            ))}

            {end < totalPages && (
              <>
                {end < totalPages - 1 && <span className="px-1 text-gray-400">...</span>}
                <Link href={pageHref(totalPages)} className="px-3 py-2 text-sm rounded-md border hover:bg-gray-100">{totalPages}</Link>
              </>
            )}

            {page < totalPages ? (
              <Link
                href={pageHref(page + 1)}
                className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border hover:bg-gray-100 transition-colors"
              >
                Вперёд
                <ChevronRight className="w-4 h-4" />
              </Link>
            ) : (
              <span className="flex items-center gap-1 px-3 py-2 text-sm rounded-md border text-gray-300 cursor-default">
                Вперёд
                <ChevronRight className="w-4 h-4" />
              </span>
            )}
          </nav>
        )}

        {/* Item count */}
        <p className="text-center text-sm text-gray-400 mt-4">
          {totalCount} {totalCount === 1 ? 'товар' : totalCount < 5 ? 'товара' : 'товаров'}
        </p>

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
