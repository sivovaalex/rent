export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { requireAuth, safeUser, errorResponse, successResponse } from '@/lib/api-utils';
import { recalculateTrust } from '@/lib/trust';

export async function GET(request: NextRequest) {
  try {
    const result = await requireAuth(request);
    if ('error' in result) return result.error;

    // Lazy trust recalculation: if trust was never calculated or is stale (>24h)
    const trustAge = result.user.trustUpdatedAt
      ? Date.now() - new Date(result.user.trustUpdatedAt).getTime()
      : Infinity;
    if (trustAge > 24 * 60 * 60 * 1000) {
      // Fire-and-forget: don't block response
      recalculateTrust(result.userId).catch(console.error);
    }

    return successResponse({ user: safeUser(result.user) });
  } catch (error) {
    console.error('GET /auth/me Error:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
