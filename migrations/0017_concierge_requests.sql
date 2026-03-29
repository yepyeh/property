CREATE TABLE IF NOT EXISTS concierge_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  requester_user_id INTEGER,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL,
  request_type TEXT NOT NULL,
  market_intent TEXT,
  city TEXT,
  budget_label TEXT,
  timeline_label TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
