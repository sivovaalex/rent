'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Star, ArrowLeft, MapPin, Share2, ExternalLink } from 'lucide-react';
import TrustBadges from '@/components/TrustBadges';
import AvailabilityCalendar from '@/components/AvailabilityCalendar';
import SimilarItems from '@/components/SimilarItems';
import { formatPrice } from '@/lib/constants';

const CATEGORY_NAMES: Record<string, string> = {
  electronics: 'Электроника',
  clothes: 'Одежда',
  stream: 'Стрим-оборудование',
  sports: 'Спорт',
  tools: 'Инструменты',
  other: 'Другое',
};

interface ItemPageClientProps {
  item: any;
}

export default function ItemPageClient({ item }: ItemPageClientProps) {
  const [currentPhoto, setCurrentPhoto] = useState(0);
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: item.title, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/catalog" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-800">
            <ArrowLeft className="w-4 h-4" />
            Каталог
          </Link>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="w-4 h-4 mr-1" />
              {copied ? 'Скопировано!' : 'Поделиться'}
            </Button>
            <Link href={`/#catalog`}>
              <Button variant="outline" size="sm">
                <ExternalLink className="w-4 h-4 mr-1" />
                Открыть в приложении
              </Button>
            </Link>
          </div>
        </div>

        {/* Photos */}
        {item.photos && item.photos.length > 0 && (
          <div className="mb-6">
            <div className="relative aspect-video rounded-xl overflow-hidden bg-gray-100">
              <img
                src={item.photos[currentPhoto]}
                alt={item.title}
                className="w-full h-full object-contain"
              />
            </div>
            {item.photos.length > 1 && (
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                {item.photos.map((photo: string, idx: number) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPhoto(idx)}
                    className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 ${
                      idx === currentPhoto ? 'border-indigo-600' : 'border-transparent'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main info */}
          <div className="lg:col-span-2 space-y-4">
            <div>
              <Badge variant="secondary" className="mb-2">
                {CATEGORY_NAMES[item.category] || item.category}
                {item.subcategory && ` / ${item.subcategory}`}
              </Badge>
              <h1 className="text-2xl font-bold">{item.title}</h1>
              {item.rating && (
                <div className="flex items-center gap-1 mt-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-current" />
                  <span className="font-medium">{item.rating.toFixed(1)}</span>
                  <span className="text-gray-500 text-sm">
                    ({item.reviews?.length || 0} отзывов)
                  </span>
                </div>
              )}
            </div>

            <Card>
              <CardContent className="pt-6">
                <h2 className="font-semibold mb-2">Описание</h2>
                <p className="text-gray-600 whitespace-pre-wrap">{item.description}</p>
              </CardContent>
            </Card>

            {/* Attributes */}
            {item.attributes && Object.keys(item.attributes).length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-semibold mb-2">Характеристики</h2>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(item.attributes).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-500 capitalize">{key}</span>
                        <span className="font-medium">{String(value)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Reviews */}
            {item.reviews && item.reviews.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h2 className="font-semibold mb-4">Отзывы ({item.reviews.length})</h2>
                  <div className="space-y-4">
                    {item.reviews.map((review: any) => (
                      <div key={review._id} className="border-b pb-4 last:border-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{review.user_name}</span>
                          <div className="flex items-center gap-0.5">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3 h-3 ${
                                  i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm">{review.text}</p>
                        {review.reply && (
                          <div className="mt-2 ml-4 p-2 bg-gray-50 rounded text-sm">
                            <span className="font-medium">Ответ владельца:</span> {review.reply.text}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            <Card>
              <CardContent className="pt-6 space-y-3">
                <div className="text-center">
                  <p className="text-3xl font-bold text-indigo-600">
                    {formatPrice(item.pricePerDay)} ₽<span className="text-base text-gray-500">/день</span>
                  </p>
                  <p className="text-sm text-gray-500">
                    {formatPrice(item.pricePerMonth)} ₽/месяц
                  </p>
                </div>
                <div className="flex justify-between text-sm pt-2 border-t">
                  <span className="text-gray-500">Залог</span>
                  <span className="font-medium">{formatPrice(item.deposit)} ₽</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-600 pt-2 border-t">
                  <MapPin className="w-4 h-4" />
                  {item.address || 'Адрес не указан'}
                </div>
                <Link href="/#catalog" className="block">
                  <Button className="w-full mt-2">Войти и забронировать</Button>
                </Link>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <AvailabilityCalendar itemId={item._id} />
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">Владелец</h3>
                <Link href={`/u/${item.ownerId}`} className="flex items-center gap-3 hover:bg-gray-50 p-2 rounded-lg -m-2">
                  <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                    {item.ownerName?.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium">{item.ownerName}</p>
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400 fill-current" />
                      <span className="text-sm">{item.ownerRating?.toFixed(1) || '5.0'}</span>
                    </div>
                  </div>
                </Link>
                {item.ownerTrustBadges && item.ownerTrustBadges.length > 0 && (
                  <div className="mt-3">
                    <TrustBadges badges={item.ownerTrustBadges} />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {item.status === 'approved' && (
          <div className="mt-6">
            <SimilarItems itemId={item._id} />
          </div>
        )}
      </div>
    </div>
  );
}
