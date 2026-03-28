CREATE TABLE IF NOT EXISTS notification_inbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  href TEXT,
  level TEXT NOT NULL DEFAULT 'info',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_inbox_user_created ON notification_inbox(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_inbox_user_read ON notification_inbox(user_id, read_at, created_at DESC);
