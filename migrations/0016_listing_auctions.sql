ALTER TABLE listings ADD COLUMN sale_mode TEXT DEFAULT 'private-sale';
ALTER TABLE listings ADD COLUMN auction_starts_at TEXT;
ALTER TABLE listings ADD COLUMN auction_ends_at TEXT;
ALTER TABLE listings ADD COLUMN auction_starting_price_label TEXT;
ALTER TABLE listings ADD COLUMN auction_reserve_price_label TEXT;
ALTER TABLE listings ADD COLUMN auction_terms TEXT;
