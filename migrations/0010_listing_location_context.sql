ALTER TABLE listings ADD COLUMN neighborhood_headline TEXT;
ALTER TABLE listings ADD COLUMN commute_notes TEXT;
ALTER TABLE listings ADD COLUMN nearby_places TEXT NOT NULL DEFAULT '[]';
ALTER TABLE listings ADD COLUMN trust_signals TEXT NOT NULL DEFAULT '[]';
ALTER TABLE listings ADD COLUMN lat REAL;
ALTER TABLE listings ADD COLUMN lng REAL;
ALTER TABLE listings ADD COLUMN location_precision_label TEXT;
