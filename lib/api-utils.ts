import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';

// Generate 6-digit SMS code
export function generateSMSCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Encrypt document data
export function encryptDocument(data: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(
    process.env.ENCRYPTION_KEY || 'default-secret-key-change-me',
    crypto.randomBytes(16).toString('hex'), // Random salt per encryption
    32
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, new Uint8Array(key), new Uint8Array(iv));
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// Standard error response
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

// Standard success response
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

// Get user ID from request headers
export function getUserId(request: Request): string | null {
  return request.headers.get('x-user-id');
}

// Require authentication
export async function requireAuth(request: Request) {
  const userId = getUserId(request);
  if (!userId) {
    return { error: errorResponse('Не авторизован', 401) };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: errorResponse('Пользователь не найден', 404) };
  }

  return { user, userId };
}

// Require admin/moderator role
export async function requireAdmin(request: Request) {
  const result = await requireAuth(request);
  if ('error' in result) return result;

  if (result.user.role !== 'admin' && result.user.role !== 'moderator') {
    return { error: errorResponse('Доступ запрещён', 403) };
  }

  return result;
}

// Require admin only (not moderator)
export async function requireAdminOnly(request: Request) {
  const result = await requireAuth(request);
  if ('error' in result) return result;

  if (result.user.role !== 'admin') {
    return { error: errorResponse('Доступ запрещён', 403) };
  }

  return result;
}

// Require verified user
export async function requireVerified(request: Request) {
  const result = await requireAuth(request);
  if ('error' in result) return result;

  if (!result.user.isVerified) {
    return { error: errorResponse('Требуется верификация', 403) };
  }

  return result;
}

// Transform user for response (remove sensitive data)
export function safeUser(user: any) {
  const { passwordHash, encryptedDocument, ...safe } = user;
  return {
    _id: user.id,
    ...safe,
    verification_status: user.verificationStatus,
    is_verified: user.isVerified,
  };
}

// Transform item for response
export function transformItem(item: any) {
  return {
    _id: item.id,
    ...item,
    owner_id: item.ownerId,
    owner_name: item.owner?.name,
    owner_rating: item.owner?.rating,
    owner_phone: item.owner?.phone,
    price_per_day: item.pricePerDay,
    price_per_month: item.pricePerMonth,
  };
}

// Transform booking for response
export function transformBooking(booking: any) {
  return {
    _id: booking.id,
    ...booking,
    item_id: booking.itemId,
    renter_id: booking.renterId,
    start_date: booking.startDate,
    end_date: booking.endDate,
    rental_type: booking.rentalType,
    rental_price: booking.rentalPrice,
    total_price: booking.totalPrice,
    is_insured: booking.isInsured,
    deposit_status: booking.depositStatus,
    payment_id: booking.paymentId,
    handover_photos: booking.handoverPhotos,
    return_photos: booking.returnPhotos,
    item: booking.item ? transformItem(booking.item) : null,
    renter: booking.renter,
    review: booking.review ? { _id: booking.review.id, ...booking.review } : null,
  };
}
