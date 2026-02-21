import { z } from 'zod';

// Category enum (matches Prisma schema)
export const categorySchema = z.enum(['stream', 'electronics', 'clothes', 'sports', 'tools', 'other']);

// Approval mode enum
export const approvalModeSchema = z.enum(['auto_approve', 'manual', 'rating_based', 'verified_only']);

// Item status enum
export const itemStatusSchema = z.enum(['pending', 'approved', 'rejected', 'draft']);

// Create item request
export const createItemSchema = z.object({
  category: categorySchema,
  subcategory: z.string().optional().nullable(),
  title: z.string().min(3, 'Название должно содержать минимум 3 символа').max(100, 'Название слишком длинное'),
  description: z.string().min(10, 'Описание должно содержать минимум 10 символов').max(2000, 'Описание слишком длинное'),
  price_per_day: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))).pipe(
    z.number().positive('Цена за день должна быть положительной')
  ),
  pricePerDay: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))).pipe(
    z.number().positive('Цена за день должна быть положительной')
  ).optional(),
  price_per_month: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))).pipe(
    z.number().positive('Цена за месяц должна быть положительной')
  ),
  pricePerMonth: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))).pipe(
    z.number().positive('Цена за месяц должна быть положительной')
  ).optional(),
  deposit: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))).pipe(
    z.number().nonnegative('Залог не может быть отрицательным')
  ),
  address: z.string().min(5, 'Адрес должен содержать минимум 5 символов'),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  photos: z.array(z.string()).max(5, 'Максимум 5 фото').default([]),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  approval_mode: approvalModeSchema.optional().nullable(),
  approval_threshold: z.number().min(3.0).max(5.0).optional().nullable(),
});

// Update item request (all fields optional)
export const updateItemSchema = z.object({
  title: z.string().min(3).max(100).optional(),
  description: z.string().min(10).max(2000).optional(),
  price_per_day: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))).pipe(
    z.number().positive()
  ).optional(),
  pricePerDay: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))).pipe(
    z.number().positive()
  ).optional(),
  price_per_month: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))).pipe(
    z.number().positive()
  ).optional(),
  pricePerMonth: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))).pipe(
    z.number().positive()
  ).optional(),
  deposit: z.union([z.string(), z.number()]).transform(val => parseFloat(String(val))).pipe(
    z.number().nonnegative()
  ).optional(),
  address: z.string().min(5).optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  photos: z.array(z.string()).max(5).optional(),
  category: categorySchema.optional(),
  subcategory: z.string().optional().nullable(),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  approval_mode: approvalModeSchema.optional().nullable(),
  approval_threshold: z.number().min(3.0).max(5.0).optional().nullable(),
});

// Item list query params
export const itemsQuerySchema = z.object({
  category: categorySchema.optional(),
  subcategory: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'rating']).default('newest'),
  status: itemStatusSchema.optional(),
  owner_id: z.string().optional(),
  min_price: z.string().transform(val => parseInt(val)).optional(),
  max_price: z.string().transform(val => parseInt(val)).optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

// Moderate item request
export const moderateItemSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejection_reason: z.string().optional(),
}).refine(
  (data) => data.status !== 'rejected' || (data.rejection_reason && data.rejection_reason.trim().length >= 3),
  { message: 'Укажите причину отклонения (минимум 3 символа)', path: ['rejection_reason'] },
);

// Types
export type CreateItemInput = z.infer<typeof createItemSchema>;
export type UpdateItemInput = z.infer<typeof updateItemSchema>;
export type ItemsQueryInput = z.infer<typeof itemsQuerySchema>;
export type ModerateItemInput = z.infer<typeof moderateItemSchema>;
