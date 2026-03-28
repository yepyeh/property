CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'owner',
  plan_tier TEXT NOT NULL DEFAULT 'starter',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

ALTER TABLE listings ADD COLUMN owner_user_id INTEGER;
ALTER TABLE listings ADD COLUMN plan_type TEXT NOT NULL DEFAULT 'free_trial';
ALTER TABLE listings ADD COLUMN trial_ends_at TEXT;
ALTER TABLE listings ADD COLUMN paid_until TEXT;
ALTER TABLE listings ADD COLUMN promoted_until TEXT;

UPDATE listings
SET trial_ends_at = datetime(created_at, '+7 days')
WHERE trial_ends_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_listings_owner_user_id ON listings(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_listings_plan_type ON listings(plan_type);
