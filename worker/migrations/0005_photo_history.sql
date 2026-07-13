-- Vymotion D1 — migration 0005: server-side Photo Studio history (PRD G5 durable storage).
-- Replaces the localStorage 'photo_studio_history' bus for signed-in users. The full history
-- item (url + settings snapshot) is stored losslessly in item_json; id is namespaced
-- userId::histId (histId is client-generated and unique per photo). sort_order preserves the
-- newest-first order the bulk-replace PUT stamps.
CREATE TABLE photo_history (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  url        TEXT,
  item_json  TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_photo_history_user ON photo_history(user_id);
