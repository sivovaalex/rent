-- =====================================================
-- Миграция: Двусторонние отзывы + Система согласования
-- =====================================================

-- 1. Новые enum'ы
CREATE TYPE "ReviewType" AS ENUM ('renter_review', 'owner_review');
CREATE TYPE "ApprovalMode" AS ENUM ('auto_approve', 'manual', 'rating_based', 'verified_only');

-- 2. Добавить pending_approval в BookingStatus
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'pending_approval' BEFORE 'pending_payment';

-- 3. Review: добавить поле type
ALTER TABLE "reviews" ADD COLUMN IF NOT EXISTS "type" "ReviewType" NOT NULL DEFAULT 'renter_review';

-- 4. Review: изменить unique constraint (bookingId → bookingId + type)
ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "reviews_booking_id_key";
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_type_key" UNIQUE ("booking_id", "type");

-- 5. Booking: поля согласования
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "approval_deadline" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "rejection_reason" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP(3);
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "rejected_at" TIMESTAMP(3);

-- 6. User: настройки одобрения по умолчанию
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_approval_mode" "ApprovalMode" NOT NULL DEFAULT 'auto_approve';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "default_approval_threshold" DOUBLE PRECISION NOT NULL DEFAULT 4.0;

-- 7. Item: переопределение режима на лоте
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "approval_mode" "ApprovalMode";
ALTER TABLE "items" ADD COLUMN IF NOT EXISTS "approval_threshold" DOUBLE PRECISION;
