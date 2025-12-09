import { MongoClient, ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import fs from 'fs';
import nodePath from 'path';
import crypto from 'crypto';
import bcrypt from 'bcrypt';

const client = new MongoClient(process.env.MONGO_URL);
let db;

async function connectDB() {
  if (!db) {
    await client.connect();
    db = client.db('arendapro');
  }
  return db;
}

// Утилиты
function generateSMSCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function encryptDocument(data) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-secret-key-change-me', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptDocument(encryptedData) {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-secret-key-change-me', 'salt', 32);
  const parts = encryptedData.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = parts[1];
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// API Routes
export async function GET(request) {
  const db = await connectDB();
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  try {
    // Получить текущего пользователя
    if (path === '/auth/me') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      const user = await db.collection('users').findOne({ _id: userId });
      if (!user) {
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
      }
      return NextResponse.json({ user });
    }

    // Получить список лотов с фильтрацией
    if (path === '/items') {
      const category = url.searchParams.get('category');
      const search = url.searchParams.get('search');
      const minPrice = url.searchParams.get('minPrice');
      const maxPrice = url.searchParams.get('maxPrice');
      const type = url.searchParams.get('type');
      const brand = url.searchParams.get('brand');
      const size = url.searchParams.get('size');
      const condition = url.searchParams.get('condition');
      const sort = url.searchParams.get('sort') || 'newest';
      
      let query = { status: 'approved' };
      
      if (category) query.category = category;
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } }
        ];
      }
      if (minPrice || maxPrice) {
        query.price_per_day = {};
        if (minPrice) query.price_per_day.$gte = parseFloat(minPrice);
        if (maxPrice) query.price_per_day.$lte = parseFloat(maxPrice);
      }
      if (type) query['attributes.type'] = type;
      if (brand) query['attributes.brand'] = brand;
      if (size) query['attributes.size'] = size;
      if (condition) query['attributes.condition'] = condition;
      
      let sortQuery = {};
      if (sort === 'newest') sortQuery = { createdAt: -1 };
      if (sort === 'price_asc') sortQuery = { price_per_day: 1 };
      if (sort === 'price_desc') sortQuery = { price_per_day: -1 };
      if (sort === 'rating') sortQuery = { 'owner_rating': -1 };
      
      const items = await db.collection('items')
        .find(query)
        .sort(sortQuery)
        .limit(50)
        .toArray();
      
      // Добавляем информацию о владельце
      for (let item of items) {
        const owner = await db.collection('users').findOne({ _id: item.owner_id });
        if (owner) {
          item.owner_name = owner.name;
          item.owner_rating = owner.rating;
        }
      }
      
      return NextResponse.json({ items });
    }

    // Получить конкретный лот
    if (path.startsWith('/items/') && !path.includes('book')) {
      const itemId = path.split('/')[2];
      const item = await db.collection('items').findOne({ _id: itemId });
      
      if (!item) {
        return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
      }
      
      // Добавляем информацию о владельце
      const owner = await db.collection('users').findOne({ _id: item.owner_id });
      if (owner) {
        item.owner_name = owner.name;
        item.owner_rating = owner.rating;
        item.owner_phone = owner.phone;
      }
      
      // Добавляем отзывы
      const reviews = await db.collection('reviews')
        .find({ item_id: itemId })
        .sort({ createdAt: -1 })
        .toArray();
      item.reviews = reviews;
      
      return NextResponse.json({ item });
    }

    // Получить занятые даты для лота
    if (path.startsWith('/items/') && path.endsWith('/blocked-booking-dates')) {
      const itemId = path.split('/')[2];
      const bookings = await db.collection('bookings').find({
        item_id: itemId,
        status: { $in: ['pending_payment', 'paid'] }
      }).toArray();

      const dates = [];
      for (const b of bookings) {
        const start = new Date(b.start_date);
        const end = new Date(b.end_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]); // "YYYY-MM-DD"
        }
      }

      return NextResponse.json({ dates: [...new Set(dates)] });
    }

    // Получить бронирования пользователя
    if (path === '/bookings') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      
      const userType = url.searchParams.get('type'); // 'renter' или 'owner'
      let query = {};
      
      if (userType === 'renter') {
        query.renter_id = userId;
      } else if (userType === 'owner') {
        // Находим все лоты пользователя
        const userItems = await db.collection('items').find({ owner_id: userId }).toArray();
        const itemIds = userItems.map(item => item._id);
        query.item_id = { $in: itemIds };
      } else {
        // Все бронирования пользователя
        const userItems = await db.collection('items').find({ owner_id: userId }).toArray();
        const itemIds = userItems.map(item => item._id);
        query.$or = [
          { renter_id: userId },
          { item_id: { $in: itemIds } }
        ];
      }
      
      const bookings = await db.collection('bookings')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      // Добавляем информацию о лотах и пользователях
      for (let booking of bookings) {
        const item = await db.collection('items').findOne({ _id: booking.item_id });
        const renter = await db.collection('users').findOne({ _id: booking.renter_id });
        booking.item = item;
        booking.renter = renter;
      }
      
      return NextResponse.json({ bookings });
    }

    // Получить пользователей для модерации
    if (path === '/admin/users') {
      const userId = request.headers.get('x-user-id');
      const user = await db.collection('users').findOne({ _id: userId });
      
      if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      
      const status = url.searchParams.get('status');
      let query = {};
      if (status === 'pending') {
        query.verification_status = 'pending';
      }
      
      const users = await db.collection('users')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      return NextResponse.json({ users });
    }

    // Получить лоты для модерации
    if (path === '/admin/items') {
      const userId = request.headers.get('x-user-id');
      const user = await db.collection('users').findOne({ _id: userId });
      
      if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      
      const status = url.searchParams.get('status');
      let query = {};
      if (status === 'pending') {
        query.status = 'pending';
      }
      
      const items = await db.collection('items')
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
      
      // Добавляем информацию о владельце
      for (let item of items) {
        const owner = await db.collection('users').findOne({ _id: item.owner_id });
        if (owner) {
          item.owner_name = owner.name;
          item.owner_phone = owner.phone;
        }
      }
      
      return NextResponse.json({ items });
    }

    // Получить статистику (для админов)
    if (path === '/admin/stats') {
      const userId = request.headers.get('x-user-id');
      const user = await db.collection('users').findOne({ _id: userId });
      
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      
      const totalUsers = await db.collection('users').countDocuments();
      const totalItems = await db.collection('items').countDocuments();
      const totalBookings = await db.collection('bookings').countDocuments();
      const pendingVerifications = await db.collection('users').countDocuments({ verification_status: 'pending' });
      const pendingItems = await db.collection('items').countDocuments({ status: 'pending' });
      
      // Общая сумма комиссий (15% от всех завершенных бронирований)
      const completedBookings = await db.collection('bookings')
        .find({ status: 'completed' })
        .toArray();
      const totalRevenue = completedBookings.reduce((sum, b) => sum + (b.total_price * 0.15), 0);
      
      return NextResponse.json({
        totalUsers,
        totalItems,
        totalBookings,
        pendingVerifications,
        pendingItems,
        totalRevenue
      });
    }

    return NextResponse.json({ error: 'Маршрут не найден' }, { status: 404 });
  } catch (error) {
    console.error('GET Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  const db = await connectDB();
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  const body = await request.json();

  try {
    // Отправка SMS-кода
    if (path === '/auth/send-sms') {
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
    }

    // Верификация SMS-кода и регистрация/вход
    if (path === '/auth/verify-sms') {
      const { phone, code, name } = body;
      
      const smsRecord = await db.collection('sms_codes').findOne({ phone });
      
      if (!smsRecord || smsRecord.code !== code) {
        return NextResponse.json({ error: 'Неверный код' }, { status: 400 });
      }
      
      // Проверяем, существует ли пользователь
      let user = await db.collection('users').findOne({ phone });
      
      if (!user) {
        // Создаём нового пользователя
        const userId = crypto.randomUUID();
        let passwordHash = null;
        if (body.password) {
          passwordHash = await bcrypt.hash(body.password, 10);
        }

        user = {
          _id: userId,
          phone,
          name: name || 'Пользователь',
          email: body.email || null,
          password_hash: passwordHash,
          role: body.role || 'renter', // ← роль из формы
          rating: 5.0,
          verification_status: 'not_verified',
          is_verified: false,
          createdAt: new Date()
        };
        await db.collection('users').insertOne(user);
      }
      
      // Удаляем использованный код
      await db.collection('sms_codes').deleteOne({ phone });
      
      return NextResponse.json({ success: true, user });
    }

    // Загрузка документа для верификации
    if (path === '/auth/upload-document') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      
      const { documentData, documentType } = body; // documentData - base64
      
      // Шифруем и сохраняем документ
      const encryptedData = encryptDocument(documentData);
      
      // Сохраняем в файл
      const uploadsDir = nodePath.join(process.cwd(), 'uploads', 'documents');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      const filename = `${userId}_${Date.now()}.enc`;
      const filepath = nodePath.join(uploadsDir, filename);
      //fs.writeFileSync(filepath, encryptedData);
      await db.collection('users').updateOne(
        { _id: userId },
        { 
          $set: { 
            encrypted_document: encryptedData, // ← сохраняем в БД
            document_type: documentType,
            verification_status: 'pending',
            verification_submitted_at: new Date()
          } 
        }
      );
      
      // Обновляем пользователя
      await db.collection('users').updateOne(
        { _id: userId },
        { 
          $set: { 
            document_path: filepath,
            document_type: documentType,
            verification_status: 'pending',
            verification_submitted_at: new Date()
          } 
        }
      );
      
      return NextResponse.json({ success: true, message: 'Документ загружен на проверку' });
    }

    if (path === '/auth/login') {
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

      const safeUser = { ...user };
      delete safeUser.password_hash;
      return NextResponse.json({ success: true, user: safeUser });
    }

    // Создание лота
    if (path === '/items') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      
      const user = await db.collection('users').findOne({ _id: userId });
      if (!user || !user.is_verified) {
        return NextResponse.json({ error: 'Требуется верификация' }, { status: 403 });
      }
      
      const itemId = crypto.randomUUID();
      const item = {
        _id: itemId,
        owner_id: userId,
        ...body,
        status: 'pending',
        createdAt: new Date()
      };
      
      await db.collection('items').insertOne(item);
      
      return NextResponse.json({ success: true, item });
    }

    // Создание бронирования
    if (path.startsWith('/items/') && path.endsWith('/book')) {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      
      const user = await db.collection('users').findOne({ _id: userId });
      if (!user || !user.is_verified) {
        return NextResponse.json({ error: 'Требуется верификация' }, { status: 403 });
      }
      
      const itemId = path.split('/')[2];
      const item = await db.collection('items').findOne({ _id: itemId });
      
      if (!item) {
        return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
      }
      
      const { start_date, end_date, rental_type, is_insured } = body;
      
      // Рассчитываем стоимость
      const start = new Date(start_date);
      const end = new Date(end_date);
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      
      let rentalPrice = 0;
      if (rental_type === 'day') {
        rentalPrice = item.price_per_day * days;
      } else if (rental_type === 'month') {
        const months = Math.ceil(days / 30);
        rentalPrice = item.price_per_month * months;
      }
      
      const deposit = item.deposit;
      const commission = rentalPrice * 0.15;
      const insurance = is_insured ? rentalPrice * 0.10 : 0;
      const total = rentalPrice + deposit + insurance;
      const prepayment = rentalPrice * 0.30; // 30% предоплата
      
      const bookingId = crypto.randomUUID();
      const booking = {
        _id: bookingId,
        item_id: itemId,
        renter_id: userId,
        start_date: start,
        end_date: end,
        rental_type,
        rental_price: rentalPrice,
        deposit,
        commission,
        insurance,
        total_price: total,
        prepayment,
        is_insured,
        status: 'pending_payment',
        deposit_status: 'held',
        payment_id: `MOCK_${crypto.randomUUID()}`, // Мок-ID платежа
        createdAt: new Date()
      };
      
      await db.collection('bookings').insertOne(booking);
      
      // Мок: симулируем успешный платёж
      console.log(`💳 Мок-платёж создан для бронирования ${bookingId}`);
      console.log(`Сумма: ${total} ₽ (предоплата: ${prepayment} ₽, залог: ${deposit} ₽)`);
      
      // Обновляем статус на "оплачено"
      await db.collection('bookings').updateOne(
        { _id: bookingId },
        { $set: { status: 'paid', paid_at: new Date() } }
      );
      
      return NextResponse.json({ success: true, booking });
    }

    // Добавление фото чек-листа
    if (path.startsWith('/bookings/') && path.endsWith('/checklist')) {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      
      const bookingId = path.split('/')[2];
      const { photos, type } = body; // type: 'handover' или 'return'
      
      const booking = await db.collection('bookings').findOne({ _id: bookingId });
      if (!booking) {
        return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 });
      }
      
      const updateField = type === 'handover' ? 'handover_photos' : 'return_photos';
      
      await db.collection('bookings').updateOne(
        { _id: bookingId },
        { $set: { [updateField]: photos, [`${type}_confirmed_at`]: new Date() } }
      );
      
      return NextResponse.json({ success: true });
    }

    // Подтверждение возврата
    if (path.startsWith('/bookings/') && path.endsWith('/confirm-return')) {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      
      const bookingId = path.split('/')[2];
      const booking = await db.collection('bookings').findOne({ _id: bookingId });
      
      if (!booking) {
        return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 });
      }
      
      // Проверяем, что пользователь - владелец лота
      const item = await db.collection('items').findOne({ _id: booking.item_id });
      if (item.owner_id !== userId) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      
      // Обновляем статус
      await db.collection('bookings').updateOne(
        { _id: bookingId },
        { 
          $set: { 
            status: 'completed',
            deposit_status: 'returned',
            completed_at: new Date()
          } 
        }
      );
      
      // Мок: возврат залога
      console.log(`💰 Залог ${booking.deposit} ₽ возвращён арендатору`);
      console.log(`💰 Арендодатель получил ${booking.rental_price - booking.commission} ₽`);
      
      return NextResponse.json({ success: true });
    }

    // Создание отзыва
    if (path === '/reviews') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      
      const { booking_id, item_id, rating, text, photos } = body;
      
      // Проверяем, что бронирование завершено
      const booking = await db.collection('bookings').findOne({ _id: booking_id });
      if (!booking || booking.status !== 'completed') {
        return NextResponse.json({ error: 'Можно оставить отзыв только после завершения аренды' }, { status: 400 });
      }
      
      const reviewId = crypto.randomUUID();
      const review = {
        _id: reviewId,
        booking_id,
        item_id,
        user_id: userId,
        rating,
        text,
        photos: photos || [],
        createdAt: new Date()
      };
      
      await db.collection('reviews').insertOne(review);
      
      // Обновляем рейтинг владельца
      const item = await db.collection('items').findOne({ _id: item_id });
      const allReviews = await db.collection('reviews').find({ item_id }).toArray();
      const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
      
      await db.collection('users').updateOne(
        { _id: item.owner_id },
        { $set: { rating: avgRating } }
      );
      
      return NextResponse.json({ success: true, review });
    }

    // Модерация пользователя
    if (path.startsWith('/admin/users/') && path.endsWith('/verify')) {
      const userId = request.headers.get('x-user-id');
      const user = await db.collection('users').findOne({ _id: userId });
      
      if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      
      const targetUserId = path.split('/')[3];
      const { action, reason } = body; // action: 'approve' или 'reject'
      
      const updateData = {
        verification_status: action === 'approve' ? 'verified' : 'rejected',
        is_verified: action === 'approve',
        verified_at: new Date(),
        verified_by: userId
      };
      
      if (reason) {
        updateData.rejection_reason = reason;
      }
      
      await db.collection('users').updateOne(
        { _id: targetUserId },
        { $set: updateData }
      );
      
      return NextResponse.json({ success: true });
    }

    // Модерация лота
    if (path.startsWith('/admin/items/') && path.endsWith('/moderate')) {
      const userId = request.headers.get('x-user-id');
      const user = await db.collection('users').findOne({ _id: userId });
      
      if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      
      const itemId = path.split('/')[3];
      const { action, reason } = body; // action: 'approve' или 'reject'
      
      const updateData = {
        status: action === 'approve' ? 'approved' : 'rejected',
        moderated_at: new Date(),
        moderated_by: userId
      };
      
      if (reason) {
        updateData.rejection_reason = reason;
      }
      
      await db.collection('items').updateOne(
        { _id: itemId },
        { $set: updateData }
      );
      
      return NextResponse.json({ success: true });
    }

    // Блокировка пользователя
    if (path.startsWith('/admin/users/') && path.endsWith('/block')) {
      const userId = request.headers.get('x-user-id');
      const user = await db.collection('users').findOne({ _id: userId });
      
      if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      
      const targetUserId = path.split('/')[3];
      const { reason } = body;
      
      await db.collection('users').updateOne(
        { _id: targetUserId },
        { 
          $set: { 
            is_blocked: true,
            blocked_at: new Date(),
            blocked_by: userId,
            block_reason: reason
          } 
        }
      );
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Маршрут не найден' }, { status: 404 });
  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  const db = await connectDB();
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  const body = await request.json();

  try {
    // Обновление профиля
    if (path === '/profile') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      
      const { name, role } = body;
      const updateData = {};
      if (name) updateData.name = name;
      if (role) updateData.role = role;
      
      await db.collection('users').updateOne(
        { _id: userId },
        { $set: updateData }
      );
      
      return NextResponse.json({ success: true });
    }

    // Обновление лота
    if (path.startsWith('/items/')) {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      
      const itemId = path.split('/')[2];
      const item = await db.collection('items').findOne({ _id: itemId });
      
      if (!item || item.owner_id !== userId) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      
      await db.collection('items').updateOne(
        { _id: itemId },
        { $set: { ...body, updatedAt: new Date() } }
      );
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Маршрут не найден' }, { status: 404 });
  } catch (error) {
    console.error('PATCH Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const db = await connectDB();
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  try {
    // Удаление лота
    if (path.startsWith('/items/')) {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      
      const itemId = path.split('/')[2];
      const item = await db.collection('items').findOne({ _id: itemId });
      
      if (!item || item.owner_id !== userId) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      
      await db.collection('items').deleteOne({ _id: itemId });
      
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Маршрут не найден' }, { status: 404 });
  } catch (error) {
    console.error('DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}