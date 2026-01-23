import { NextResponse, NextRequest } from 'next/server';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// Утилиты
function generateSMSCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function encryptDocument(data: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-secret-key-change-me', 'salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, new Uint8Array(key), new Uint8Array(iv));
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// API Routes
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');

  try {
    // Получить текущего пользователя
    if (path === '/auth/me') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user) {
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
      }
      const { passwordHash: _, ...safeUser } = user;
      return NextResponse.json({ user: safeUser });
    }

    // Получить список лотов с фильтрацией
    if (path === '/items') {
      const category = url.searchParams.get('category');
      const subcategory = url.searchParams.get('subcategory');
      const search = url.searchParams.get('search');
      const minPrice = url.searchParams.get('minPrice');
      const maxPrice = url.searchParams.get('maxPrice');
      const sort = url.searchParams.get('sort') || 'newest';
      const owner_id = url.searchParams.get('owner_id');
      const show_all_statuses = url.searchParams.get('show_all_statuses') === 'true';

      const where: Prisma.ItemWhereInput = {};

      if (owner_id) {
        where.ownerId = owner_id;
        if (show_all_statuses) {
          where.status = { in: ['approved', 'pending', 'rejected', 'draft'] };
        } else {
          where.status = 'approved';
        }
      } else {
        where.status = 'approved';
      }

      if (category && category !== 'all') {
        where.category = category as any;
      }
      if (subcategory && subcategory !== 'all') {
        where.subcategory = subcategory;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (minPrice || maxPrice) {
        where.pricePerDay = {};
        if (minPrice) where.pricePerDay.gte = parseFloat(minPrice);
        if (maxPrice) where.pricePerDay.lte = parseFloat(maxPrice);
      }

      let orderBy: Prisma.ItemOrderByWithRelationInput = {};
      if (sort === 'newest') orderBy = { createdAt: 'desc' };
      if (sort === 'price_asc') orderBy = { pricePerDay: 'asc' };
      if (sort === 'price_desc') orderBy = { pricePerDay: 'desc' };
      if (sort === 'rating') orderBy = { rating: 'desc' };

      const items = await prisma.item.findMany({
        where,
        orderBy,
        take: 50,
        include: {
          owner: {
            select: { id: true, name: true, rating: true, phone: true }
          }
        }
      });

      const transformedItems = items.map(item => ({
        _id: item.id,
        ...item,
        owner_id: item.ownerId,
        owner_name: item.owner.name,
        owner_rating: item.owner.rating,
        price_per_day: item.pricePerDay,
        price_per_month: item.pricePerMonth,
      }));

      return NextResponse.json({ items: transformedItems });
    }

    // Получить конкретный лот
    if (path.startsWith('/items/') && !path.includes('book') && !path.includes('publish') && !path.includes('unpublish') && !path.includes('blocked')) {
      const itemId = path.split('/')[2];
      const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
          owner: { select: { id: true, name: true, rating: true, phone: true } },
          reviews: {
            orderBy: { createdAt: 'desc' },
            include: { user: { select: { name: true } } }
          }
        }
      });
      if (!item) {
        return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
      }

      const transformedItem = {
        _id: item.id,
        ...item,
        owner_id: item.ownerId,
        owner_name: item.owner.name,
        owner_rating: item.owner.rating,
        owner_phone: item.owner.phone,
        price_per_day: item.pricePerDay,
        price_per_month: item.pricePerMonth,
        reviews: item.reviews.map(r => ({
          _id: r.id,
          ...r,
          user_id: r.userId,
          item_id: r.itemId,
          booking_id: r.bookingId
        }))
      };

      return NextResponse.json({ item: transformedItem });
    }

    // Получить занятые даты для лота
    if (path.startsWith('/items/') && path.endsWith('/blocked-booking-dates')) {
      const itemId = path.split('/')[2];
      const bookings = await prisma.booking.findMany({
        where: {
          itemId,
          status: { in: ['pending_payment', 'paid'] }
        }
      });

      const dates: string[] = [];
      for (const b of bookings) {
        const start = new Date(b.startDate);
        const end = new Date(b.endDate);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          dates.push(d.toISOString().split('T')[0]);
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

      const userType = url.searchParams.get('type');
      let where: Prisma.BookingWhereInput = {};

      if (userType === 'renter') {
        where.renterId = userId;
      } else if (userType === 'owner') {
        where.item = { ownerId: userId };
      } else {
        where.OR = [
          { renterId: userId },
          { item: { ownerId: userId } }
        ];
      }

      const bookings = await prisma.booking.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          item: true,
          renter: { select: { id: true, name: true, phone: true, email: true } },
          review: true
        }
      });

      const transformedBookings = bookings.map(b => ({
        _id: b.id,
        ...b,
        item_id: b.itemId,
        renter_id: b.renterId,
        start_date: b.startDate,
        end_date: b.endDate,
        rental_type: b.rentalType,
        rental_price: b.rentalPrice,
        total_price: b.totalPrice,
        is_insured: b.isInsured,
        deposit_status: b.depositStatus,
        payment_id: b.paymentId,
        handover_photos: b.handoverPhotos,
        return_photos: b.returnPhotos,
        item: b.item ? {
          _id: b.item.id,
          ...b.item,
          owner_id: b.item.ownerId,
          price_per_day: b.item.pricePerDay,
          price_per_month: b.item.pricePerMonth
        } : null,
        renter: b.renter,
        review: b.review ? { _id: b.review.id, ...b.review } : null
      }));

      return NextResponse.json({ bookings: transformedBookings });
    }

    // Получить пользователей для модерации
    if (path === '/admin/users') {
      const userId = request.headers.get('x-user-id');
      const user = await prisma.user.findUnique({ where: { id: userId! } });
      if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      const status = url.searchParams.get('status');
      const where: Prisma.UserWhereInput = {};
      if (status === 'pending') {
        where.verificationStatus = 'pending';
      }
      const users = await prisma.user.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });
      const safeUsers = users.map(u => {
        const { passwordHash: _, ...safe } = u;
        return { _id: u.id, ...safe, verification_status: u.verificationStatus, is_verified: u.isVerified };
      });
      return NextResponse.json({ users: safeUsers });
    }

    // Получить всех пользователей (только для админов)
    if (path === '/admin/users/all') {
      const userId = request.headers.get('x-user-id');
      const user = await prisma.user.findUnique({ where: { id: userId! } });
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      const users = await prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
      const safeUsers = users.map(u => {
        const { passwordHash: _, ...safe } = u;
        return { _id: u.id, ...safe, verification_status: u.verificationStatus, is_verified: u.isVerified };
      });
      return NextResponse.json({ users: safeUsers });
    }

    // Получить лоты для модерации
    if (path === '/admin/items') {
      const userId = request.headers.get('x-user-id');
      const user = await prisma.user.findUnique({ where: { id: userId! } });
      if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      const status = url.searchParams.get('status');
      const where: Prisma.ItemWhereInput = {};
      if (status === 'pending') {
        where.status = 'pending';
      }
      const items = await prisma.item.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { name: true, phone: true } } }
      });
      const transformedItems = items.map(item => ({
        _id: item.id,
        ...item,
        owner_id: item.ownerId,
        owner_name: item.owner.name,
        owner_phone: item.owner.phone,
        price_per_day: item.pricePerDay,
        price_per_month: item.pricePerMonth
      }));
      return NextResponse.json({ items: transformedItems });
    }

    // Получить статистику (для админов)
    if (path === '/admin/stats') {
      const userId = request.headers.get('x-user-id');
      const user = await prisma.user.findUnique({ where: { id: userId! } });
      if (!user || user.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      const [totalUsers, totalItems, totalBookings, pendingVerifications, pendingItems] = await Promise.all([
        prisma.user.count(),
        prisma.item.count(),
        prisma.booking.count(),
        prisma.user.count({ where: { verificationStatus: 'pending' } }),
        prisma.item.count({ where: { status: 'pending' } })
      ]);

      const completedBookings = await prisma.booking.findMany({
        where: { status: 'completed' },
        select: { commission: true }
      });
      const totalRevenue = completedBookings.reduce((sum, b) => sum + b.commission, 0);

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
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
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
      await prisma.smsCode.upsert({
        where: { phone },
        update: { code, createdAt: new Date(), expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
        create: { phone, code, expiresAt: new Date(Date.now() + 5 * 60 * 1000) }
      });
      console.log(`📱 SMS код для ${phone}: ${code}`);
      return NextResponse.json({ success: true, message: 'Код отправлен' });
    }

    // Верификация SMS-кода и регистрация/вход
    if (path === '/auth/verify-sms') {
      const { phone, code, name } = body;
      const smsRecord = await prisma.smsCode.findUnique({ where: { phone } });
      if (!smsRecord || smsRecord.code !== code) {
        return NextResponse.json({ error: 'Неверный код' }, { status: 400 });
      }

      let user = await prisma.user.findUnique({ where: { phone } });
      if (!user) {
        let passwordHash: string | null = null;
        if (body.password) {
          passwordHash = await bcrypt.hash(body.password, 10);
        }
        user = await prisma.user.create({
          data: {
            phone,
            name: name || 'Пользователь',
            email: body.email || null,
            passwordHash,
            role: body.role || 'renter'
          }
        });
      }
      await prisma.smsCode.delete({ where: { phone } });
      const { passwordHash: _, ...safeUser } = user;
      return NextResponse.json({ success: true, user: { _id: user.id, ...safeUser, verification_status: user.verificationStatus, is_verified: user.isVerified } });
    }

    // Загрузка документа для верификации
    if (path === '/auth/upload-document') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      const { documentData, documentType } = body;
      const encryptedData = encryptDocument(documentData);
      await prisma.user.update({
        where: { id: userId },
        data: {
          encryptedDocument: encryptedData,
          documentType,
          verificationStatus: 'pending',
          verificationSubmittedAt: new Date()
        }
      });
      return NextResponse.json({ success: true, message: 'Документ загружен на проверку' });
    }

    // Логин по email
    if (path === '/auth/login') {
      const { email, password } = body;
      if (!email || !password) {
        return NextResponse.json({ error: 'Email и пароль обязательны' }, { status: 400 });
      }
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user || !user.passwordHash) {
        return NextResponse.json({ error: 'Неверные данные' }, { status: 401 });
      }
      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Неверные данные' }, { status: 401 });
      }
      const { passwordHash: _, ...safeUser } = user;
      return NextResponse.json({ success: true, user: { _id: user.id, ...safeUser, verification_status: user.verificationStatus, is_verified: user.isVerified } });
    }

    // Создание лота
    if (path === '/items') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isVerified) {
        return NextResponse.json({ error: 'Требуется верификация' }, { status: 403 });
      }
      const item = await prisma.item.create({
        data: {
          ownerId: userId,
          category: body.category,
          subcategory: body.subcategory || null,
          title: body.title,
          description: body.description,
          pricePerDay: parseFloat(body.price_per_day || body.pricePerDay),
          pricePerMonth: parseFloat(body.price_per_month || body.pricePerMonth),
          deposit: parseFloat(body.deposit),
          address: body.address,
          photos: body.photos || [],
          attributes: body.attributes || {},
          status: 'pending'
        }
      });
      return NextResponse.json({ success: true, item: { _id: item.id, ...item, owner_id: item.ownerId, price_per_day: item.pricePerDay, price_per_month: item.pricePerMonth } });
    }

    // Публикация лота
    if (path.startsWith('/items/') && path.endsWith('/publish')) {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!currentUser) {
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
      }
      const itemId = path.split('/')[2];
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) {
        return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
      }
      if (item.ownerId !== userId && currentUser.role !== 'moderator' && currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      const newStatus = (currentUser.role === 'moderator' || currentUser.role === 'admin') ? 'approved' : 'pending';
      await prisma.item.update({
        where: { id: itemId },
        data: { status: newStatus }
      });
      return NextResponse.json({ success: true });
    }

    // Снятие лота с публикации
    if (path.startsWith('/items/') && path.endsWith('/unpublish')) {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      const currentUser = await prisma.user.findUnique({ where: { id: userId } });
      if (!currentUser) {
        return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
      }
      const itemId = path.split('/')[2];
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) {
        return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
      }
      if (item.ownerId !== userId && currentUser.role !== 'moderator' && currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      await prisma.item.update({
        where: { id: itemId },
        data: { status: 'draft' }
      });
      return NextResponse.json({ success: true });
    }

    // Создание бронирования
    if (path.startsWith('/items/') && path.endsWith('/book')) {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || !user.isVerified) {
        return NextResponse.json({ error: 'Требуется верификация' }, { status: 403 });
      }
      const itemId = path.split('/')[2];
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item) {
        return NextResponse.json({ error: 'Лот не найден' }, { status: 404 });
      }
      const { start_date, end_date, rental_type, is_insured } = body;
      const start = new Date(start_date);
      const end = new Date(end_date);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

      let rentalPrice = 0;
      if (rental_type === 'day') {
        rentalPrice = item.pricePerDay * days;
      } else if (rental_type === 'month') {
        const months = Math.ceil(days / 30);
        rentalPrice = item.pricePerMonth * months;
      }

      const deposit = item.deposit;
      const commission = rentalPrice * 0.15;
      const insurance = is_insured ? rentalPrice * 0.10 : 0;
      const total = rentalPrice + deposit + commission + insurance;
      const prepayment = rentalPrice * 0.30;

      const booking = await prisma.booking.create({
        data: {
          itemId,
          renterId: userId,
          startDate: start,
          endDate: end,
          rentalType: rental_type,
          rentalPrice,
          deposit,
          commission,
          insurance,
          totalPrice: total,
          prepayment,
          isInsured: is_insured || false,
          status: 'paid',
          depositStatus: 'held',
          paymentId: `MOCK_${crypto.randomUUID()}`,
          paidAt: new Date()
        }
      });

      console.log(`💳 Мок-платёж создан для бронирования ${booking.id}`);
      return NextResponse.json({ success: true, booking: { _id: booking.id, ...booking, item_id: booking.itemId, renter_id: booking.renterId } });
    }

    // Добавление фото чек-листа
    if (path.startsWith('/bookings/') && path.endsWith('/checklist')) {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      const bookingId = path.split('/')[2];
      const { photos, type } = body;
      const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
      if (!booking) {
        return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 });
      }
      const updateData = type === 'handover'
        ? { handoverPhotos: photos, handoverConfirmedAt: new Date() }
        : { returnPhotos: photos, returnConfirmedAt: new Date() };
      await prisma.booking.update({
        where: { id: bookingId },
        data: updateData
      });
      return NextResponse.json({ success: true });
    }

    // Подтверждение возврата
    if (path.startsWith('/bookings/') && path.endsWith('/confirm-return')) {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      const bookingId = path.split('/')[2];
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: { item: true }
      });
      if (!booking) {
        return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 });
      }
      if (!booking.item || booking.item.ownerId !== userId) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'completed',
          depositStatus: 'returned',
          completedAt: new Date()
        }
      });
      console.log(`💰 Залог ${booking.deposit} ₽ возвращён арендатору`);
      return NextResponse.json({ success: true });
    }

    // Создание отзыва
    if (path === '/reviews') {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      const { booking_id, item_id, rating, text, photos } = body;
      const booking = await prisma.booking.findUnique({ where: { id: booking_id } });
      if (!booking || booking.status !== 'completed') {
        return NextResponse.json({ error: 'Можно оставить отзыв только после завершения аренды' }, { status: 400 });
      }
      const review = await prisma.review.create({
        data: {
          bookingId: booking_id,
          itemId: item_id,
          userId,
          rating,
          text,
          photos: photos || []
        }
      });

      // Обновляем рейтинг владельца
      const item = await prisma.item.findUnique({ where: { id: item_id } });
      if (item) {
        const allReviews = await prisma.review.findMany({
          where: { itemId: item_id },
          select: { rating: true }
        });
        const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
        await prisma.user.update({
          where: { id: item.ownerId },
          data: { rating: avgRating }
        });
      }
      return NextResponse.json({ success: true, review: { _id: review.id, ...review } });
    }

    // Модерация пользователя
    if (path.startsWith('/admin/users/') && path.endsWith('/verify')) {
      const userId = request.headers.get('x-user-id');
      const user = await prisma.user.findUnique({ where: { id: userId! } });
      if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      const targetUserId = path.split('/')[3];
      const { action, reason } = body;
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          verificationStatus: action === 'approve' ? 'verified' : 'rejected',
          isVerified: action === 'approve',
          verifiedAt: new Date(),
          verifiedBy: userId,
          rejectionReason: reason || null
        }
      });
      return NextResponse.json({ success: true });
    }

    // Модерация лота
    if (path.startsWith('/admin/items/') && path.endsWith('/moderate')) {
      const userId = request.headers.get('x-user-id');
      const user = await prisma.user.findUnique({ where: { id: userId! } });
      if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      const itemId = path.split('/')[3];
      const { action, reason } = body;
      await prisma.item.update({
        where: { id: itemId },
        data: {
          status: action === 'approve' ? 'approved' : 'rejected',
          moderatedAt: new Date(),
          moderatedBy: userId,
          rejectionReason: reason || null
        }
      });
      return NextResponse.json({ success: true });
    }

    // Блокировка пользователя
    if (path.startsWith('/admin/users/') && path.endsWith('/block')) {
      const userId = request.headers.get('x-user-id');
      const user = await prisma.user.findUnique({ where: { id: userId! } });
      if (!user || (user.role !== 'moderator' && user.role !== 'admin')) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      const targetUserId = path.split('/')[3];
      const { reason } = body;
      await prisma.user.update({
        where: { id: targetUserId },
        data: {
          isBlocked: true,
          blockedAt: new Date(),
          blockedBy: userId,
          blockReason: reason
        }
      });
      return NextResponse.json({ success: true });
    }

    // Создание пользователя (админ)
    if (path === '/admin/create-user') {
      const userId = request.headers.get('x-user-id');
      const currentUser = await prisma.user.findUnique({ where: { id: userId! } });
      if (!currentUser || currentUser.role !== 'admin') {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      const { name, phone, email, password, role } = body;
      if (!name || !phone || !email || !password) {
        return NextResponse.json({ error: 'Все поля обязательны' }, { status: 400 });
      }
      const existingUser = await prisma.user.findFirst({
        where: { OR: [{ phone }, { email }] }
      });
      if (existingUser) {
        const field = existingUser.phone === phone ? 'телефоном' : 'email';
        return NextResponse.json({ error: `Пользователь с таким ${field} уже существует` }, { status: 400 });
      }
      const passwordHash = await bcrypt.hash(password, 10);
      const newUser = await prisma.user.create({
        data: {
          name,
          phone,
          email,
          passwordHash,
          role: role || 'renter',
          verificationStatus: 'verified',
          isVerified: true
        }
      });
      const { passwordHash: _, ...safeUser } = newUser;
      return NextResponse.json({ success: true, user: { _id: newUser.id, ...safeUser } });
    }

    return NextResponse.json({ error: 'Маршрут не найден' }, { status: 404 });
  } catch (error) {
    console.error('POST Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
      const updateData: Prisma.UserUpdateInput = {};
      if (name) updateData.name = name;
      if (role) updateData.role = role;
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });
      return NextResponse.json({ success: true });
    }

    // Обновление лота
    if (path.startsWith('/items/')) {
      const userId = request.headers.get('x-user-id');
      if (!userId) {
        return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
      }
      const itemId = path.split('/')[2];
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item || item.ownerId !== userId) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }

      const updateData: Prisma.ItemUpdateInput = {};
      if (body.title) updateData.title = body.title;
      if (body.description) updateData.description = body.description;
      if (body.price_per_day !== undefined) updateData.pricePerDay = parseFloat(body.price_per_day);
      if (body.pricePerDay !== undefined) updateData.pricePerDay = parseFloat(body.pricePerDay);
      if (body.price_per_month !== undefined) updateData.pricePerMonth = parseFloat(body.price_per_month);
      if (body.pricePerMonth !== undefined) updateData.pricePerMonth = parseFloat(body.pricePerMonth);
      if (body.deposit !== undefined) updateData.deposit = parseFloat(body.deposit);
      if (body.address) updateData.address = body.address;
      if (body.photos) updateData.photos = body.photos;
      if (body.category) updateData.category = body.category;
      if (body.subcategory !== undefined) updateData.subcategory = body.subcategory;
      if (body.attributes) updateData.attributes = body.attributes;

      await prisma.item.update({
        where: { id: itemId },
        data: updateData
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Маршрут не найден' }, { status: 404 });
  } catch (error) {
    console.error('PATCH Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
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
      const item = await prisma.item.findUnique({ where: { id: itemId } });
      if (!item || item.ownerId !== userId) {
        return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
      }
      await prisma.item.delete({ where: { id: itemId } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Маршрут не найден' }, { status: 404 });
  } catch (error) {
    console.error('DELETE Error:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
