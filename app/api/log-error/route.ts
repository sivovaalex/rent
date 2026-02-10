export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api-utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, stack, componentStack, timestamp, url } = body;

    if (!message) {
      return errorResponse('Missing error message', 400);
    }

    console.error('[CLIENT ERROR]', {
      message,
      stack: stack?.slice(0, 1000),
      componentStack: componentStack?.slice(0, 500),
      timestamp,
      url,
    });

    return successResponse({ success: true });
  } catch (error) {
    console.error('POST /api/log-error Error:', error);
    return successResponse({ success: true }); // Always return 200 to not break client
  }
}
