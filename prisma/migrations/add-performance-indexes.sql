-- Performance indexes (2026-02-10)
-- Оптимизация производительности API: составные индексы для частых запросов
-- Применить на production через Supabase SQL Editor

-- Items: каталог фильтрует по status + category
CREATE INDEX CONCURRENTLY IF NOT EXISTS "items_status_category_idx" ON "items" ("status", "category");

-- Bookings: analytics фильтрует по item_id + status
CREATE INDEX CONCURRENTLY IF NOT EXISTS "bookings_item_id_status_idx" ON "bookings" ("item_id", "status");

-- Bookings: admin stats + общие выборки по status + created_at
CREATE INDEX CONCURRENTLY IF NOT EXISTS "bookings_status_created_at_idx" ON "bookings" ("status", "created_at");

-- Messages: chat groupBy по (booking_id, sender_id, is_read)
CREATE INDEX CONCURRENTLY IF NOT EXISTS "messages_booking_id_sender_id_is_read_idx" ON "messages" ("booking_id", "sender_id", "is_read");
