export const dynamic = 'force-dynamic';
import { NextResponse, NextRequest } from 'next/server';
import { uploadBase64File, deleteFile, BUCKETS, generateFilePath } from '@/lib/supabase/storage';

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const { type, data, userId, itemId } = body;

    if (!type || !data || !userId) {
      return NextResponse.json({ error: 'Недостаточно данных для загрузки' }, { status: 400 });
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
        return NextResponse.json({ error: 'Неподдерживаемый тип загрузки' }, { status: 400 });
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

    const result = await uploadBase64File(bucket, filePath, data, contentType);

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Ошибка загрузки' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      path: result.url,
      storagePath: result.path
    });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();

  try {
    const { path: filePath, userId, storagePath } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Недостаточно данных для удаления' }, { status: 400 });
    }

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
          return NextResponse.json({ error: result.error }, { status: 500 });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
