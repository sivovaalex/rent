-- 2026-02-20: Add support tickets system
-- Linked to: feature/support-service

DO $$ BEGIN
  CREATE TYPE "SupportCategory" AS ENUM ('technical', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SupportStatus" AS ENUM ('open', 'in_progress', 'closed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "support_tickets" (
  "id"             TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "user_id"        TEXT        NOT NULL,
  "category"       "SupportCategory" NOT NULL,
  "subject"        VARCHAR(255) NOT NULL,
  "status"         "SupportStatus"   NOT NULL DEFAULT 'open',
  "unread_by_admin" BOOLEAN    NOT NULL DEFAULT TRUE,
  "unread_by_user"  BOOLEAN    NOT NULL DEFAULT FALSE,
  "closed_at"      TIMESTAMPTZ,
  "created_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS "support_messages" (
  "id"         TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "ticket_id"  TEXT        NOT NULL,
  "user_id"    TEXT,
  "text"       TEXT        NOT NULL,
  "is_admin"   BOOLEAN     NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("id"),
  FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE,
  FOREIGN KEY ("user_id")   REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS "support_tickets_user_id_idx"
  ON "support_tickets"("user_id");
CREATE INDEX IF NOT EXISTS "support_tickets_status_idx"
  ON "support_tickets"("status");
CREATE INDEX IF NOT EXISTS "support_tickets_created_at_idx"
  ON "support_tickets"("created_at");
CREATE INDEX IF NOT EXISTS "support_messages_ticket_id_created_at_idx"
  ON "support_messages"("ticket_id", "created_at");
