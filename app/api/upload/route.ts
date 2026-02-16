export const dynamic = 'force-dynamic';
import { NextRequest } from 'next/server';
import { uploadBase64File, deleteFile, BUCKETS, generateFilePath } from '@/lib/supabase/storage';
import { requireAuth, errorResponse, successResponse } from '@/lib/api-utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB base64
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { type, data, itemId } = body;
    const userId = authResult.userId;

    if (!type || !data) {
      return errorResponse('Недостаточно данных для загрузки', 400);
    }

    // Validate file size (base64 string length)
    if (data.length > MAX_FILE_SIZE) {
      return errorResponse('Файл слишком большой (максимум 10 МБ)', 400);
    }

    let bucket: string;
    let filePath: string;

    switch (type) {
      case 'item_photos':
        bucket = BUCKETS.ITEMS;
        filePath = generateFilePath(itemId || 'new', userId);
        break;
      case 'review_photos':
        bucket = BUCKETS.REVIEWS;
        filePath = generateFilePath(userId, userId);
        break;
      case 'profile_photo':
        bucket = BUCKETS.AVATARS;
        filePath = generateFilePath('', userId);
        break;
      default:
        return errorResponse('Неподдерживаемый тип загрузки', 400);
    }

    // Determine content type from base64 data
    let contentType = 'image/jpeg';
    if (data.includes('data:image/png')) {
      contentType = 'image/png';
    } else if (data.includes('data:image/webp')) {
      contentType = 'image/webp';
    } else if (data.includes('data:image/gif')) {
      contentType = 'image/gif';
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return errorResponse('Недопустимый тип файла', 400);
    }

    const result = await uploadBase64File(bucket, filePath, data, contentType);

    if (!result.success) {
      return errorResponse(result.error || 'Ошибка загрузки', 500);
    }

    return successResponse({
      success: true,
      path: result.url,
      storagePath: result.path
    });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if ('error' in authResult) return authResult.error;

    const body = await request.json();
    const { path: filePath, storagePath } = body;

    // If storagePath is provided, use it directly
    // Otherwise, try to extract from the URL
    let pathToDelete = storagePath;

    if (!pathToDelete && filePath) {
      // Extract path from Supabase URL
      // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket/path
      const match = filePath.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)/);
      if (match) {
        const [, bucket, path] = match;
        pathToDelete = path;

        const result = await deleteFile(bucket as typeof BUCKETS.ITEMS, pathToDelete);
        if (!result.success) {
          return errorResponse(result.error || 'Ошибка удаления', 500);
        }
      }
    }

    return successResponse({ success: true });
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    return errorResponse('Ошибка сервера', 500);
  }
}
