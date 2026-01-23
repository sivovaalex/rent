import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateSMSCode, errorResponse, successResponse } from '@/lib/api-utils';
import { validateBody, sendSmsSchema } from '@/lib/validations';

export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, sendSmsSchema);
    if (!validation.success) return validation.error;

    const { phone } = validation.data;
    const code = generateSMSCode();

    await prisma.smsCode.upsert({
      where: { phone },
      update: {
        code,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      },
      create: {
        phone,
        code,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    // In production, send SMS via provider (e.g., Twilio, SMS.ru)
    // For development, log to console
    console.log(`📱 SMS код для ${phone}: ${code}`);

    return successResponse({ success: true, message: 'Код отправлен' });
  } catch (error) {
    console.error('POST /auth/sms/send Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
