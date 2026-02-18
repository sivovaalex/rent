'use client';
import { useState, useEffect, ChangeEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { AlertCircle } from 'lucide-react';
import { AddressSuggest } from './AddressSuggest';
import { getAuthHeaders } from '@/hooks/use-auth';
import { getCategoryAttributes, CATEGORY_SUBCATEGORIES, type CategoryKey } from '@/lib/constants';
import type { User, Item, ApprovalMode } from '@/types';

export interface NewItemData {
  category: CategoryKey;
  subcategory: string;
  title: string;
  description: string;
  price_per_day: string;
  price_per_month: string;
  deposit: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  photos: string[];
  attributes: Record<string, string | number | boolean>;
  approval_mode?: ApprovalMode | null;
  approval_threshold?: number | null;
}

interface FieldError {
  field: string;
  message: string;
}

interface NewItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: Item | null;
  currentUser: User | null;
  onSubmit: (itemData: NewItemData) => Promise<FieldError[] | null>;
  cityName?: string;
}

interface PhotoPreview {
  file?: File;
  preview: string;
}

export default function NewItemModal({ isOpen, onClose, item, currentUser, onSubmit, cityName }: NewItemModalProps) {
  const [newItem, setNewItem] = useState<NewItemData>({
    category: 'stream',
    subcategory: '',
    title: '',
    description: '',
    price_per_day: '',
    price_per_month: '',
    deposit: '',
    address: '',
    latitude: null,
    longitude: null,
    photos: [],
    attributes: {},
    approval_mode: null,
    approval_threshold: null,
  });

  const [photoPreviews, setPhotoPreviews] = useState<PhotoPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const getFieldError = (field: string) => fieldErrors[field];

  const validateNewItem = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!newItem.title || newItem.title.length < 3) errors.title = 'Минимум 3 символа';
    if (newItem.title.length > 100) errors.title = 'Максимум 100 символов';
    if (!newItem.description || newItem.description.length < 10) errors.description = 'Минимум 10 символов';
    if (newItem.description.length > 2000) errors.description = 'Максимум 2000 символов';
    const priceDay = parseFloat(newItem.price_per_day);
    if (!priceDay || priceDay <= 0) errors.price_per_day = 'Цена должна быть положительной';
    const priceMonth = parseFloat(newItem.price_per_month);
    if (!priceMonth || priceMonth <= 0) errors.price_per_month = 'Цена должна быть положительной';
    const deposit = parseFloat(newItem.deposit);
    if (isNaN(deposit) || deposit < 0) errors.deposit = 'Залог не может быть отрицательным';
    if (!newItem.address || newItem.address.length < 5) errors.address = 'Минимум 5 символов';
    if (newItem.photos.length === 0) errors.photos = 'Загрузите хотя бы 1 фото';
    return errors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateNewItem();
    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);
    try {
      const errors = await onSubmit(newItem);
      if (errors && errors.length > 0) {
        const errorsMap: Record<string, string> = {};
        errors.forEach(err => {
          errorsMap[err.field] = err.message;
        });
        setFieldErrors(errorsMap);
      }
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    setFieldErrors({});
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
        latitude: item.latitude ?? null,
        longitude: item.longitude ?? null,
        photos: item.photos || [],
        attributes: item.attributes || {},
        approval_mode: item.approvalMode || null,
        approval_threshold: item.approvalThreshold || null,
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
        latitude: null,
        longitude: null,
        photos: [],
        attributes: {},
        approval_mode: null,
        approval_threshold: null,
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
          headers: getAuthHeaders(),
          body: JSON.stringify({
            type: 'item_photos',
            data: base64,
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
        headers: getAuthHeaders(),
        body: JSON.stringify({
          path: item.photos[index],
        })
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 sm:p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6">{item ? 'Редактировать лот' : 'Создать лот'}</h2>

          {item && item.status === 'approved' && (
            <Alert className="mb-4 border-yellow-200 bg-yellow-50">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-sm">
                Изменение названия, описания или фото отправит лот на повторную модерацию.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-3 sm:space-y-4">
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
                  <SelectItem value="clothes">Одежда</SelectItem>
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
                  <SelectTrigger className={getFieldError('subcategory') ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Выберите подкатегорию" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_SUBCATEGORIES[newItem.category].map((subcat) => (
                      <SelectItem key={subcat} value={subcat}>{subcat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {getFieldError('subcategory') && (
                  <p className="text-red-500 text-sm mt-1" role="alert">{getFieldError('subcategory')}</p>
                )}
              </div>
            )}

            <div>
              <Label>Название</Label>
              <Input
                value={newItem.title}
                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                placeholder="Например: Микрофон Blue Yeti"
                className={getFieldError('title') ? 'border-red-500' : ''}
              />
              {getFieldError('title') && (
                <p className="text-red-500 text-sm mt-1" role="alert">{getFieldError('title')}</p>
              )}
            </div>

            <div>
              <Label>Описание</Label>
              <textarea
                value={newItem.description}
                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                placeholder="Подробное описание состояния и характеристик"
                className={`w-full p-2 border rounded-md min-h-[100px] ${getFieldError('description') ? 'border-red-500' : ''}`}
              />
              {getFieldError('description') && (
                <p className="text-red-500 text-sm mt-1" role="alert">{getFieldError('description')}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-sm">Цена за день (₽)</Label>
                <Input
                  type="number"
                  value={newItem.price_per_day}
                  onChange={(e) => setNewItem({ ...newItem, price_per_day: e.target.value })}
                  className={getFieldError('price_per_day') ? 'border-red-500' : ''}
                />
                {getFieldError('price_per_day') && (
                  <p className="text-red-500 text-sm mt-1" role="alert">{getFieldError('price_per_day')}</p>
                )}
              </div>
              <div>
                <Label className="text-sm">Цена за месяц (₽)</Label>
                <Input
                  type="number"
                  value={newItem.price_per_month}
                  onChange={(e) => setNewItem({ ...newItem, price_per_month: e.target.value })}
                  className={getFieldError('price_per_month') ? 'border-red-500' : ''}
                />
                {getFieldError('price_per_month') && (
                  <p className="text-red-500 text-sm mt-1" role="alert">{getFieldError('price_per_month')}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Залог (₽)</Label>
              <Input
                type="number"
                value={newItem.deposit}
                onChange={(e) => setNewItem({ ...newItem, deposit: e.target.value })}
                className={getFieldError('deposit') ? 'border-red-500' : ''}
              />
              {getFieldError('deposit') && (
                <p className="text-red-500 text-sm mt-1" role="alert">{getFieldError('deposit')}</p>
              )}
            </div>

            <div>
              <Label>Адрес самовывоза</Label>
              <AddressSuggest
                value={newItem.address}
                onChange={(address, lat, lng) => setNewItem({ ...newItem, address, latitude: lat, longitude: lng })}
                placeholder={`${cityName || 'Москва'}, ул. Примерная, д. 1`}
                className={getFieldError('address') ? '[&_input]:border-red-500' : ''}
                cityBounds={cityName}
              />
              {getFieldError('address') && (
                <p className="text-red-500 text-sm mt-1" role="alert">{getFieldError('address')}</p>
              )}
            </div>

            {getCategoryAttributes(newItem.category).length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Характеристики</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {getCategoryAttributes(newItem.category).map((attr) => (
                    <div key={attr.key}>
                      <Label className="text-sm">{attr.label}</Label>
                      {attr.type === 'select' ? (
                        <Select
                          value={(newItem.attributes[attr.key] as string) || ''}
                          onValueChange={(value) =>
                            setNewItem(prev => ({
                              ...prev,
                              attributes: { ...prev.attributes, [attr.key]: value },
                            }))
                          }
                        >
                          <SelectTrigger className="w-full text-sm">
                            <SelectValue placeholder={`Выберите ${attr.label.toLowerCase()}`} />
                          </SelectTrigger>
                          <SelectContent>
                            {attr.options?.map((opt) => (
                              <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          value={(newItem.attributes[attr.key] as string) || ''}
                          onChange={(e) =>
                            setNewItem(prev => ({
                              ...prev,
                              attributes: { ...prev.attributes, [attr.key]: e.target.value },
                            }))
                          }
                          placeholder={attr.placeholder || ''}
                          className="text-sm"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Approval mode */}
            <div className="space-y-3 border-t pt-4">
              <Label className="text-sm font-semibold">Режим одобрения бронирований</Label>
              <p className="text-xs text-gray-500">
                Переопределяет глобальную настройку из профиля для этого лота.
              </p>
              <Select
                value={newItem.approval_mode || 'default'}
                onValueChange={(value) =>
                  setNewItem(prev => ({
                    ...prev,
                    approval_mode: value === 'default' ? null : value as ApprovalMode,
                    approval_threshold: value === 'rating_based' ? (prev.approval_threshold || 4.0) : prev.approval_threshold,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">По умолчанию (из профиля)</SelectItem>
                  <SelectItem value="auto_approve">Автоматическое одобрение</SelectItem>
                  <SelectItem value="manual">Ручное одобрение</SelectItem>
                  <SelectItem value="rating_based">По рейтингу арендатора</SelectItem>
                  <SelectItem value="verified_only">Только верифицированные</SelectItem>
                </SelectContent>
              </Select>

              {newItem.approval_mode === 'rating_based' && (
                <div className="space-y-2">
                  <Label className="text-sm">
                    Минимальный рейтинг: {(newItem.approval_threshold || 4.0).toFixed(1)}
                  </Label>
                  <Slider
                    value={[newItem.approval_threshold || 4.0]}
                    onValueChange={([v]) => setNewItem(prev => ({ ...prev, approval_threshold: v }))}
                    min={3.0}
                    max={5.0}
                    step={0.5}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>3.0</span>
                    <span>5.0</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label>Фотографии (максимум 5)</Label>
              {getFieldError('photos') && (
                <p className="text-red-500 text-sm mt-1" role="alert">{getFieldError('photos')}</p>
              )}
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
                        alt={`Фото лота ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        aria-label={`Удалить фото ${index + 1}`}
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

          <div className="mt-6 sm:mt-8 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
            <Button variant="outline" onClick={onClose} disabled={submitting} className="w-full sm:w-auto">
              Отмена
            </Button>
            <Button onClick={handleSubmit} disabled={uploading || submitting} className="w-full sm:w-auto">
              {submitting ? 'Сохранение...' : (item ? 'Сохранить' : 'Создать')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
