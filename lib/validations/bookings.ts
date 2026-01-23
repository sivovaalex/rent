import { z } from 'zod';

// Rental type enum
export const rentalTypeSchema = z.enum(['day', 'month']);

// Booking status enum (matches Prisma schema)
export const bookingStatusSchema = z.enum(['pending_payment', 'paid', 'active', 'completed', 'cancelled']);

// Create booking request
export const createBookingSchema = z.object({
  start_date: z.string().refine(val => !isNaN(Date.parse(val)), 'Некорректная дата начала'),
  end_date: z.string().refine(val => !isNaN(Date.parse(val)), 'Некорректная дата окончания'),
  rental_type: rentalTypeSchema,
  is_insured: z.boolean().default(false),
}).refine(data => {
  const start = new Date(data.start_date);
  const end = new Date(data.end_date);
  return end >= start;
}, {
  message: 'Дата окончания должна быть позже даты начала',
  path: ['end_date'],
});

// Checklist upload request
export const checklistSchema = z.object({
  type: z.enum(['handover', 'return']),
  photos: z.array(z.string()).min(1, 'Необходимо загрузить минимум 1 фото').max(10, 'Максимум 10 фото'),
  notes: z.string().max(1000, 'Заметки слишком длинные').optional(),
});

// Confirm return request
export const confirmReturnSchema = z.object({
  condition: z.enum(['good', 'damaged', 'lost']).default('good'),
  damage_description: z.string().max(1000).optional(),
  deduction_amount: z.number().nonnegative().optional(),
});

// Bookings query params
export const bookingsQuerySchema = z.object({
  role: z.enum(['renter', 'owner', 'all']).default('all'),
  status: bookingStatusSchema.optional(),
  page: z.coerce.number().default(1),
  limit: z.coerce.number().default(20),
});

// Types
export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type ChecklistInput = z.infer<typeof checklistSchema>;
export type ConfirmReturnInput = z.infer<typeof confirmReturnSchema>;
export type BookingsQueryInput = z.infer<typeof bookingsQuerySchema>;
