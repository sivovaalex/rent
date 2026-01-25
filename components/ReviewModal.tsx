'use client';
import { useState, useEffect, ChangeEvent } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Star, AlertCircle, ImageIcon, X, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { User, Booking, Item } from '@/types';

interface ReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking & { item?: Item };
  currentUser: User;
  onSubmit?: () => void;
}

interface ReviewForm {
  rating: number;
  text: string;
  photos: string[];
}

interface PhotoPreview {
  file: File;
  preview: string;
}

export default function ReviewModal({ isOpen, onClose, booking, currentUser, onSubmit }: ReviewModalProps) {
  useEffect(() => {
    if (isOpen && !currentUser) {
      console.error('currentUser не передан в ReviewModal');
    }
  }, [isOpen, currentUser]);

  const [reviewForm, setReviewForm] = useState<ReviewForm>({
    rating: 5,
    text: '',
    photos: []
  });

  const [photoPreviews, setPhotoPreviews] = useState<PhotoPreview[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReviewForm({ rating: 5, text: '', photos: [] });
      setPhotoPreviews([]);
      setError(null);
    }
  }, [isOpen]);

  const handlePhotoUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    setError(null);
    const files = Array.from(e.target.files || []);

    if (files.length + photoPreviews.length > 3) {
      setError('Можно загрузить максимум 3 фотографии');
      return;
    }

    setUploading(true);
    const newPreviews: PhotoPreview[] = [];
    const newPhotos = [...reviewForm.photos];

    try {
      for (const file of files) {
        if (newPreviews.length + photoPreviews.length >= 3) break;

        if (!file.type.startsWith('image/')) {
          setError('Можно загружать только изображения');
          continue;
        }

        const preview = URL.createObjectURL(file);
        newPreviews.push({ file, preview });

        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(file);
        });

        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'review_photos',
            data: base64,
            userId: currentUser?._id
          })
        });

        const data = await res.json();

        if (!res.ok || !data.path) {
          throw new Error(data.error || 'Ошибка загрузки фото');
        }

        newPhotos.push(data.path);
      }

      setPhotoPreviews(prev => [...prev, ...newPreviews]);
      setReviewForm(prev => ({ ...prev, photos: newPhotos }));
    } catch (err) {
      console.error('Ошибка загрузки фото:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки фото');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const updatedPreviews = [...photoPreviews];
    URL.revokeObjectURL(updatedPreviews[index].preview);
    updatedPreviews.splice(index, 1);
    setPhotoPreviews(updatedPreviews);

    const updatedPhotos = [...reviewForm.photos];
    updatedPhotos.splice(index, 1);
    setReviewForm(prev => ({ ...prev, photos: updatedPhotos }));
  };

  const handleSubmit = async () => {
    setError(null);
    setIsSubmitting(true);

    if (!reviewForm.text.trim()) {
      setError('Пожалуйста, напишите отзыв');
      setIsSubmitting(false);
      return;
    }

    try {
      if (!currentUser) {
        throw new Error('Пользователь не авторизован');
      }

      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser._id
        },
        body: JSON.stringify({
          booking_id: booking._id,
          item_id: booking.item_id,
          rating: reviewForm.rating,
          text: reviewForm.text.trim(),
          photos: reviewForm.photos || []
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Ошибка сервера при отправке отзыва');
      }

      onSubmit?.();
      onClose();
    } catch (err) {
      console.error('Ошибка отправки отзыва:', err);
      setError(err instanceof Error ? err.message : 'Ошибка отправки отзыва');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md w-[calc(100%-1rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle className="pr-6">Оставить отзыв</DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            Поделитесь опытом аренды: {booking?.item?.title}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Ошибка</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="rating">Ваша оценка</Label>
            <div className="flex gap-2 mt-2 justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  id={`star-${star}`}
                  className={`w-8 h-8 cursor-pointer transition-colors ${
                    star <= reviewForm.rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                  onClick={() => setReviewForm({ ...reviewForm, rating: star })}
                  aria-label={`Оценка ${star} из 5`}
                />
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="review-text">Ваш отзыв</Label>
            <Textarea
              id="review-text"
              value={reviewForm.text}
              onChange={(e) => setReviewForm({ ...reviewForm, text: e.target.value })}
              placeholder="Расскажите о вашем опыте аренды..."
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1 text-right">
              {reviewForm.text.length}/500 символов
            </p>
          </div>

          <div>
            <Label htmlFor="photos">Фотографии (максимум 3, необязательно)</Label>
            <div className="mt-2">
              <div className="flex items-center gap-2">
                <Input
                  id="photos"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  disabled={uploading || photoPreviews.length >= 3}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById('photos')?.click()}
                  disabled={uploading || photoPreviews.length >= 3}
                >
                  <ImageIcon className="w-4 h-4 mr-2" />
                  {photoPreviews.length >= 3 ? 'Максимум фото' : 'Добавить фото'}
                </Button>
                {uploading && <span className="text-sm text-gray-500">Загрузка...</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {photoPreviews.map((photo, index) => (
                  <div key={index} className="relative aspect-square">
                    <img
                      src={photo.preview}
                      alt={`preview ${index + 1}`}
                      className="w-full h-full object-cover rounded border"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow hover:bg-red-600 transition-colors"
                      aria-label={`Удалить фото ${index + 1}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
              {photoPreviews.length > 0 && (
                <p className="text-xs text-gray-500 mt-1">
                  Выбрано: {photoPreviews.length} из 3 фото
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              onClose();
              setError(null);
            }}
            className="w-full sm:w-auto"
          >
            Отмена
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || !currentUser || reviewForm.text.trim().length === 0}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Отправка...
              </>
            ) : 'Отправить отзыв'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
