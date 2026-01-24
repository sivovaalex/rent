import { describe, it, expect } from 'vitest';
import {
  phoneSchema,
  smsCodeSchema,
  sendSmsSchema,
  verifySmsSchema,
  loginSchema,
  registerSchema,
} from '@/lib/validations/auth';
import {
  createBookingSchema,
  checklistSchema,
} from '@/lib/validations/bookings';
import {
  createItemSchema,
  categorySchema,
} from '@/lib/validations/items';
import {
  createReviewSchema,
} from '@/lib/validations/reviews';

describe('Validation Schemas', () => {
  describe('Auth Validations', () => {
    describe('phoneSchema', () => {
      it('should accept valid Russian phone numbers', () => {
        expect(phoneSchema.safeParse('+79001234567').success).toBe(true);
        expect(phoneSchema.safeParse('+79991234567').success).toBe(true);
        expect(phoneSchema.safeParse('+79000000000').success).toBe(true);
      });

      it('should reject invalid phone numbers', () => {
        expect(phoneSchema.safeParse('79001234567').success).toBe(false); // Missing +
        expect(phoneSchema.safeParse('+7900123456').success).toBe(false); // Too short
        expect(phoneSchema.safeParse('+790012345678').success).toBe(false); // Too long
        expect(phoneSchema.safeParse('+89001234567').success).toBe(false); // Wrong country code
        expect(phoneSchema.safeParse('+7900abc4567').success).toBe(false); // Contains letters
        expect(phoneSchema.safeParse('').success).toBe(false); // Empty
      });
    });

    describe('smsCodeSchema', () => {
      it('should accept valid 6-digit codes', () => {
        expect(smsCodeSchema.safeParse('123456').success).toBe(true);
        expect(smsCodeSchema.safeParse('000000').success).toBe(true);
        expect(smsCodeSchema.safeParse('999999').success).toBe(true);
      });

      it('should reject invalid codes', () => {
        expect(smsCodeSchema.safeParse('12345').success).toBe(false); // Too short
        expect(smsCodeSchema.safeParse('1234567').success).toBe(false); // Too long
        expect(smsCodeSchema.safeParse('12345a').success).toBe(false); // Contains letter
        expect(smsCodeSchema.safeParse('').success).toBe(false); // Empty
      });
    });

    describe('sendSmsSchema', () => {
      it('should accept valid phone', () => {
        const result = sendSmsSchema.safeParse({ phone: '+79001234567' });
        expect(result.success).toBe(true);
      });

      it('should reject missing phone', () => {
        const result = sendSmsSchema.safeParse({});
        expect(result.success).toBe(false);
      });
    });

    describe('verifySmsSchema', () => {
      it('should accept valid phone and code', () => {
        const result = verifySmsSchema.safeParse({
          phone: '+79001234567',
          code: '123456',
        });
        expect(result.success).toBe(true);
      });

      it('should accept optional name', () => {
        const result = verifySmsSchema.safeParse({
          phone: '+79001234567',
          code: '123456',
          name: 'Test User',
        });
        expect(result.success).toBe(true);
      });

      it('should reject short name', () => {
        const result = verifySmsSchema.safeParse({
          phone: '+79001234567',
          code: '123456',
          name: 'A', // Too short
        });
        expect(result.success).toBe(false);
      });
    });

    describe('loginSchema', () => {
      it('should accept valid credentials', () => {
        const result = loginSchema.safeParse({
          email: 'test@example.com',
          password: 'password123',
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid email', () => {
        const result = loginSchema.safeParse({
          email: 'not-an-email',
          password: 'password123',
        });
        expect(result.success).toBe(false);
      });

      it('should reject short password', () => {
        const result = loginSchema.safeParse({
          email: 'test@example.com',
          password: '123', // Too short
        });
        expect(result.success).toBe(false);
      });
    });

    describe('registerSchema', () => {
      it('should accept valid registration data', () => {
        const result = registerSchema.safeParse({
          name: 'Test User',
          email: 'test@example.com',
          phone: '+79001234567',
          password: 'password123',
          role: 'renter',
        });
        expect(result.success).toBe(true);
      });

      it('should default role to renter', () => {
        const result = registerSchema.safeParse({
          name: 'Test User',
          email: 'test@example.com',
          phone: '+79001234567',
          password: 'password123',
        });
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.role).toBe('renter');
        }
      });

      it('should reject invalid role', () => {
        const result = registerSchema.safeParse({
          name: 'Test User',
          email: 'test@example.com',
          phone: '+79001234567',
          password: 'password123',
          role: 'admin', // Invalid for registration
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Booking Validations', () => {
    describe('createBookingSchema', () => {
      it('should accept valid booking data', () => {
        const result = createBookingSchema.safeParse({
          start_date: '2024-02-01',
          end_date: '2024-02-08',
          rental_type: 'day',
          is_insured: true,
        });
        expect(result.success).toBe(true);
      });

      it('should accept monthly rental', () => {
        const result = createBookingSchema.safeParse({
          start_date: '2024-02-01',
          end_date: '2024-03-01',
          rental_type: 'month',
          is_insured: false,
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid rental type', () => {
        const result = createBookingSchema.safeParse({
          start_date: '2024-02-01',
          end_date: '2024-02-08',
          rental_type: 'week', // Invalid
          is_insured: false,
        });
        expect(result.success).toBe(false);
      });

      it('should reject missing required fields', () => {
        const result = createBookingSchema.safeParse({
          start_date: '2024-02-01',
          // Missing end_date, rental_type, is_insured
        });
        expect(result.success).toBe(false);
      });
    });

    describe('checklistSchema', () => {
      it('should accept valid checklist data', () => {
        const result = checklistSchema.safeParse({
          type: 'handover',
          photos: ['photo1.jpg', 'photo2.jpg'],
        });
        expect(result.success).toBe(true);
      });

      it('should accept return checklist', () => {
        const result = checklistSchema.safeParse({
          type: 'return',
          photos: ['return-photo.jpg'],
        });
        expect(result.success).toBe(true);
      });

      it('should reject invalid type', () => {
        const result = checklistSchema.safeParse({
          type: 'inspection', // Invalid
          photos: [],
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Item Validations', () => {
    describe('categorySchema', () => {
      it('should accept valid categories', () => {
        const validCategories = ['stream', 'electronics', 'clothes', 'sports', 'tools', 'other'];
        validCategories.forEach((category) => {
          expect(categorySchema.safeParse(category).success).toBe(true);
        });
      });

      it('should reject invalid categories', () => {
        expect(categorySchema.safeParse('furniture').success).toBe(false);
        expect(categorySchema.safeParse('').success).toBe(false);
        expect(categorySchema.safeParse(123).success).toBe(false);
      });
    });

    describe('createItemSchema', () => {
      it('should accept valid item data', () => {
        const result = createItemSchema.safeParse({
          category: 'electronics',
          title: 'Canon EOS Camera',
          description: 'Professional camera for rent',
          price_per_day: 1000,
          price_per_month: 20000,
          deposit: 5000,
          address: 'Moscow, Russia',
          photos: ['photo1.jpg'],
        });
        expect(result.success).toBe(true);
      });

      it('should accept optional subcategory and attributes', () => {
        const result = createItemSchema.safeParse({
          category: 'electronics',
          subcategory: 'cameras',
          title: 'Canon EOS Camera',
          description: 'Professional camera for rent',
          price_per_day: 1000,
          price_per_month: 20000,
          deposit: 5000,
          address: 'Moscow, Russia',
          photos: ['photo1.jpg'],
          attributes: { brand: 'Canon', model: 'EOS R5' },
        });
        expect(result.success).toBe(true);
      });

      it('should reject negative prices', () => {
        const result = createItemSchema.safeParse({
          category: 'electronics',
          title: 'Camera',
          description: 'Test',
          price_per_day: -100, // Negative
          price_per_month: 20000,
          deposit: 5000,
          address: 'Moscow',
          photos: ['photo.jpg'],
        });
        expect(result.success).toBe(false);
      });

      it('should reject empty photos array', () => {
        const result = createItemSchema.safeParse({
          category: 'electronics',
          title: 'Camera',
          description: 'Test',
          price_per_day: 1000,
          price_per_month: 20000,
          deposit: 5000,
          address: 'Moscow',
          photos: [], // Empty
        });
        expect(result.success).toBe(false);
      });

      it('should reject short title', () => {
        const result = createItemSchema.safeParse({
          category: 'electronics',
          title: 'Ca', // Too short (less than 3)
          description: 'Test description',
          price_per_day: 1000,
          price_per_month: 20000,
          deposit: 5000,
          address: 'Moscow',
          photos: ['photo.jpg'],
        });
        expect(result.success).toBe(false);
      });
    });
  });

  describe('Review Validations', () => {
    describe('createReviewSchema', () => {
      it('should accept valid review data', () => {
        const result = createReviewSchema.safeParse({
          booking_id: 'booking-123',
          item_id: 'item-456',
          rating: 5,
          text: 'Great rental experience! Would recommend.',
        });
        expect(result.success).toBe(true);
      });

      it('should accept optional photos', () => {
        const result = createReviewSchema.safeParse({
          booking_id: 'booking-123',
          item_id: 'item-456',
          rating: 4,
          text: 'Good experience overall',
          photos: ['review-photo1.jpg', 'review-photo2.jpg'],
        });
        expect(result.success).toBe(true);
      });

      it('should reject rating below 1', () => {
        const result = createReviewSchema.safeParse({
          booking_id: 'booking-123',
          item_id: 'item-456',
          rating: 0,
          text: 'Bad experience with this item',
        });
        expect(result.success).toBe(false);
      });

      it('should reject rating above 5', () => {
        const result = createReviewSchema.safeParse({
          booking_id: 'booking-123',
          item_id: 'item-456',
          rating: 6,
          text: 'Amazing experience!!!!',
        });
        expect(result.success).toBe(false);
      });

      it('should reject short review text', () => {
        const result = createReviewSchema.safeParse({
          booking_id: 'booking-123',
          item_id: 'item-456',
          rating: 5,
          text: 'OK', // Too short (less than 10 chars)
        });
        expect(result.success).toBe(false);
      });
    });
  });
});
