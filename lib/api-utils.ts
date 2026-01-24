import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';
import type { User, Item, Booking, Review } from '@prisma/client';
import type { User as ClientUser, Item as ClientItem, Booking as ClientBooking } from '@/types';

// ==================== UTILITY FUNCTIONS ====================

/** Generate 6-digit SMS code */
export function generateSMSCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/** Encrypt document data with AES-256-CBC */
export function encryptDocument(data: string): string {
  const algorithm = 'aes-256-cbc';
  const key = crypto.scryptSync(
    process.env.ENCRYPTION_KEY || 'default-secret-key-change-me',
    crypto.randomBytes(16).toString('hex'),
    32
  );
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, new Uint8Array(key), new Uint8Array(iv));
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

// ==================== RESPONSE HELPERS ====================

/** Standard error response */
export function errorResponse(message: string, status: number = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Standard success response */
export function successResponse<T>(data: T, status: number = 200) {
  return NextResponse.json(data, { status });
}

// ==================== AUTH HELPERS ====================

/** Get user ID from JWT token or fallback to x-user-id header */
export async function getUserIdFromToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    // Fallback to x-user-id for backward compatibility during migration
    return request.headers.get('x-user-id');
  }

  const payload = await verifyToken(token);
  return payload?.userId || null;
}

interface AuthResult {
  user: User;
  userId: string;
}

interface AuthError {
  error: NextResponse;
}

/** Require authentication via JWT */
export async function requireAuth(request: Request): Promise<AuthResult | AuthError> {
  const userId = await getUserIdFromToken(request);
  if (!userId) {
    return { error: errorResponse('Не авторизован', 401) };
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { error: errorResponse('Пользователь не найден', 404) };
  }

  if (user.isBlocked) {
    return { error: errorResponse('Аккаунт заблокирован', 403) };
  }

  return { user, userId };
}

/** Require admin/moderator role */
export async function requireAdmin(request: Request): Promise<AuthResult | AuthError> {
  const result = await requireAuth(request);
  if ('error' in result) return result;

  if (result.user.role !== 'admin' && result.user.role !== 'moderator') {
    return { error: errorResponse('Доступ запрещён', 403) };
  }

  return result;
}

/** Require admin only (not moderator) */
export async function requireAdminOnly(request: Request): Promise<AuthResult | AuthError> {
  const result = await requireAuth(request);
  if ('error' in result) return result;

  if (result.user.role !== 'admin') {
    return { error: errorResponse('Доступ запрещён', 403) };
  }

  return result;
}

/** Require verified user */
export async function requireVerified(request: Request): Promise<AuthResult | AuthError> {
  const result = await requireAuth(request);
  if ('error' in result) return result;

  if (!result.user.isVerified) {
    return { error: errorResponse('Требуется верификация', 403) };
  }

  return result;
}

// ==================== TRANSFORM FUNCTIONS ====================
// These functions convert Prisma models to client-friendly format
// with both camelCase (preferred) and snake_case (legacy) properties

// Partial owner type for includes with select
interface PartialOwner {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  rating?: number;
  createdAt?: Date;
}

/** Transform user for response (remove sensitive data) */
export function safeUser(user: User): ClientUser {
  return {
    _id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    rating: user.rating,
    photo: user.photo ?? undefined,
    createdAt: user.createdAt,
    // camelCase (preferred)
    isVerified: user.isVerified,
    verificationStatus: user.verificationStatus,
    isBlocked: user.isBlocked,
    // snake_case (legacy, deprecated)
    is_verified: user.isVerified,
    verification_status: user.verificationStatus,
  };
}

interface ItemWithOwner extends Item {
  owner?: PartialOwner | null;
}

/** Transform item for response */
export function transformItem(item: ItemWithOwner): ClientItem {
  return {
    _id: item.id,
    category: item.category,
    subcategory: item.subcategory ?? undefined,
    title: item.title,
    description: item.description,
    deposit: item.deposit,
    address: item.address,
    photos: item.photos,
    attributes: item.attributes as Record<string, string | number | boolean> | undefined,
    status: item.status,
    rating: item.rating ?? undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    // camelCase (preferred)
    ownerId: item.ownerId,
    ownerName: item.owner?.name,
    ownerRating: item.owner?.rating,
    ownerPhone: item.owner?.phone,
    pricePerDay: item.pricePerDay,
    pricePerMonth: item.pricePerMonth,
    // snake_case (legacy, deprecated)
    owner_id: item.ownerId,
    owner_name: item.owner?.name,
    owner_rating: item.owner?.rating,
    owner_phone: item.owner?.phone,
    price_per_day: item.pricePerDay,
    price_per_month: item.pricePerMonth,
  };
}

// Partial renter type for includes with select
interface PartialRenter {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
}

interface BookingWithRelations extends Booking {
  item?: ItemWithOwner | null;
  renter?: PartialRenter | null;
  review?: Review | null;
}

/** Transform booking for response */
export function transformBooking(booking: BookingWithRelations): ClientBooking {
  return {
    _id: booking.id,
    deposit: booking.deposit,
    commission: booking.commission,
    insurance: booking.insurance,
    prepayment: booking.prepayment,
    status: booking.status,
    createdAt: booking.createdAt,
    paidAt: booking.paidAt ?? undefined,
    // camelCase (preferred)
    itemId: booking.itemId,
    renterId: booking.renterId,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    rentalType: booking.rentalType,
    rentalPrice: booking.rentalPrice,
    totalPrice: booking.totalPrice,
    isInsured: booking.isInsured,
    depositStatus: booking.depositStatus ?? undefined,
    handoverPhotos: booking.handoverPhotos,
    returnPhotos: booking.returnPhotos,
    item: booking.item ? transformItem(booking.item) : undefined,
    renter: booking.renter ? {
      _id: booking.renter.id,
      name: booking.renter.name,
      email: booking.renter.email ?? null,
      phone: booking.renter.phone,
    } as ClientUser : undefined,
    review: booking.review ? {
      _id: booking.review.id,
      bookingId: booking.review.bookingId,
      itemId: booking.review.itemId,
      userId: booking.review.userId,
      rating: booking.review.rating,
      text: booking.review.text,
      photos: booking.review.photos,
      createdAt: booking.review.createdAt,
    } : undefined,
    // snake_case (legacy, deprecated)
    item_id: booking.itemId,
    renter_id: booking.renterId,
    start_date: booking.startDate.toISOString(),
    end_date: booking.endDate.toISOString(),
    rental_type: booking.rentalType,
    rental_price: booking.rentalPrice,
    total_price: booking.totalPrice,
    is_insured: booking.isInsured,
    deposit_status: booking.depositStatus ?? undefined,
    handover_photos: booking.handoverPhotos,
    return_photos: booking.returnPhotos,
  };
}
