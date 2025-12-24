import { MongoClient, ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';

const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('arendapro');
  }
  return db;
}

export async function GET(request) {
  const db = await connectDB();
  const userId = request.headers.get('x-user-id');
  
  try {
    if (!userId) {
      return NextResponse.json({ error: 'Требуется авторизация' }, { status: 401 });
    }
    
    const user = await db.collection('users').findOne({ _id: userId });
    
    if (!user) {
      return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
    }
    
    // Безопасный ответ (без хеша пароля)
    const safeUser = { 
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      rating: user.rating,
      is_verified: user.is_verified,
      verification_status: user.verification_status,
      createdAt: user.createdAt
    };
    
    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error('Ошибка получения данных пользователя:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}