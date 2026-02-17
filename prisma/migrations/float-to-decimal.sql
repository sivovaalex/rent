-- Convert price fields from FLOAT to DECIMAL for financial precision
-- Date: 2026-02-17

-- Item table
ALTER TABLE "items" ALTER COLUMN "price_per_day" TYPE DECIMAL USING "price_per_day"::DECIMAL;
ALTER TABLE "items" ALTER COLUMN "price_per_month" TYPE DECIMAL USING "price_per_month"::DECIMAL;
ALTER TABLE "items" ALTER COLUMN "deposit" TYPE DECIMAL USING "deposit"::DECIMAL;

-- Booking table
ALTER TABLE "bookings" ALTER COLUMN "rental_price" TYPE DECIMAL USING "rental_price"::DECIMAL;
ALTER TABLE "bookings" ALTER COLUMN "deposit" TYPE DECIMAL USING "deposit"::DECIMAL;
ALTER TABLE "bookings" ALTER COLUMN "commission" TYPE DECIMAL USING "commission"::DECIMAL;
ALTER TABLE "bookings" ALTER COLUMN "insurance" TYPE DECIMAL USING "insurance"::DECIMAL;
ALTER TABLE "bookings" ALTER COLUMN "total_price" TYPE DECIMAL USING "total_price"::DECIMAL;
ALTER TABLE "bookings" ALTER COLUMN "prepayment" TYPE DECIMAL USING "prepayment"::DECIMAL;
