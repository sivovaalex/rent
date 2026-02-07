-- Migration: Add YooKassa payment and handover confirmation fields to bookings
-- Related commit: 8491f16c54bdfe6bf8a2fa15871a01d8078a549d
-- Date: 2026-02-07

-- YooKassa payment ID
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS yookassa_payment_id TEXT;

-- Handover confirmations (Model B: deposit & remainder exchanged in person)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_confirmed_by_renter BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_confirmed_by_owner BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remainder_confirmed_by_renter BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remainder_confirmed_by_owner BOOLEAN NOT NULL DEFAULT false;
