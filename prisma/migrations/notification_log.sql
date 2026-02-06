-- =====================================================
-- Миграция: NotificationLog + notifyBookingRequests
-- =====================================================

-- 1. Таблица дедупликации уведомлений
CREATE TABLE IF NOT EXISTS "notification_log" (
  "id" UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "event_type" TEXT NOT NULL,
  "recipient_id" TEXT NOT NULL,
  "sent_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "notification_log_entity_type_entity_id_event_type_recipient_key"
    UNIQUE ("entity_type", "entity_id", "event_type", "recipient_id")
);

CREATE INDEX IF NOT EXISTS "notification_log_entity_type_event_type_idx"
  ON "notification_log"("entity_type", "event_type");

CREATE INDEX IF NOT EXISTS "notification_log_sent_at_idx"
  ON "notification_log"("sent_at");

-- 2. Настройка уведомлений о запросах бронирования для владельцев
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "notify_booking_requests" BOOLEAN NOT NULL DEFAULT true;
