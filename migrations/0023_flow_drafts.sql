CREATE TABLE IF NOT EXISTS flow_drafts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  owner_user_id INTEGER NOT NULL,
  flow_type TEXT NOT NULL,
  title TEXT,
  payload_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(owner_user_id, flow_type)
);

CREATE INDEX IF NOT EXISTS idx_flow_drafts_owner_type
ON flow_drafts(owner_user_id, flow_type);
