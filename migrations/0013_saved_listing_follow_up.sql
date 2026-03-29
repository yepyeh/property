ALTER TABLE saved_listings ADD COLUMN buyer_state TEXT NOT NULL DEFAULT 'saved';
ALTER TABLE saved_listings ADD COLUMN follow_up_on TEXT;
ALTER TABLE saved_listings ADD COLUMN buyer_note TEXT;
ALTER TABLE saved_listings ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS idx_saved_listings_user_state ON saved_listings(user_id, buyer_state, updated_at DESC);
