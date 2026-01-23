import { z } from 'zod';

// Update profile request
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(100).optional(),
  email: z.string().email('Некорректный email').optional(),
  avatar: z.string().url('Некорректный URL аватара').optional().nullable(),
  address: z.string().max(200).optional(),
  bio: z.string().max(500).optional(),
});

// Types
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
