-- Add indexes on users.is_blocked and users.verification_status for admin queries
-- Add unique constraint on bookings.yookassa_payment_id
-- Date: 2026-02-17

-- User indexes
CREATE INDEX IF NOT EXISTS "users_is_blocked_idx" ON "users" ("is_blocked");
CREATE INDEX IF NOT EXISTS "users_verification_status_idx" ON "users" ("verification_status");

-- YooKassa payment ID unique (nullable — multiple NULLs allowed)
CREATE UNIQUE INDEX IF NOT EXISTS "bookings_yookassa_payment_id_key"
  ON "bookings" ("yookassa_payment_id")
  WHERE "yookassa_payment_id" IS NOT NULL;
