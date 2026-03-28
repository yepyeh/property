CREATE TABLE IF NOT EXISTS listings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  city TEXT NOT NULL,
  district TEXT NOT NULL,
  ward TEXT NOT NULL,
  property_type TEXT NOT NULL,
  intent TEXT NOT NULL,
  price_label TEXT NOT NULL,
  numeric_price REAL NOT NULL,
  price_unit TEXT NOT NULL,
  beds INTEGER NOT NULL,
  baths INTEGER NOT NULL,
  area INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'Owner submitted',
  tone TEXT NOT NULL DEFAULT 'sea',
  summary TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  features TEXT NOT NULL DEFAULT '[]',
  owner_name TEXT NOT NULL,
  owner_email TEXT NOT NULL,
  owner_phone TEXT NOT NULL,
  owner_role TEXT NOT NULL DEFAULT 'Owner',
  owner_response_time TEXT NOT NULL DEFAULT '~30 minutes',
  owner_verified INTEGER NOT NULL DEFAULT 0,
  views_24h INTEGER NOT NULL DEFAULT 0,
  saves INTEGER NOT NULL DEFAULT 0,
  enquiries INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS enquiries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  listing_slug TEXT NOT NULL,
  listing_title TEXT NOT NULL,
  applicant_name TEXT NOT NULL,
  contact TEXT NOT NULL,
  message TEXT NOT NULL,
  preferred_time TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (listing_slug) REFERENCES listings(slug)
);

CREATE INDEX IF NOT EXISTS idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_enquiries_listing_slug ON enquiries(listing_slug);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON enquiries(created_at DESC);
