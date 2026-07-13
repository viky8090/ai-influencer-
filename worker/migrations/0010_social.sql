-- Vymotion D1 — migration 0010: social publishing via self-hosted Postiz (PRD N13, §12.8).
-- ONE Postiz organization holds every connected channel; these tables map Postiz
-- integration/post ids to Vymotion users so the Worker can enforce ownership.

-- A user's connected social channel (Postiz "integration").
CREATE TABLE social_channels (
  id                     TEXT PRIMARY KEY,          -- ULID
  user_id                TEXT NOT NULL REFERENCES users(id),
  postiz_integration_id  TEXT NOT NULL UNIQUE,
  platform               TEXT NOT NULL,             -- Postiz provider identifier (x, linkedin, bluesky, …)
  name                   TEXT,
  picture                TEXT,
  status                 TEXT NOT NULL DEFAULT 'active',  -- active|disabled
  created_at             INTEGER NOT NULL,
  deleted_at             INTEGER
);
CREATE INDEX idx_social_channels_user ON social_channels(user_id);

-- Pending channel-connect claims: snapshot of org integration ids taken when the
-- OAuth URL was issued, so the new integration can be diffed out and bound to the
-- requesting user afterwards (single-org multi-tenancy).
CREATE TABLE social_pending_connects (
  id             TEXT PRIMARY KEY,                  -- ULID
  user_id        TEXT NOT NULL REFERENCES users(id),
  platform       TEXT NOT NULL,
  known_ids_json TEXT NOT NULL,                     -- integration ids that existed at issue time
  created_at     INTEGER NOT NULL
);
CREATE INDEX idx_social_pending_user ON social_pending_connects(user_id);

-- A post created through Vymotion. Postiz owns scheduling truth; this row carries
-- ownership, the composed content, and a cached state for the calendar.
CREATE TABLE social_posts (
  id                   TEXT PRIMARY KEY,            -- ULID
  user_id              TEXT NOT NULL REFERENCES users(id),
  postiz_post_id       TEXT,                        -- first postId returned by Postiz
  response_json        TEXT,                        -- full [{postId,integration}] mapping
  influencer_id        TEXT,
  integration_ids_json TEXT NOT NULL,               -- postiz integration ids posted to
  content              TEXT,
  media_json           TEXT,                        -- [{url, postiz_id, postiz_path}]
  settings_json        TEXT,                        -- per-channel settings overrides
  scheduled_at         INTEGER,                     -- epoch ms (publish time)
  state                TEXT NOT NULL,               -- draft|scheduled|published|error|deleted
  release_urls_json    TEXT,                        -- live post URLs once published
  error                TEXT,
  created_at           INTEGER NOT NULL,
  updated_at           INTEGER NOT NULL
);
CREATE INDEX idx_social_posts_user ON social_posts(user_id);
CREATE INDEX idx_social_posts_state ON social_posts(state, scheduled_at);

-- Media upload cache: Vymotion public asset URL → Postiz MediaFile, so re-posting
-- the same generated image doesn't re-upload it.
CREATE TABLE postiz_media (
  url              TEXT PRIMARY KEY,                -- Vymotion public asset/ref URL
  postiz_media_id  TEXT NOT NULL,
  postiz_path      TEXT NOT NULL,
  created_at       INTEGER NOT NULL
);
