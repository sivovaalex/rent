-- Payment Logs table for payment audit trail
-- Date: 2026-02-11
-- Description: Add payment_logs table for tracking all payment operations

CREATE TABLE IF NOT EXISTS "payment_logs" (
  "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "booking_id" TEXT REFERENCES "bookings"("id") ON DELETE SET NULL,
  "action" TEXT NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "provider" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "payment_logs_user_id_idx" ON "payment_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "payment_logs_booking_id_idx" ON "payment_logs" ("booking_id");
CREATE INDEX IF NOT EXISTS "payment_logs_action_idx" ON "payment_logs" ("action");
CREATE INDEX IF NOT EXISTS "payment_logs_created_at_idx" ON "payment_logs" ("created_at");
