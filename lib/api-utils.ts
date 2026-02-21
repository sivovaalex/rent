import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { verifyToken, extractTokenFromHeader } from '@/lib/jwt';
import type { User, Item, Booking, Review } from '@prisma/client';
import type { User as ClientUser, Item as ClientItem, Booking as ClientBooking } from '@/types';

// ==================== UTILITY FUNCTIONS ====================

/** Generate 6-digit SMS code */
export function generateSMSCode(): string {
  return crypto.randomInt(100000, 1000000).toString();
}

/** Encrypt document data with AES-256-CBC */
export function encryptDocument(data: string): string {
  const algorithm = 'aes-256-cbc';
  if (!process.env.ENCRYPTION_KEY) {
    throw new Error('ENCRYPTION_KEY environment variable is required');
  }
  const key = crypto.scryptSync(
    process.env.ENCRYPTION_KEY,
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

/** Get user ID from JWT token */
export async function getUserIdFromToken(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);

  if (!token) {
    return null;
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
  trustBadges?: string[];
  trustScore?: number;
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
    // Email verification
    emailVerified: user.emailVerified,
    emailVerifiedAt: user.emailVerifiedAt,
    // Trust metrics
    trustScore: user.trustScore,
    completedDeals: user.completedDeals,
    cancelledDeals: user.cancelledDeals,
    confirmationRate: user.confirmationRate,
    avgResponseMinutes: user.avgResponseMinutes,
    trustBadges: user.trustBadges,
    // Approval settings
    defaultApprovalMode: user.defaultApprovalMode,
    defaultApprovalThreshold: user.defaultApprovalThreshold,
    // Verification document
    verificationSubmittedAt: user.verificationSubmittedAt,
    documentType: user.documentType,
    documentPath: user.documentPath,
    // Owner type
    ownerType: user.ownerType,
    companyName: user.companyName,
    // Verification rejection reason
    rejectionReason: user.rejectionReason ?? undefined,
    // snake_case (legacy, deprecated)
    is_verified: user.isVerified,
    verification_status: user.verificationStatus,
    verification_submitted_at: user.verificationSubmittedAt,
    document_type: user.documentType,
    document_path: user.documentPath,
    owner_type: user.ownerType,
    company_name: user.companyName,
  };
}

/** Convert Prisma Decimal to plain number */
function toNumber(val: unknown): number {
  if (val == null) return 0;
  return Number(val);
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
    deposit: toNumber(item.deposit),
    address: item.address,
    latitude: item.latitude ?? undefined,
    longitude: item.longitude ?? undefined,
    photos: item.photos,
    attributes: item.attributes as Record<string, string | number | boolean> | undefined,
    status: item.status,
    rejectionReason: item.rejectionReason ?? undefined,
    rating: item.rating ?? undefined,
    approvalMode: item.approvalMode ?? undefined,
    approvalThreshold: item.approvalThreshold ?? undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    // camelCase (preferred)
    ownerId: item.ownerId,
    ownerName: item.owner?.name,
    ownerRating: item.owner?.rating,
    ownerPhone: item.owner?.phone,
    ownerTrustBadges: item.owner?.trustBadges,
    ownerTrustScore: item.owner?.trustScore,
    pricePerDay: toNumber(item.pricePerDay),
    pricePerMonth: toNumber(item.pricePerMonth),
    // snake_case (legacy, deprecated)
    owner_id: item.ownerId,
    owner_name: item.owner?.name,
    owner_rating: item.owner?.rating,
    owner_phone: item.owner?.phone,
    price_per_day: toNumber(item.pricePerDay),
    price_per_month: toNumber(item.pricePerMonth),
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
  reviews?: Review[] | null;
  review?: Review | null;
}

function transformReview(r: Review) {
  return {
    _id: r.id,
    bookingId: r.bookingId,
    itemId: r.itemId,
    userId: r.userId,
    rating: r.rating,
    text: r.text,
    photos: r.photos,
    type: r.type,
    createdAt: r.createdAt,
  };
}

/** Transform booking for response */
export function transformBooking(booking: BookingWithRelations): ClientBooking {
  // Find renter_review for backward compatibility
  const renterReview = booking.reviews?.find(r => r.type === 'renter_review')
    ?? booking.review;

  return {
    _id: booking.id,
    deposit: toNumber(booking.deposit),
    commission: toNumber(booking.commission),
    insurance: toNumber(booking.insurance),
    prepayment: toNumber(booking.prepayment),
    status: booking.status,
    createdAt: booking.createdAt,
    paidAt: booking.paidAt ?? undefined,
    // camelCase (preferred)
    itemId: booking.itemId,
    renterId: booking.renterId,
    startDate: booking.startDate.toISOString(),
    endDate: booking.endDate.toISOString(),
    rentalType: booking.rentalType,
    rentalPrice: toNumber(booking.rentalPrice),
    totalPrice: toNumber(booking.totalPrice),
    isInsured: booking.isInsured,
    depositStatus: booking.depositStatus ?? undefined,
    handoverPhotos: booking.handoverPhotos,
    returnPhotos: booking.returnPhotos,
    // YooKassa / handover
    yookassaPaymentId: booking.yookassaPaymentId ?? undefined,
    depositConfirmedByRenter: booking.depositConfirmedByRenter,
    depositConfirmedByOwner: booking.depositConfirmedByOwner,
    remainderConfirmedByRenter: booking.remainderConfirmedByRenter,
    remainderConfirmedByOwner: booking.remainderConfirmedByOwner,
    handoverConfirmedAt: booking.handoverConfirmedAt?.toISOString(),
    item: booking.item ? transformItem(booking.item) : undefined,
    renter: booking.renter ? {
      _id: booking.renter.id,
      name: booking.renter.name,
      email: booking.renter.email ?? null,
      phone: booking.renter.phone,
    } as ClientUser : undefined,
    // Reviews (new: array)
    reviews: booking.reviews?.map(transformReview),
    // Backward compat: single renter review
    review: renterReview ? transformReview(renterReview) : undefined,
    // Approval fields
    approvalDeadline: booking.approvalDeadline?.toISOString(),
    rejectionReason: booking.rejectionReason ?? undefined,
    approvedAt: booking.approvedAt?.toISOString(),
    rejectedAt: booking.rejectedAt?.toISOString(),
    // snake_case (legacy, deprecated)
    item_id: booking.itemId,
    renter_id: booking.renterId,
    start_date: booking.startDate.toISOString(),
    end_date: booking.endDate.toISOString(),
    rental_type: booking.rentalType,
    rental_price: toNumber(booking.rentalPrice),
    total_price: toNumber(booking.totalPrice),
    is_insured: booking.isInsured,
    deposit_status: booking.depositStatus ?? undefined,
    handover_photos: booking.handoverPhotos,
    return_photos: booking.returnPhotos,
  };
}
