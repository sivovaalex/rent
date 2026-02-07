import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { Star, MapPin, ShieldCheck } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import TrustBadges, { TrustScore } from '@/components/TrustBadges';

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

async function getUser(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      rating: true,
      photo: true,
      isVerified: true,
      createdAt: true,
      role: true,
      trustScore: true,
      completedDeals: true,
      confirmationRate: true,
      avgResponseMinutes: true,
      trustBadges: true,
      items: {
        where: { status: 'approved' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) return { title: 'Пользователь не найден — Арендол' };

  const title = `${user.name} — профиль на Арендол`;
  const description = `${user.name}: рейтинг ${user.rating.toFixed(1)}, ${user.items.length} объявлений. Арендол — шеринг-платформа.`;

  return {
    title,
    description,
    openGraph: { title, description, type: 'profile', locale: 'ru_RU', siteName: 'Арендол' },
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { id } = await params;
  const user = await getUser(id);

  if (!user) notFound();

  const memberSince = new Date(user.createdAt).toLocaleDateString('ru-RU', {
    year: 'numeric',
    month: 'long',
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Profile header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-2xl font-bold text-indigo-600 flex-shrink-0">
                {user.photo ? (
                  <img src={user.photo} alt="" className="w-full h-full object-cover rounded-full" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold">{user.name}</h1>
                  {user.isVerified && (
                    <ShieldCheck className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    {user.rating.toFixed(1)}
                  </span>
                  <span>На платформе с {memberSince}</span>
                </div>

                {/* Trust info */}
                <div className="mt-3 space-y-2">
                  <TrustBadges badges={user.trustBadges} />
                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <TrustScore score={user.trustScore} />
                    <span>{user.completedDeals} сделок</span>
                    <span>Подтверждение: {user.confirmationRate}%</span>
                    {user.avgResponseMinutes != null && (
                      <span>
                        Ответ: {user.avgResponseMinutes < 60
                          ? `${Math.round(user.avgResponseMinutes)} мин`
                          : `${Math.round(user.avgResponseMinutes / 60)} ч`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <h2 className="text-xl font-semibold mb-4">Объявления ({user.items.length})</h2>
        {user.items.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Нет активных объявлений</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {user.items.map((item) => (
              <Link key={item.id} href={`/item/${item.id}`}>
                <Card className="hover:shadow-lg transition-shadow h-full">
                  {item.photos.length > 0 && (
                    <div className="aspect-video overflow-hidden rounded-t-lg bg-gray-100">
                      <img src={item.photos[0]} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  )}
                  <CardContent className="pt-4 space-y-1">
                    <Badge variant="secondary" className="text-xs">{CATEGORY_NAMES[item.category] || item.category}</Badge>
                    <h3 className="font-semibold line-clamp-2">{item.title}</h3>
                    <p className="text-lg font-bold text-indigo-600">
                      {item.pricePerDay.toLocaleString('ru-RU')} ₽<span className="text-sm text-gray-500 font-normal">/день</span>
                    </p>
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
      </div>
    </div>
  );
}
