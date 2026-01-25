'use client';
import { useState, useEffect, ChangeEvent, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Upload, Package, Zap, Camera, Shirt, Dumbbell, Hammer } from 'lucide-react';
import ItemCard from './ItemCard';
import ItemDetailModal from './ItemDetailModal';
import BookingModal from './BookingModal';
import { SkeletonCard } from '@/components/ui/spinner';
import type { User, Item, ItemStatus, Category, BookingForm, AlertType } from '@/types';

type CategoryKey = 'stream' | 'electronics' | 'clothing' | 'sports' | 'tools';

interface CatalogProps {
  currentUser: User | null;
  items: Item[];
  isLoading?: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  categoryFilter: string;
  setCategoryFilter: (category: string) => void;
  subCategoryFilter: string;
  setSubCategoryFilter: (subcategory: string) => void;
  sortBy: string;
  setSortBy: (sort: string) => void;
  catalogView: string;
  setCatalogView: (view: string) => void;
  showAllStatuses: boolean;
  setShowAllStatuses: (show: boolean) => void;
  loadItems: () => Promise<void>;
  showAlert: (message: string, type?: AlertType) => void;
  blockedBookingDates: string[];
  setBlockedBookingDates: (dates: string[]) => void;
  setSelectedItem: (item: Item | null) => void;
  setShowBookingModal: (show: boolean) => void;
  selectedItem: Item | null;
  showBookingModal: boolean;
  bookingForm: BookingForm;
  setBookingForm: React.Dispatch<React.SetStateAction<BookingForm>>;
  bookItem: () => Promise<void>;
  loadBlockedBookingDates: (itemId: string) => Promise<void>;
}

interface NewItemData {
  category: CategoryKey;
  subcategory: string;
  title: string;
  description: string;
  price_per_day: string;
  price_per_month: string;
  deposit: string;
  address: string;
  photos: string[];
  attributes: Record<string, string | number | boolean>;
}

export default function Catalog({
  currentUser,
  items,
  isLoading,
  searchQuery,
  setSearchQuery,
  categoryFilter,
  setCategoryFilter,
  subCategoryFilter,
  setSubCategoryFilter,
  sortBy,
  setSortBy,
  catalogView,
  setCatalogView,
  showAllStatuses,
  setShowAllStatuses,
  loadItems,
  showAlert,
  blockedBookingDates,
  setBlockedBookingDates,
  setSelectedItem,
  setShowBookingModal,
  selectedItem,
  showBookingModal,
  bookingForm,
  setBookingForm,
  bookItem
}: CatalogProps) {
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [showItemDetailModal, setShowItemDetailModal] = useState(false);

  const categorySubcategories: Record<CategoryKey, string[]> = {
    stream: ['Микрофоны', 'Камеры', 'Освещение', 'Звуковое оборудование', 'Триподы'],
    electronics: ['Телефоны', 'Ноутбуки', 'Планшеты', 'Фотоаппараты', 'Аудиотехника'],
    clothing: ['Верхняя одежда', 'Обувь', 'Аксессуары', 'Спортивная одежда', 'Одежда для мероприятий'],
    sports: ['Велосипеды', 'Лыжи', 'Сноуборды', 'Спортивные залы', 'Инвентарь'],
    tools: ['Строительные', 'Садовые', 'Ручные инструменты', 'Электроинструменты', 'Измерительные приборы']
  };

  const getCategoryIcon = (category: Category): ReactNode => {
    switch (category) {
      case 'stream': return <Zap className="w-4 h-4" />;
      case 'electronics': return <Camera className="w-4 h-4" />;
      case 'clothes': return <Shirt className="w-4 h-4" />;
      case 'sports': return <Dumbbell className="w-4 h-4" />;
      case 'tools': return <Hammer className="w-4 h-4" />;
      default: return <Package className="w-4 h-4" />;
    }
  };

  const getCategoryName = (category: Category): string => {
    switch (category) {
      case 'stream': return 'Стрим-оборудование';
      case 'electronics': return 'Электроника';
      case 'clothes': return 'Одежда';
      case 'sports': return 'Спорт';
      case 'tools': return 'Инструменты';
      default: return category;
    }
  };

  const getStatusBadge = (status: ItemStatus): ReactNode => {
    switch (status) {
      case 'approved': return <Badge variant="secondary" className="text-xs">Опубликован</Badge>;
      case 'pending': return <Badge variant="outline" className="text-xs">На модерации</Badge>;
      case 'rejected': return <Badge variant="destructive" className="text-xs">Отклонен</Badge>;
      case 'draft': return <Badge variant="outline" className="text-xs">Снят</Badge>;
      default: return <Badge variant="outline" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row gap-4 mb-6">
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setCatalogView('all')}
            className={`px-4 py-2 font-medium ${catalogView === 'all' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
          >
            Все лоты
          </button>
          {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
            <button
              onClick={() => setCatalogView('mine')}
              className={`px-4 py-2 font-medium ${catalogView === 'mine' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
            >
              Мои лоты
            </button>
          )}
        </div>
        {catalogView === 'mine' && (
          <div className="flex items-center gap-2">
            <Checkbox
              id="showAllStatuses"
              checked={showAllStatuses}
              onCheckedChange={(checked) => setShowAllStatuses(checked as boolean)}
            />
            <Label htmlFor="showAllStatuses" className="text-sm">Показать все статусы</Label>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4">
        <Input
          placeholder="Поиск по названию или описанию..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyUp={(e) => e.key === 'Enter' && loadItems()}
          className="flex-1"
        />
        <Select value={categoryFilter} onValueChange={(value) => {
          setCategoryFilter(value);
          setSubCategoryFilter('all');
        }}>
          <SelectTrigger className="w-full lg:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все категории</SelectItem>
            <SelectItem value="stream">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                Стрим-оборудование
              </div>
            </SelectItem>
            <SelectItem value="electronics">
              <div className="flex items-center gap-2">
                <Camera className="w-4 h-4" />
                Электроника
              </div>
            </SelectItem>
            <SelectItem value="clothing">
              <div className="flex items-center gap-2">
                <Shirt className="w-4 h-4" />
                Одежда
              </div>
            </SelectItem>
            <SelectItem value="sports">
              <div className="flex items-center gap-2">
                <Dumbbell className="w-4 h-4" />
                Спорт
              </div>
            </SelectItem>
            <SelectItem value="tools">
              <div className="flex items-center gap-2">
                <Hammer className="w-4 h-4" />
                Инструменты
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {categoryFilter !== 'all' && (
          <Select value={subCategoryFilter} onValueChange={setSubCategoryFilter}>
            <SelectTrigger className="w-full lg:w-[200px]">
              <SelectValue placeholder="Подкатегория" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все подкатегории</SelectItem>
              {categorySubcategories[categoryFilter as CategoryKey]?.map((subcat) => (
                <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-full lg:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Новые</SelectItem>
            <SelectItem value="price_asc">Цена ↑</SelectItem>
            <SelectItem value="price_desc">Цена ↓</SelectItem>
            <SelectItem value="rating">Рейтинг</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={loadItems}>Поиск</Button>
      </div>

      {currentUser?.is_verified && (currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
        <Button onClick={() => setShowItemModal(true)} className="w-full lg:w-auto">
          <Upload className="w-4 h-4 mr-2" />
          Разместить лот
        </Button>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))
        ) : (
          items.map((item) => (
            <ItemCard
              key={item._id}
              item={item}
              currentUser={currentUser}
              getStatusBadge={getStatusBadge}
              getCategoryIcon={getCategoryIcon}
              getCategoryName={getCategoryName}
              onEdit={() => {
                setSelectedItem(item);
                setShowItemModal(true);
              }}
              onDelete={async () => {
                if (!currentUser) return;
                if (confirm('Вы уверены, что хотите удалить этот лот?')) {
                  try {
                    const res = await fetch(`/api/items/${item._id}`, {
                      method: 'DELETE',
                      headers: { 'x-user-id': currentUser._id }
                    });
                    if (res.ok) {
                      showAlert('Лот удален');
                      loadItems();
                    } else {
                      const data = await res.json();
                      showAlert(data.error, 'error');
                    }
                  } catch {
                    showAlert('Ошибка удаления лота', 'error');
                  }
                }
              }}
              onPublish={async () => {
                if (!currentUser) return;
                try {
                  await fetch(`/api/items/${item._id}/publish`, {
                    method: 'POST',
                    headers: { 'x-user-id': currentUser._id }
                  });
                  showAlert('Лот опубликован');
                  loadItems();
                } catch {
                  showAlert('Ошибка публикации лота', 'error');
                }
              }}
              onUnpublish={async () => {
                if (!currentUser) return;
                try {
                  await fetch(`/api/items/${item._id}/unpublish`, {
                    method: 'POST',
                    headers: { 'x-user-id': currentUser._id }
                  });
                  showAlert('Лот снят с публикации');
                  loadItems();
                } catch {
                  showAlert('Ошибка снятия с публикации', 'error');
                }
              }}
              onViewDetails={() => {
                setSelectedItemId(item._id);
                setShowItemDetailModal(true);
              }}
              onBook={() => {
                if (!currentUser?.is_verified) {
                  showAlert('Требуется верификация', 'error');
                  return;
                }
                setSelectedItem(item);
                setShowBookingModal(true);
                setBlockedBookingDates([]);
                fetch(`/api/items/${item._id}/blocked-booking-dates`)
                  .then(res => res.json())
                  .then(data => {
                    if (data.dates) {
                      setBlockedBookingDates(data.dates);
                    }
                  });
              }}
            />
          ))
        )}
      </div>

      {!isLoading && items.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">
            {catalogView === 'mine' ? 'У вас пока нет лотов' : 'Лотов не найдено'}
          </p>
        </div>
      )}

      <ItemDetailModal
        isOpen={showItemDetailModal}
        onClose={() => setShowItemDetailModal(false)}
        itemId={selectedItemId}
        currentUser={currentUser}
        onBook={(item) => {
          setSelectedItem(item);
          setShowBookingModal(true);
          setShowItemDetailModal(false);
          setBlockedBookingDates([]);
          fetch(`/api/items/${item._id}/blocked-booking-dates`)
            .then(res => res.json())
            .then(data => {
              if (data.dates) {
                setBlockedBookingDates(data.dates);
              }
            });
        }}
      />

      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        item={selectedItem}
        bookingForm={bookingForm}
        setBookingForm={setBookingForm}
        blockedBookingDates={blockedBookingDates}
        onSubmit={bookItem}
      />

      <NewItemModal
        isOpen={showItemModal}
        onClose={() => {
          setShowItemModal(false);
          setSelectedItem(null);
        }}
        item={selectedItem}
        currentUser={currentUser}
        onSubmit={(itemData) => {
          if (!currentUser) return;
          if (selectedItem) {
            fetch(`/api/items/${selectedItem._id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': currentUser._id
              },
              body: JSON.stringify(itemData)
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  showAlert('Лот обновлен');
                  setShowItemModal(false);
                  setSelectedItem(null);
                  loadItems();
                } else {
                  showAlert(data.error || 'Ошибка обновления лота', 'error');
                }
              })
              .catch(() => showAlert('Ошибка обновления лота', 'error'));
          } else {
            fetch('/api/items', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': currentUser._id
              },
              body: JSON.stringify(itemData)
            })
              .then(res => res.json())
              .then(data => {
                if (data.success) {
                  showAlert('Лот создан и отправлен на модерацию');
                  setShowItemModal(false);
                  loadItems();
                } else {
                  showAlert(data.error || 'Ошибка создания лота', 'error');
                }
              })
              .catch(() => showAlert('Ошибка создания лота', 'error'));
          }
        }}
      />
    </div>
  );
}

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  currentUser: User | null;
  onSubmit: (itemData: NewItemData) => void;
}

interface PhotoPreview {
  file?: File;
  preview: string;
}

function NewItemModal({ isOpen, onClose, item, currentUser, onSubmit }: NewItemModalProps) {
  const [newItem, setNewItem] = useState<NewItemData>({
    category: 'stream',
    subcategory: '',
    title: '',
    description: '',
    price_per_day: '',
    price_per_month: '',
    deposit: '',
    address: '',
    photos: [],
    attributes: {}
  });

  const [photoPreviews, setPhotoPreviews] = useState<PhotoPreview[]>([]);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (item) {
      setNewItem({
        category: (item.category as CategoryKey) || 'stream',
        subcategory: item.subcategory || '',
        title: item.title || '',
        description: item.description || '',
        price_per_day: String(item.price_per_day) || '',
        price_per_month: String(item.price_per_month) || '',
        deposit: String(item.deposit) || '',
        address: item.address || '',
        photos: item.photos || [],
        attributes: item.attributes || {}
      });

      setPhotoPreviews(item.photos?.map(url => ({ preview: url })) || []);
    } else {
      setNewItem({
        category: 'stream',
        subcategory: '',
        title: '',
        description: '',
        price_per_day: '',
        price_per_month: '',
        deposit: '',
        address: '',
        photos: [],
        attributes: {}
      });
      setPhotoPreviews([]);
    }
  }, [item, isOpen]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!currentUser) return;
    const files = Array.from(e.target.files || []);
    if (files.length + photoPreviews.length > 5) {
      alert('Можно загрузить максимум 5 фотографий');
      return;
    }

    setUploading(true);
    const newPreviews: PhotoPreview[] = [];
    const newPhotos = [...newItem.photos];

    for (let i = 0; i < files.length && newPreviews.length + photoPreviews.length < 5; i++) {
      const file = files[i];
      if (!file.type.startsWith('image/')) continue;

      const preview = URL.createObjectURL(file);
      newPreviews.push({ file, preview });

      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'item_photos',
            data: base64,
            userId: currentUser._id,
            ...(item && { itemId: item._id })
          })
        });

        const data = await res.json();
        if (res.ok && data.path) {
          newPhotos.push(data.path);
        }
      } catch (error) {
        console.error('Ошибка загрузки фото:', error);
      }
    }

    setPhotoPreviews(prev => [...prev, ...newPreviews]);
    setNewItem(prev => ({ ...prev, photos: newPhotos }));
    setUploading(false);
  };

  const removePhoto = (index: number) => {
    if (!currentUser) return;
    const updatedPreviews = [...photoPreviews];
    updatedPreviews.splice(index, 1);
    setPhotoPreviews(updatedPreviews);

    const updatedPhotos = [...newItem.photos];
    updatedPhotos.splice(index, 1);
    setNewItem(prev => ({ ...prev, photos: updatedPhotos }));

    if (item && item.photos?.[index]) {
      fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: item.photos[index],
          userId: currentUser._id
        })
      });
    }
  };

  const categorySubcategories: Record<CategoryKey, string[]> = {
    stream: ['Микрофоны', 'Камеры', 'Освещение', 'Звуковое оборудование', 'Триподы'],
    electronics: ['Телефоны', 'Ноутбуки', 'Планшеты', 'Фотоаппараты', 'Аудиотехника'],
    clothing: ['Верхняя одежда', 'Обувь', 'Аксессуары', 'Спортивная одежда', 'Одежда для мероприятий'],
    sports: ['Велосипеды', 'Лыжи', 'Сноуборды', 'Спортивные залы', 'Инвентарь'],
    tools: ['Строительные', 'Садовые', 'Ручные инструменты', 'Электроинструменты', 'Измерительные приборы']
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-2xl font-bold mb-6">{item ? 'Редактировать лот' : 'Создать лот'}</h2>

          <div className="space-y-4">
            <div>
              <Label>Категория</Label>
              <Select
                value={newItem.category}
                onValueChange={(value) => {
                  setNewItem({ ...newItem, category: value as CategoryKey, subcategory: '' });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stream">Стрим-оборудование</SelectItem>
                  <SelectItem value="electronics">Электроника</SelectItem>
                  <SelectItem value="clothing">Одежда</SelectItem>
                  <SelectItem value="sports">Спорт</SelectItem>
                  <SelectItem value="tools">Инструменты</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {newItem.category && (
              <div>
                <Label>Подкатегория</Label>
                <Select
                  value={newItem.subcategory || ''}
                  onValueChange={(value) => setNewItem({ ...newItem, subcategory: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите подкатегорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {categorySubcategories[newItem.category].map((subcat) => (
                      <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Название</Label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Например: Микрофон Blue Yeti"
              />
            </div>

            <div>
              <Label>Описание</Label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Подробное описание состояния и характеристик"
                className="w-full p-2 border rounded-md min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Цена за день (₽)</Label>
                <Input
                  type="number"
                  value={newItem.price_per_day}
                  onChange={(e) => setNewItem({ ...newItem, price_per_day: e.target.value })}
                />
              </div>
              <div>
                <Label>Цена за месяц (₽)</Label>
                <Input
                  type="number"
                  value={newItem.price_per_month}
                  onChange={(e) => setNewItem({ ...newItem, price_per_month: e.target.value })}
                />
              </div>
            </div>

            <div>
              <Label>Залог (₽)</Label>
              <Input
                type="number"
                value={newItem.deposit}
                onChange={(e) => setNewItem({ ...newItem, deposit: e.target.value })}
              />
            </div>

            <div>
              <Label>Адрес самовывоза</Label>
              <Input
                value={newItem.address}
                onChange={(e) => setNewItem({ ...newItem, address: e.target.value })}
                placeholder="Москва, ул. Примерная, д. 1"
              />
            </div>

            <div>
              <Label>Фотографии (максимум 5)</Label>
              <div className="mt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={uploading || photoPreviews.length >= 5}
                  className="mb-2"
                />
                {uploading && <p className="text-sm text-gray-500">Загрузка...</p>}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {photoPreviews.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={photo.preview}
                        alt={`preview ${index}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>
              Отмена
            </Button>
            <Button onClick={() => onSubmit(newItem)} disabled={uploading}>
              {item ? 'Сохранить изменения' : 'Создать лот'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
