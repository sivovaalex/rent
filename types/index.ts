// Типы пользователя
export type UserRole = 'renter' | 'owner' | 'moderator' | 'admin';
export type VerificationStatus = 'not_verified' | 'pending' | 'verified';

export interface User {
  _id: string;
  name: string;
  email: string | null;
  phone: string;
  role: UserRole;
  rating: number;
  is_verified: boolean;
  verification_status: VerificationStatus;
  createdAt: Date;
  photo?: string;
}

// Типы категорий
export type Category = 'electronics' | 'clothes' | 'stream' | 'tools' | 'sports' | 'other';

// Типы статуса лота
export type ItemStatus = 'draft' | 'pending' | 'approved' | 'rejected';

// Типы лота
export interface Item {
  _id: string;
  owner_id: string;
  owner_name?: string;
  owner_rating?: number;
  owner_phone?: string;
  owner_createdAt?: Date;
  category: Category;
  subcategory?: string;
  title: string;
  description: string;
  price_per_day: number;
  price_per_month: number;
  deposit: number;
  address: string;
  photos: string[];
  attributes?: Record<string, string | number | boolean>;
  status: ItemStatus;
  rating?: number;
  reviews?: Review[];
  createdAt: Date;
  updatedAt?: Date;
}

// Типы бронирования
export type BookingStatus = 'pending' | 'paid' | 'confirmed' | 'active' | 'completed' | 'cancelled';
export type RentalType = 'day' | 'month';

export interface Booking {
  _id: string;
  item_id: string;
  item?: Item;
  renter_id: string;
  renter?: User;
  owner_id: string;
  start_date: string;
  end_date: string;
  rental_type: RentalType;
  is_insured: boolean;
  total_price: number;
  deposit: number;
  status: BookingStatus;
  createdAt: Date;
}

export interface BookingForm {
  start_date: string;
  end_date: string;
  rental_type: RentalType;
  is_insured: boolean;
}

// Типы отзывов
export interface Review {
  _id: string;
  item_id: string;
  user_id: string;
  user_name?: string;
  user_photo?: string;
  rating: number;
  text: string;
  reply?: ReviewReply;
  createdAt: Date;
}

export interface ReviewReply {
  _id: string;
  review_id: string;
  owner_id: string;
  text: string;
  createdAt: Date;
}

// Типы для алертов
export type AlertType = 'success' | 'error';

export interface AlertState {
  message: string;
  type: AlertType;
}

// Типы для статистики админки
export interface AdminStats {
  totalUsers: number;
  totalItems: number;
  totalBookings: number;
  pendingUsers: number;
  pendingItems: number;
  revenue: number;
}

// Типы для API ответов
export interface ApiResponse<T = unknown> {
  success?: boolean;
  error?: string;
  [key: string]: T | boolean | string | undefined;
}

export interface ItemsResponse extends ApiResponse {
  items: Item[];
}

export interface BookingsResponse extends ApiResponse {
  bookings: Booking[];
}

export interface UsersResponse extends ApiResponse {
  users: User[];
}

// Типы для регистрации
export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: UserRole;
}
