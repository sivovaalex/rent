import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export async function POST(request) {
  const body = await request.json();
  
  try {
    const { type, data, userId, itemId } = body;
    
    if (!type || !data || !userId) {
      return NextResponse.json({ error: 'Недостаточно данных для загрузки' }, { status: 400 });
    }
    
    // Определяем директорию для загрузки
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
    
    // Создаем директорию если её нет
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // Сохраняем файл
    const filePath = path.join(uploadDir, fileName);
    const base64Data = data.split(',')[1];
    
    if (!base64Data) {
      return NextResponse.json({ error: 'Неверный формат данных' }, { status: 400 });
    }
    
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    
    // Возвращаем путь относительно public
    const relativePath = `/uploads/${type === 'item_photos' ? `items/${itemId || 'new'}` : (type === 'review_photos' ? 'reviews' : 'profiles')}/${fileName}`;
    
    return NextResponse.json({ success: true, path: relativePath });
  } catch (error) {
    console.error('Ошибка загрузки файла:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

export async function DELETE(request) {
  const body = await request.json();
  
  try {
    const { path, userId } = body;
    
    if (!path || !userId) {
      return NextResponse.json({ error: 'Недостаточно данных для удаления' }, { status: 400 });
    }
    
    // Проверяем, что путь принадлежит пользователю
    if (!path.includes(userId) && !path.includes('/items/')) {
      return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
    }
    
    // Формируем полный путь к файлу
    const filePath = path.join(process.cwd(), 'public', path);
    
    // Удаляем файл если он существует
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Ошибка удаления файла:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}