/**
 * Inline notification checks — triggered from API routes.
 *
 * Since Vercel Hobby allows only 1 cron/day, time-sensitive tasks
 * (chat unread 30 min, moderation reminders 30 min, auto-reject)
 * are checked opportunistically when users hit relevant endpoints.
 *
 * Throttling prevents excessive DB queries: each check type runs
 * at most once per THROTTLE_MS within a single serverless instance.
 * The notificationLog dedup (claimNotificationSlot) prevents double-sends
 * across instances.
 */

import { processChatUnread, processModerationReminders } from './notifications';

const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

let lastChatUnreadCheck = 0;
let lastModerationCheck = 0;

/**
 * Check for unread chat messages older than 30 min.
 * Call from POST /api/chat/[bookingId] (fire-and-forget).
 */
export async function inlineChatUnreadCheck(): Promise<void> {
  const now = Date.now();
  if (now - lastChatUnreadCheck < THROTTLE_MS) return;
  lastChatUnreadCheck = now;

  try {
    await processChatUnread();
  } catch (err) {
    console.error('[INLINE] chatUnread error:', err);
  }
}

/**
 * Check for pending moderation items/users older than 30 min.
 * Call from GET /api/admin/* (fire-and-forget).
 */
export async function inlineModerationCheck(): Promise<void> {
  const now = Date.now();
  if (now - lastModerationCheck < THROTTLE_MS) return;
  lastModerationCheck = now;

  try {
    await processModerationReminders();
  } catch (err) {
    console.error('[INLINE] moderationReminders error:', err);
  }
}
