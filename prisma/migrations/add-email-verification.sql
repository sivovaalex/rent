-- Email verification (2026-02-15)
-- Для применения на production через Supabase SQL Editor

-- Add email verification fields to users
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email_verified_at" TIMESTAMPTZ;

-- Existing users: mark as already verified
UPDATE "users" SET "email_verified" = true WHERE "email_verified" = false;

-- Create email verification tokens table
CREATE TABLE IF NOT EXISTS "email_verification_tokens" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT NOT NULL,
  "token" TEXT NOT NULL UNIQUE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "expires_at" TIMESTAMPTZ NOT NULL,
  "used_at" TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS "email_verification_tokens_email_idx" ON "email_verification_tokens" ("email");
CREATE INDEX IF NOT EXISTS "email_verification_tokens_token_idx" ON "email_verification_tokens" ("token");
