import { MongoClient, Db } from 'mongodb';
import { NextResponse, NextRequest } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const client = new MongoClient(process.env.MONGODB_URI!);
let db: Db | null = null;

async function connectDB(): Promise<Db> {
  if (!db) {
    await client.connect();
    db = client.db('arendapro');
  }
  return db;
}

export async function POST(request: NextRequest) {
  const database = await connectDB();
  const body = await request.json();

  try {
    const { name, email, password, phone, role } = body;

    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
    }

    const existingUser = await database.collection('users').findOne({
      $or: [{ email }, { phone }]
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Пользователь с таким email или телефоном уже существует' }, { status: 400 });
    }

    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    const user = {
      _id: userId,
      name,
      email,
      phone,
      password_hash: passwordHash,
      role: role || 'renter',
      rating: 5.0,
      verification_status: 'not_verified',
      is_verified: false,
      createdAt: new Date()
    };

    await database.collection('users').insertOne(user as any);

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

    return NextResponse.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('Ошибка регистрации:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
