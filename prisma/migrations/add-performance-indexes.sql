-- Performance indexes (2026-02-10)
-- Оптимизация производительности API: составные индексы для частых запросов
-- Применить на production через Supabase SQL Editor

-- Items: каталог фильтрует по status + category
CREATE INDEX IF NOT EXISTS "items_status_category_idx" ON "items" ("status", "category");

-- Bookings: analytics фильтрует по item_id + status
CREATE INDEX IF NOT EXISTS "bookings_item_id_status_idx" ON "bookings" ("item_id", "status");

-- Bookings: admin stats + общие выборки по status + created_at
CREATE INDEX IF NOT EXISTS "bookings_status_created_at_idx" ON "bookings" ("status", "created_at");

-- Messages: chat groupBy по (booking_id, sender_id, is_read)
CREATE INDEX IF NOT EXISTS "messages_booking_id_sender_id_is_read_idx" ON "messages" ("booking_id", "sender_id", "is_read");

-- Items: фильтр по цене в каталоге (только approved лоты)
CREATE INDEX IF NOT EXISTS "items_price_per_day_idx" ON "items" ("price_per_day");

-- Bookings: cron авто-отклонение по approval_deadline
CREATE INDEX IF NOT EXISTS "bookings_status_approval_deadline_idx" ON "bookings" ("status", "approval_deadline");

-- Bookings: cron напоминание возврата (status + end_date)
CREATE INDEX IF NOT EXISTS "bookings_status_end_date_idx" ON "bookings" ("status", "end_date");

-- Bookings: cron напоминание отзыва (status + completed_at)
CREATE INDEX IF NOT EXISTS "bookings_status_completed_at_idx" ON "bookings" ("status", "completed_at");
