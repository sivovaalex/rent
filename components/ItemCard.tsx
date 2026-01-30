import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Eye, EyeOff, Heart, Link2, MapPin } from 'lucide-react';
import type { Item, User, ItemStatus, Category } from '@/types';
import type { ReactNode } from 'react';
import { withCommission, formatPrice } from '@/lib/constants';
import TrustBadges from './TrustBadges';

interface ItemCardProps {
  item: Item;
  currentUser: User | null;
  getStatusBadge: (status: ItemStatus) => ReactNode;
  getCategoryIcon: (category: Category) => ReactNode;
  getCategoryName: (category: Category) => string;
  onEdit: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
  onViewDetails: () => void;
  onBook: () => void;
  isFavorite?: boolean;
  onToggleFavorite?: () => void;
  distance?: number;
}

export default function ItemCard({
  item,
  currentUser,
  getStatusBadge,
  getCategoryIcon,
  getCategoryName,
  onEdit,
  onDelete,
  onPublish,
  onUnpublish,
  onViewDetails,
  onBook,
  isFavorite = false,
  onToggleFavorite,
  distance,
}: ItemCardProps) {
  const isOwner = currentUser?.role === 'owner' && item.owner_id === currentUser._id;
  const isAdminOrModerator = currentUser?.role === 'admin' || currentUser?.role === 'moderator';

  return (
    <Card key={item._id} className="hover:shadow-lg transition-shadow cursor-pointer" onClick={onViewDetails}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{item.title}</CardTitle>
            <CardDescription className="flex flex-col gap-1 mt-1">
              <div className="flex items-center gap-1">
                {getCategoryIcon(item.category)}
                <span>{getCategoryName(item.category)}</span>
                {item.subcategory && (
                  <span className="text-xs text-gray-500">({item.subcategory})</span>
                )}
              </div>
            </CardDescription>
          </div>
          <div className="flex items-center gap-1 text-yellow-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-medium">{item.rating?.toFixed(1) || '5.0'}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative mb-4">
          {item.photos && item.photos.length > 0 ? (
            <div className="h-48 overflow-hidden rounded-lg">
              <img
                src={item.photos[0]}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">Нет фото</span>
            </div>
          )}
          <div className="absolute top-2 right-2 flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigator.clipboard.writeText(`${window.location.origin}/item/${item._id}`);
              }}
              className="p-1.5 rounded-full bg-white/80 hover:bg-white shadow transition-colors"
              aria-label="Скопировать ссылку"
              title="Скопировать ссылку"
            >
              <Link2 className="w-4 h-4 text-gray-400 hover:text-indigo-500" />
            </button>
            {onToggleFavorite && currentUser && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className="p-1.5 rounded-full bg-white/80 hover:bg-white shadow transition-colors"
                aria-label={isFavorite ? 'Убрать из избранного' : 'В избранное'}
              >
                <Heart className={`w-5 h-5 transition-colors ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400 hover:text-red-400'}`} />
              </button>
            )}
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{item.description}</p>

        <div className="space-y-2">
          {item.price_per_day && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">За день:</span>
              <span className="font-semibold">{formatPrice(withCommission(item.price_per_day))} ₽</span>
            </div>
          )}
          {item.price_per_month && (
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">За месяц:</span>
              <span className="font-semibold">{formatPrice(withCommission(item.price_per_month))} ₽</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Залог:</span>
            <span className="font-medium">{item.deposit} ₽</span>
          </div>
          {distance !== undefined && (
            <div className="flex items-center gap-1 text-xs text-indigo-600 mt-1">
              <MapPin className="w-3 h-3" />
              <span>{distance < 1 ? `${Math.round(distance * 1000)} м` : `${distance.toFixed(1)} км`}</span>
            </div>
          )}
          <div className="text-xs text-gray-500 mt-2 space-y-1">
            <div>Владелец: {item.owner_name}</div>
            {item.ownerTrustBadges && item.ownerTrustBadges.length > 0 && (
              <TrustBadges badges={item.ownerTrustBadges} compact />
            )}
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <div className="w-full flex justify-end">
          {getStatusBadge(item.status)}
        </div>

        <div className="w-full flex gap-2">
          {(isOwner || isAdminOrModerator) && (
            <div className="w-full flex gap-2">
              {item.status === 'approved' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUnpublish();
                  }}
                >
                  <EyeOff className="w-4 h-4 mr-1" />
                  Скрыть
                </Button>
              ) : (item.status === 'draft' || item.status === 'rejected') && (
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    onPublish();
                  }}
                >
                  <Eye className="w-4 h-4 mr-1" />
                  Опубликовать
                </Button>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                Редактировать
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
              >
                Удалить
              </Button>
            </div>
          )}

          {(!isOwner && !isAdminOrModerator) && item.status === 'approved' && (
            <Button
              onClick={(e) => {
                e.stopPropagation();
                onBook();
              }}
              className="w-full"
            >
              Забронировать
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}
