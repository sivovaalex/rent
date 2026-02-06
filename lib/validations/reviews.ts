import { z } from 'zod';

// Review type enum
export const reviewTypeSchema = z.enum(['renter_review', 'owner_review']);

// Create review request
export const createReviewSchema = z.object({
  booking_id: z.string().min(1, 'ID бронирования обязателен'),
  item_id: z.string().min(1, 'ID товара обязателен'),
  rating: z.number().int().min(1, 'Минимальная оценка 1').max(5, 'Максимальная оценка 5'),
  text: z.string().min(10, 'Отзыв должен содержать минимум 10 символов').max(2000, 'Отзыв слишком длинный'),
  photos: z.array(z.string()).max(5, 'Максимум 5 фото').default([]),
  type: reviewTypeSchema.default('renter_review'),
});

// Create review reply request
export const createReviewReplySchema = z.object({
  review_id: z.string().min(1, 'ID отзыва обязателен'),
  text: z.string().min(5, 'Ответ должен содержать минимум 5 символов').max(1000, 'Ответ слишком длинный'),
});

// Types
export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type CreateReviewReplyInput = z.infer<typeof createReviewReplySchema>;
