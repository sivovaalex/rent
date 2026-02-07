export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth, safeUser, errorResponse, successResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    const result = await requireAuth(request);
    if ('error' in result) return result.error;

    return successResponse({ user: safeUser(result.user) });
  } catch (error) {
    console.error('GET /auth/me Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
