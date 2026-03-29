CREATE TABLE IF NOT EXISTS auction_watchers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  listing_slug TEXT NOT NULL,
  max_bid_amount REAL,
  notify_outbid INTEGER NOT NULL DEFAULT 1,
  notify_over_max_bid INTEGER NOT NULL DEFAULT 1,
  notify_unsold_under REAL,
  notify_starting_soon INTEGER NOT NULL DEFAULT 1,
  notify_ending_soon INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, listing_slug)
);

CREATE INDEX IF NOT EXISTS idx_auction_watchers_user_updated
  ON auction_watchers(user_id, updated_at DESC);
