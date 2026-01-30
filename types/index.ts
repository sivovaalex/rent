import type {
  User as PrismaUser,
  Item as PrismaItem,
  Booking as PrismaBooking,
  Review as PrismaReview,
  ReviewReply as PrismaReviewReply,
  UserRole as PrismaUserRole,
  VerificationStatus as PrismaVerificationStatus,
  ItemStatus as PrismaItemStatus,
  BookingStatus as PrismaBookingStatus,
  Category as PrismaCategory,
  RentalType as PrismaRentalType,
} from '@prisma/client';

// Re-export Prisma enums for type safety
export type UserRole = PrismaUserRole;
export type VerificationStatus = PrismaVerificationStatus;
export type ItemStatus = PrismaItemStatus;
export type BookingStatus = PrismaBookingStatus;
export type Category = PrismaCategory;
export type RentalType = PrismaRentalType;

// ==================== CLIENT TYPES ====================
// These types are used on the client side with camelCase naming
// and _id for backward compatibility with existing components

/**
 * User type for client-side usage
 * Uses _id for compatibility with existing components
 */
export interface User {
  _id: string;
  name: string;
  email: string | null;
  phone: string;
  role: UserRole;
  rating: number;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  isBlocked?: boolean;
  photo?: string;
  createdAt: Date | string;
  // Trust metrics
  trustScore?: number;
  completedDeals?: number;
  cancelledDeals?: number;
  confirmationRate?: number;
  avgResponseMinutes?: number | null;
  trustBadges?: string[];
  // Legacy snake_case aliases (deprecated, use camelCase)
  is_verified?: boolean;
  verification_status?: VerificationStatus;
}

/**
 * Item type for client-side usage
 */
export interface Item {
  _id: string;
  ownerId: string;
  ownerName?: string;
  ownerRating?: number;
  ownerPhone?: string;
  ownerTrustBadges?: string[];
  ownerTrustScore?: number;
  category: Category;
  subcategory?: string;
  title: string;
  description: string;
  pricePerDay: number;
  pricePerMonth: number;
  deposit: number;
  address: string;
  latitude?: number;
  longitude?: number;
  photos: string[];
  attributes?: Record<string, string | number | boolean>;
  status: ItemStatus;
  rating?: number;
  reviews?: Review[];
  createdAt: Date | string;
  updatedAt?: Date | string;
  // Legacy snake_case aliases (deprecated)
  owner_id?: string;
  owner_name?: string;
  owner_rating?: number;
  owner_phone?: string;
  price_per_day?: number;
  price_per_month?: number;
}

/**
 * Booking type for client-side usage
 */
export interface Booking {
  _id: string;
  itemId: string;
  item?: Item;
  renterId: string;
  renter?: User;
  startDate: string | Date;
  endDate: string | Date;
  rentalType: RentalType;
  rentalPrice: number;
  deposit: number;
  commission: number;
  insurance: number;
  totalPrice: number;
  prepayment: number;
  isInsured: boolean;
  status: BookingStatus;
  depositStatus?: string;
  handoverPhotos?: string[];
  returnPhotos?: string[];
  review?: Review;
  paidAt?: Date | string;
  createdAt: Date | string;
  // Legacy snake_case aliases (deprecated)
  item_id?: string;
  renter_id?: string;
  start_date?: string;
  end_date?: string;
  rental_type?: RentalType;
  rental_price?: number;
  total_price?: number;
  is_insured?: boolean;
  deposit_status?: string;
  handover_photos?: string[];
  return_photos?: string[];
}

/**
 * BookingForm for creating new bookings
 */
export interface BookingForm {
  start_date: string;
  end_date: string;
  rental_type: RentalType;
  is_insured: boolean;
}

/**
 * Review type for client-side usage
 */
export interface Review {
  _id: string;
  bookingId: string;
  itemId: string;
  userId: string;
  userName?: string;
  userPhoto?: string;
  rating: number;
  text: string;
  photos?: string[];
  reply?: ReviewReply;
  createdAt: Date | string;
  // Legacy snake_case aliases (deprecated)
  item_id?: string;
  user_id?: string;
  user_name?: string;
  user_photo?: string;
}

/**
 * ReviewReply type for client-side usage
 */
export interface ReviewReply {
  _id: string;
  reviewId: string;
  ownerId: string;
  text: string;
  createdAt: Date | string;
  // Legacy snake_case aliases (deprecated)
  review_id?: string;
  owner_id?: string;
}

// ==================== CHAT TYPES ====================

export interface ChatMessage {
  _id: string;
  bookingId: string;
  senderId: string;
  senderName?: string;
  text: string;
  isRead: boolean;
  createdAt: Date | string;
}

export interface ChatConversation {
  bookingId: string;
  itemTitle: string;
  itemPhoto?: string;
  otherUser: {
    _id: string;
    name: string;
    photo?: string;
  };
  lastMessage?: {
    text: string;
    createdAt: Date | string;
    senderId: string;
  };
  unreadCount: number;
}

// ==================== UI TYPES ====================

export type AlertType = 'success' | 'error';

export interface AlertState {
  message: string;
  type: AlertType;
}

// ==================== ADMIN TYPES ====================

export interface AdminStats {
  totalUsers: number;
  totalItems: number;
  totalBookings: number;
  pendingVerifications: number;
  pendingItems: number;
  totalRevenue: number;
}

// ==================== API TYPES ====================

export interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  data?: T;
}

export interface ItemsResponse {
  items: Item[];
  total?: number;
  page?: number;
  limit?: number;
}

export interface BookingsResponse {
  bookings: Booking[];
}

export interface UsersResponse {
  users: User[];
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

// ==================== FORM TYPES ====================

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
}

export interface LoginData {
  email: string;
  password: string;
}

// ==================== PRISMA HELPERS ====================

/**
 * Type for Prisma User with relations
 */
export type UserWithRelations = PrismaUser & {
  items?: PrismaItem[];
  bookingsAsRenter?: PrismaBooking[];
  reviews?: PrismaReview[];
};

/**
 * Type for Prisma Item with relations
 */
export type ItemWithRelations = PrismaItem & {
  owner?: PrismaUser;
  bookings?: PrismaBooking[];
  reviews?: PrismaReview[];
};

/**
 * Type for Prisma Booking with relations
 */
export type BookingWithRelations = PrismaBooking & {
  item?: ItemWithRelations;
  renter?: PrismaUser;
  review?: PrismaReview;
};

/**
 * Type for Prisma Review with relations
 */
export type ReviewWithRelations = PrismaReview & {
  booking?: PrismaBooking;
  item?: PrismaItem;
  user?: PrismaUser;
  reply?: PrismaReviewReply;
};
