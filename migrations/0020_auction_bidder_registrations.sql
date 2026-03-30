CREATE TABLE IF NOT EXISTS auction_bidder_registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  listing_slug TEXT NOT NULL,
  registration_method TEXT NOT NULL DEFAULT 'online',
  max_proxy_bid REAL,
  bidder_note TEXT,
  confirm_identity INTEGER NOT NULL DEFAULT 0,
  confirm_funds INTEGER NOT NULL DEFAULT 0,
  confirm_terms INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'registered',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, listing_slug)
);

CREATE INDEX IF NOT EXISTS idx_auction_bidder_registrations_user_updated
  ON auction_bidder_registrations(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_auction_bidder_registrations_listing_updated
  ON auction_bidder_registrations(listing_slug, updated_at DESC);
