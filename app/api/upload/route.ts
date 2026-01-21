import { NextResponse, NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.json();

  try {
    const { type, data, userId, itemId } = body;

    if (!type || !data || !userId) {
      return NextResponse.json({ error: 'Недостаточно данных для загрузки' }, { status: 400 });
    }

    let uploadDir = '';
    let fileName = '';

    switch (type) {
      case 'item_photos':
        uploadDir = path.join(process.cwd(), 'public', 'uploads', 'items', itemId || crypto.randomUUID());
        fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
        break;
      case 'review_photos':
        uploadDir = path.join(process.cwd(), 'public', 'uploads', 'reviews', userId);
        fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`;
        break;
      case 'profile_photo':
        uploadDir = path.join(process.cwd(), 'public', 'uploads', 'profiles', userId);
        fileName = `${Date.now()}.jpg`;
        break;
      default:
        return NextResponse.json({ error: 'Неподдерживаемый тип загрузки' }, { status: 400 });
    }

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = path.join(uploadDir, fileName);
    const base64Data = data.split(',')[1];

    if (!base64Data) {
      return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 });
    }

    fs.writeFileSync(filePath, base64Data, 'base64');

    const relativePath = `/uploads/${type === 'item_photos' ? `items/${itemId || 'new'}` : (type === 'review_photos' ? 'reviews' : 'profiles')}/${fileName}`;

    return NextResponse.json({ success: true, path: relativePath });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const body = await request.json();

  try {
    const { path: filePath, userId } = body;

    if (!filePath || !userId) {
      return NextResponse.json({ error: 'Недостаточно данных для удаления' }, { status: 400 });
    }

    if (!filePath.includes(userId) && !filePath.includes('/items/')) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }

    const fullPath = path.join(process.cwd(), 'public', filePath);

    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
