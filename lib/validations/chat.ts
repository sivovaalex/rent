import { z } from 'zod';

export const chatMessageSchema = z.object({
  text: z.string()
    .trim()
    .min(1, 'Сообщение не может быть пустым')
    .max(2000, 'Сообщение слишком длинное (макс. 2000 символов)'),
});

export type ChatMessageInput = z.infer<typeof chatMessageSchema>;
