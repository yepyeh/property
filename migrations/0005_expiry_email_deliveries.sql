CREATE TABLE IF NOT EXISTS expiry_email_deliveries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_key TEXT NOT NULL UNIQUE,
  owner_user_id INTEGER,
  owner_email TEXT NOT NULL,
  listing_slug TEXT NOT NULL,
  listing_title TEXT NOT NULL,
  category TEXT NOT NULL,
  level TEXT NOT NULL,
  due_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  provider TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expiry_email_deliveries_owner ON expiry_email_deliveries(owner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expiry_email_deliveries_status ON expiry_email_deliveries(status, created_at DESC);
