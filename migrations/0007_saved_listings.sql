CREATE TABLE IF NOT EXISTS saved_listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  listing_slug TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, listing_slug)
);

CREATE INDEX IF NOT EXISTS idx_saved_listings_user ON saved_listings(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_saved_listings_slug ON saved_listings(listing_slug, created_at DESC);
