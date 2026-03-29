ALTER TABLE enquiries ADD COLUMN response_status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE enquiries ADD COLUMN owner_note TEXT;
ALTER TABLE enquiries ADD COLUMN responded_at TEXT;

CREATE TABLE IF NOT EXISTS recent_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  listing_slug TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, listing_slug)
);

CREATE INDEX IF NOT EXISTS idx_recent_views_user_id ON recent_views(user_id, updated_at DESC);
