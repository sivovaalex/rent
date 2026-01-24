import type { User, Item, Booking, Review } from '@/types';

// ==================== USER FACTORY ====================

let userCounter = 0;

export function createTestUser(overrides: Partial<User> = {}): User {
  userCounter++;
  return {
    _id: `user-${userCounter}`,
    name: `Test User ${userCounter}`,
    email: `test${userCounter}@example.com`,
    phone: `+7900000000${userCounter}`,
    role: 'renter',
    rating: 5.0,
    isVerified: false,
    verificationStatus: 'not_verified',
    isBlocked: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createTestOwner(overrides: Partial<User> = {}): User {
  return createTestUser({
    role: 'owner',
    isVerified: true,
    verificationStatus: 'verified',
    ...overrides,
  });
}

export function createTestAdmin(overrides: Partial<User> = {}): User {
  return createTestUser({
    role: 'admin',
    isVerified: true,
    verificationStatus: 'verified',
    ...overrides,
  });
}

// ==================== ITEM FACTORY ====================

let itemCounter = 0;

export function createTestItem(overrides: Partial<Item> = {}): Item {
  itemCounter++;
  return {
    _id: `item-${itemCounter}`,
    ownerId: `owner-${itemCounter}`,
    ownerName: `Owner ${itemCounter}`,
    ownerRating: 5.0,
    ownerPhone: `+7900000000${itemCounter}`,
    category: 'electronics',
    title: `Test Item ${itemCounter}`,
    description: `Description for test item ${itemCounter}`,
    pricePerDay: 1000,
    pricePerMonth: 20000,
    deposit: 5000,
    address: 'Moscow, Russia',
    photos: [`https://example.com/photo${itemCounter}.jpg`],
    status: 'approved',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ==================== BOOKING FACTORY ====================

let bookingCounter = 0;

export function createTestBooking(overrides: Partial<Booking> = {}): Booking {
  bookingCounter++;
  const startDate = new Date();
  const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    _id: `booking-${bookingCounter}`,
    itemId: `item-${bookingCounter}`,
    renterId: `renter-${bookingCounter}`,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    rentalType: 'day',
    rentalPrice: 7000, // 7 days * 1000
    deposit: 5000,
    commission: 700,
    insurance: 0,
    totalPrice: 12700,
    prepayment: 6350,
    isInsured: false,
    status: 'pending_payment',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

export function createActiveBooking(overrides: Partial<Booking> = {}): Booking {
  return createTestBooking({
    status: 'active',
    paidAt: new Date().toISOString(),
    ...overrides,
  });
}

export function createCompletedBooking(overrides: Partial<Booking> = {}): Booking {
  const pastStart = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
  const pastEnd = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  return createTestBooking({
    status: 'completed',
    startDate: pastStart.toISOString(),
    endDate: pastEnd.toISOString(),
    paidAt: pastStart.toISOString(),
    ...overrides,
  });
}

// ==================== REVIEW FACTORY ====================

let reviewCounter = 0;

export function createTestReview(overrides: Partial<Review> = {}): Review {
  reviewCounter++;
  return {
    _id: `review-${reviewCounter}`,
    bookingId: `booking-${reviewCounter}`,
    itemId: `item-${reviewCounter}`,
    userId: `user-${reviewCounter}`,
    userName: `User ${reviewCounter}`,
    rating: 5,
    text: `Great experience with item ${reviewCounter}!`,
    photos: [],
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ==================== RESET COUNTERS ====================

export function resetFactoryCounters() {
  userCounter = 0;
  itemCounter = 0;
  bookingCounter = 0;
  reviewCounter = 0;
}
