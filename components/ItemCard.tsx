import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Eye, EyeOff } from 'lucide-react';
import type { Item, User, ItemStatus, Category } from '@/types';
import type { ReactNode } from 'react';
import { withCommission, formatPrice } from '@/lib/constants';

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
  onBook
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
        {item.photos && item.photos.length > 0 ? (
          <div className="mb-4 h-48 overflow-hidden rounded-lg">
            <img
              src={item.photos[0]}
              alt={item.title}
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="mb-4 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
            <span className="text-gray-400">Нет фото</span>
          </div>
        )}

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
          <div className="text-xs text-gray-500 mt-2">
            Владелец: {item.owner_name}
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
