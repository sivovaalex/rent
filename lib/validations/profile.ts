import { z } from 'zod';

// Approval mode enum
const approvalModeSchema = z.enum(['auto_approve', 'manual', 'rating_based', 'verified_only']);

// Update profile request
export const updateProfileSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа').max(100).optional(),
  email: z.string().email('Некорректный email').optional(),
  avatar: z.string().url('Некорректный URL аватара').optional().nullable(),
  address: z.string().max(200).optional(),
  bio: z.string().max(500).optional(),
  defaultApprovalMode: approvalModeSchema.optional(),
  defaultApprovalThreshold: z.number().min(3.0).max(5.0).optional(),
});

// Types
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
