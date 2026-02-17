import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import ItemPageClient from './ItemPageClient';
import { withCommission } from '@/lib/constants';

const CATEGORY_NAMES: Record<string, string> = {
  electronics: 'Электроника',
  clothes: 'Одежда',
  stream: 'Стрим-оборудование',
  sports: 'Спорт',
  tools: 'Инструменты',
  other: 'Другое',
};

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getItem(id: string) {
  const item = await prisma.item.findUnique({
    where: { id, status: 'approved' },
    include: {
      owner: {
        select: { id: true, name: true, rating: true, phone: true, trustBadges: true, trustScore: true },
      },
      reviews: {
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true, photo: true } },
          reply: true,
        },
      },
    },
  });
  return item;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getItem(id);

  if (!item) {
    return { title: 'Лот не найден — Арендол' };
  }

  const categoryName = CATEGORY_NAMES[item.category] || item.category;
  const description = item.description.slice(0, 160);
  const title = `${item.title} — аренда ${withCommission(Number(item.pricePerDay))} ₽/день | Арендол`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: item.photos.length > 0 ? [{ url: item.photos[0], width: 800, height: 600 }] : undefined,
      type: 'website',
      locale: 'ru_RU',
      siteName: 'Арендол',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: item.photos.length > 0 ? [item.photos[0]] : undefined,
    },
    other: {
      'product:price:amount': String(withCommission(Number(item.pricePerDay))),
      'product:price:currency': 'RUB',
      'product:category': categoryName,
    },
  };
}

export default async function ItemPage({ params }: PageProps) {
  const { id } = await params;
  const item = await getItem(id);

  if (!item) {
    notFound();
  }

  const serializedItem = {
    _id: item.id,
    title: item.title,
    description: item.description,
    category: item.category,
    subcategory: item.subcategory,
    pricePerDay: withCommission(Number(item.pricePerDay)),
    pricePerMonth: withCommission(Number(item.pricePerMonth)),
    deposit: Number(item.deposit),
    address: item.address,
    photos: item.photos,
    attributes: item.attributes as Record<string, string | number | boolean> | undefined,
    status: item.status,
    rating: item.rating,
    createdAt: item.createdAt.toISOString(),
    ownerId: item.ownerId,
    ownerName: item.owner.name,
    ownerRating: item.owner.rating,
    ownerPhone: item.owner.phone,
    ownerTrustBadges: item.owner.trustBadges,
    ownerTrustScore: item.owner.trustScore,
    owner_name: item.owner.name,
    owner_rating: item.owner.rating,
    owner_phone: item.owner.phone,
    owner_id: item.ownerId,
    price_per_day: withCommission(Number(item.pricePerDay)),
    price_per_month: withCommission(Number(item.pricePerMonth)),
    reviews: item.reviews.map((r) => ({
      _id: r.id,
      rating: r.rating,
      text: r.text,
      photos: r.photos,
      createdAt: r.createdAt.toISOString(),
      user_name: r.user.name,
      user_photo: r.user.photo,
      reply: r.reply ? {
        id: r.reply.id,
        text: r.reply.text,
        createdAt: r.reply.createdAt.toISOString(),
      } : null,
    })),
  };

  const categoryName = CATEGORY_NAMES[item.category] || item.category;

  // Strip HTML tags for defense-in-depth in JSON-LD
  const stripHtml = (str: string) => str.replace(/<[^>]*>/g, '');

  // SEO structured data (JSON-LD)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: stripHtml(item.title),
    description: stripHtml(item.description),
    image: item.photos,
    category: categoryName,
    offers: {
      '@type': 'Offer',
      price: withCommission(Number(item.pricePerDay)),
      priceCurrency: 'RUB',
      availability: 'https://schema.org/InStock',
    },
    aggregateRating: item.rating ? {
      '@type': 'AggregateRating',
      ratingValue: item.rating,
      reviewCount: item.reviews.length,
    } : undefined,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ItemPageClient item={serializedItem} />
    </>
  );
}
