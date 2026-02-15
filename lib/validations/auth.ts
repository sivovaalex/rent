import { z } from 'zod';

// Phone validation (Russian format)
export const phoneSchema = z.string()
  .regex(/^\+7\d{10}$/, 'Некорректный формат телефона. Используйте формат +7XXXXXXXXXX');

// SMS code validation
export const smsCodeSchema = z.string()
  .length(6, 'Код должен содержать 6 цифр')
  .regex(/^\d+$/, 'Код должен содержать только цифры');

// Send SMS request
export const sendSmsSchema = z.object({
  phone: phoneSchema,
});

// Verify SMS request
export const verifySmsSchema = z.object({
  phone: phoneSchema,
  code: smsCodeSchema,
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа').optional(),
});

// Email login request
export const loginSchema = z.object({
  email: z.string().email('Некорректный email'),
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
});

// Registration request
export const registerSchema = z.object({
  name: z.string().min(2, 'Имя должно содержать минимум 2 символа'),
  email: z.string().email('Некорректный email'),
  phone: phoneSchema,
  password: z.string().min(6, 'Пароль должен содержать минимум 6 символов'),
  role: z.enum(['renter', 'owner']).default('renter'),
});

// Document upload request
export const uploadDocumentSchema = z.object({
  document_type: z.enum(['passport', 'driver_license', 'other']),
  document_data: z.string().min(1, 'Документ не может быть пустым'),
  owner_type: z.enum(['individual', 'ip', 'legal_entity']).optional(),
  company_name: z.string().optional(),
  inn: z.string().optional(),
  ogrn: z.string().optional(),
}).refine((data) => {
  if (data.owner_type === 'ip' || data.owner_type === 'legal_entity') {
    return !!data.inn && !!data.ogrn;
  }
  return true;
}, { message: 'ИНН и ОГРН обязательны для ИП и юр. лиц' });

// Types
export type SendSmsInput = z.infer<typeof sendSmsSchema>;
export type VerifySmsInput = z.infer<typeof verifySmsSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UploadDocumentInput = z.infer<typeof uploadDocumentSchema>;
