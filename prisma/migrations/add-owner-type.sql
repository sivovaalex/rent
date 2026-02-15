-- Add owner type fields to users table
-- Date: 2026-02-15
-- Related: owner type feature (individual / ip / legal_entity)

DO $$ BEGIN
  CREATE TYPE "OwnerType" AS ENUM ('individual', 'ip', 'legal_entity');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "owner_type" "OwnerType";
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "company_name" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "inn" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "ogrn" TEXT;
