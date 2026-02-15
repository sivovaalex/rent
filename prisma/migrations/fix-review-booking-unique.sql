-- Fix: Remove legacy unique constraint on just booking_id in reviews table
-- The correct constraint is the compound unique (booking_id, type) which allows
-- both a renter_review and owner_review per booking.
-- Date: 2026-02-15
-- Related: #68 fix Unique constraint failed on (booking_id)

-- Step 1: Drop the legacy unique index on just booking_id (if it exists)
-- The index name may vary; check with: SELECT indexname FROM pg_indexes WHERE tablename = 'reviews';
DROP INDEX IF EXISTS "reviews_booking_id_key";

-- Step 2: Ensure the correct compound unique index exists
CREATE UNIQUE INDEX IF NOT EXISTS "reviews_booking_id_type_key" ON "reviews" ("booking_id", "type");
