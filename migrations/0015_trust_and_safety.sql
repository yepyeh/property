CREATE TABLE IF NOT EXISTS listing_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_slug TEXT NOT NULL,
  reporter_user_id INTEGER,
  reporter_name TEXT,
  reporter_contact TEXT,
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS owner_verification_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  owner_note TEXT,
  reviewed_note TEXT,
  submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT
);
