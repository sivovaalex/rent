import { MongoClient, ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const client = new MongoClient(process.env.MONGODB_URI);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('arendapro');
  }
  return db;
}

// Генерация SMS кода
function generateSMSCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// PUT /api/auth - Верификация SMS кода и регистрация
export async function PUT(request) {
  const db = await connectDB();
  const body = await request.json();
  
  try {
    const { phone, code, name, email, password, role } = body;
    
    if (!phone || !code || !name) {
      return NextResponse.json({ error: 'Телефон, код и имя обязательны' }, { status: 400 });
    }
    
    const smsRecord = await db.collection('sms_codes').findOne({ phone });
    
    if (!smsRecord || smsRecord.code !== code) {
      return NextResponse.json({ error: 'Неверный код' }, { status: 400 });
    }
    
    // Проверяем, существует ли пользователь
    let user = await db.collection('users').findOne({ phone });
    
    if (!user) {
      // Создаем нового пользователя
      const userId = crypto.randomUUID();
      
      user = {
        _id: userId,
        phone,
        name,
        email: email || null,
        password_hash: password ? await bcrypt.hash(password, 10) : null,
        role: role || 'renter',
        rating: 5.0,
        verification_status: 'not_verified',
        is_verified: false,
        createdAt: new Date()
      };
      
      await db.collection('users').insertOne(user);
    } else {
      // Если пользователь уже существует, но не имеет пароля, устанавливаем его
      if (!user.password_hash && password) {
        await db.collection('users').updateOne(
          { _id: user._id },
          { $set: { password_hash: await bcrypt.hash(password, 10) } }
        );
      }
    }
    
    // Удаляем использованный код
    await db.collection('sms_codes').deleteOne({ phone });
    
    // Безопасный ответ (без хеша пароля)
    const safeUser = { ...user };
    delete safeUser.password_hash;
    
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('Ошибка верификации SMS:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PATCH /api/auth - Вход по email и паролю
export async function PATCH(request) {
  const db = await connectDB();
  const body = await request.json();
  
  try {
    const { email, password } = body;
    
    if (!email || !password) {
      return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 });
    }
    
    const user = await db.collection('users').findOne({ email });
    
    if (!user || !user.password_hash) {
      return NextResponse.json({ error: 'Неверные данные' }, { status: 401 });
    }
    
    const isValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isValid) {
      return NextResponse.json({ error: 'Неверные данные' }, { status: 401 });
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
    
    return NextResponse.json({ success: true, user: safeUser });
  } catch (error) {
    console.error('Ошибка входа:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// POST /api/auth - Отправка SMS кода
export async function POST(request) {
  const db = await connectDB();
  const body = await request.json();
  
  try {
    const { phone } = body;
    
    if (!phone) {
      return NextResponse.json({ error: 'Телефон обязателен' }, { status: 400 });
    }
    
    const code = generateSMSCode();
    
    // Сохраняем код в БД
    await db.collection('sms_codes').updateOne(
      { phone },
      { $set: { phone, code, createdAt: new Date() } },
      { upsert: true }
    );
    
    // Мок: выводим код в консоль
    console.log(`📱 SMS код для ${phone}: ${code}`);
    
    return NextResponse.json({ success: true, message: 'Код отправлен' });
  } catch (error) {
    console.error('Ошибка отправки SMS:', error);
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}