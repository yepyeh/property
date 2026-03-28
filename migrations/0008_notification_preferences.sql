CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id INTEGER PRIMARY KEY,
  email_enabled INTEGER NOT NULL DEFAULT 1,
  in_app_enabled INTEGER NOT NULL DEFAULT 1,
  cadence TEXT NOT NULL DEFAULT 'daily',
  listing_expiry INTEGER NOT NULL DEFAULT 1,
  enquiry_activity INTEGER NOT NULL DEFAULT 1,
  billing_events INTEGER NOT NULL DEFAULT 1,
  saved_search_matches INTEGER NOT NULL DEFAULT 1,
  saved_listing_updates INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
