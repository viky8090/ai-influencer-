-- Vymotion D1 schema — migration 0001 (initial).
-- Mirrors PRD §13.1. SQLite dialect (Cloudflare D1).
-- Conventions: IDs are ULIDs (TEXT); timestamps are epoch milliseconds (INTEGER).
-- REFERENCES clauses document intent; D1 does not enforce FKs by default.

-- ── Identity ──────────────────────────────────────────────────────────
-- Identity is owned by Clerk. D1 stores only a mirror; no passwords, no sessions.
CREATE TABLE users (
  id                 TEXT PRIMARY KEY,                 -- ULID (internal)
  clerk_user_id      TEXT UNIQUE NOT NULL,             -- maps to Clerk; set via Clerk webhook
  email              TEXT UNIQUE NOT NULL,
  display_name       TEXT,
  handle             TEXT UNIQUE,
  avatar_r2_key      TEXT,
  bio                TEXT,
  default_model      TEXT,
  default_aspect     TEXT,
  default_resolution TEXT,
  polar_customer_id  TEXT,
  role               TEXT NOT NULL DEFAULT 'user',     -- user|admin (ops console, §19)
  status             TEXT NOT NULL DEFAULT 'active',   -- active|suspended|deleted
  created_at         INTEGER NOT NULL,
  updated_at         INTEGER NOT NULL
);

-- ── Billing ───────────────────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id),
  polar_subscription_id TEXT UNIQUE,
  plan                  TEXT NOT NULL,                 -- free|creator|pro|studio
  status                TEXT NOT NULL,                 -- active|canceled|past_due|incomplete
  current_period_end    INTEGER,
  cancel_at_period_end  INTEGER NOT NULL DEFAULT 0,
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL
);
CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);

-- Versioned price book (also mirrored to KV for hot reads). Never hard-coded in client.
CREATE TABLE price_book (
  id         TEXT PRIMARY KEY,
  version    INTEGER NOT NULL,
  operation  TEXT NOT NULL,                            -- prompt|image|pose|sheet|video|video_extra_second|video_4k_upscale
  model      TEXT,                                     -- nullable; model-specific cost
  unit       TEXT NOT NULL,                            -- per_call|per_image|per_clip|per_second|per_sheet
  cost_vc    INTEGER NOT NULL,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_price_book_lookup ON price_book(operation, model, active);

-- Maps Polar product/price ids → internal plan or credit pack.
CREATE TABLE polar_products (
  polar_product_id TEXT PRIMARY KEY,
  polar_price_id   TEXT,
  kind             TEXT NOT NULL,                       -- plan|pack
  plan_or_pack     TEXT NOT NULL,                       -- free|creator|pro|studio|small|medium|large|mega
  grant_vc         INTEGER NOT NULL,
  created_at       INTEGER NOT NULL
);

-- ── Credits (append-only, double-entry-style ledger) ──────────────────
CREATE TABLE credit_ledger (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  kind          TEXT NOT NULL,                          -- grant|hold|release|spend|refund|expire|adjust
  amount        INTEGER NOT NULL,                       -- signed
  balance_after INTEGER NOT NULL,
  bucket        TEXT NOT NULL,                          -- subscription|topup
  ref_type      TEXT,                                   -- generation|polar|admin
  ref_id        TEXT,                                   -- <generation_id> | <polar_order_id> | ...
  reason        TEXT,
  actor         TEXT NOT NULL DEFAULT 'system',         -- system|user|admin:<id>
  expires_at    INTEGER,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_ledger_user_time ON credit_ledger(user_id, created_at);
CREATE INDEX idx_ledger_ref ON credit_ledger(ref_type, ref_id);

-- Materialised balance cache (authoritative source is the ledger + CreditAccount DO).
CREATE TABLE credit_balance (
  user_id         TEXT PRIMARY KEY REFERENCES users(id),
  subscription_vc INTEGER NOT NULL DEFAULT 0,
  topup_vc        INTEGER NOT NULL DEFAULT 0,
  updated_at      INTEGER NOT NULL
);

-- ── Creative domain (formerly localStorage) ───────────────────────────
CREATE TABLE influencers (
  id                    TEXT PRIMARY KEY,
  user_id               TEXT NOT NULL REFERENCES users(id),
  name                  TEXT,
  gender                TEXT,
  type                  TEXT,
  age                   TEXT,
  niche                 TEXT,
  backstory             TEXT,
  physical_desc         TEXT,
  clothing_style        TEXT,
  palette_json          TEXT,
  voice                 TEXT,
  intro_extrovert       TEXT,
  main_image_asset      TEXT,
  character_sheet_asset TEXT,
  closeup1_asset        TEXT,
  closeup2_asset        TEXT,
  data_json             TEXT,                           -- bag for fields not promoted to columns
  created_at            INTEGER NOT NULL,
  updated_at            INTEGER NOT NULL,
  deleted_at            INTEGER
);
CREATE INDEX idx_influencers_user ON influencers(user_id, deleted_at);

CREATE TABLE wardrobe_slots (
  id            TEXT PRIMARY KEY,
  influencer_id TEXT NOT NULL REFERENCES influencers(id),
  name          TEXT,
  image_asset   TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_wardrobe_influencer ON wardrobe_slots(influencer_id);

CREATE TABLE brand_deals (
  id            TEXT PRIMARY KEY,
  user_id       TEXT NOT NULL REFERENCES users(id),
  influencer_id TEXT REFERENCES influencers(id),
  brand         TEXT,
  category      TEXT,
  product_asset TEXT,
  sheet_asset   TEXT,
  images_json   TEXT,
  created_at    INTEGER NOT NULL
);
CREATE INDEX idx_brand_deals_user ON brand_deals(user_id);

CREATE TABLE inspiration_boards (
  id         TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id),
  title      TEXT,
  items_json TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX idx_inspiration_user ON inspiration_boards(user_id);

CREATE TABLE generations (
  id                  TEXT PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id),
  influencer_id       TEXT REFERENCES influencers(id),
  kind                TEXT NOT NULL,                    -- image|video|pose|sheet|prompt
  model               TEXT,
  params_json         TEXT,
  provider            TEXT NOT NULL,                    -- higgsfield|anthropic
  provider_request_id TEXT,                             -- idempotency key for webhooks
  status              TEXT NOT NULL DEFAULT 'queued',   -- queued|in_progress|delivered|failed|nsfw|cancelled
  cost_vc             INTEGER NOT NULL DEFAULT 0,
  hold_id             TEXT,
  output_assets_json  TEXT,                             -- R2 keys
  error               TEXT,
  created_at          INTEGER NOT NULL,
  delivered_at        INTEGER
);
CREATE INDEX idx_generations_user_time ON generations(user_id, created_at);
CREATE INDEX idx_generations_influencer ON generations(influencer_id);
-- NULLs are distinct in SQLite UNIQUE, so many queued rows (request_id still NULL) coexist;
-- once a provider request_id is assigned it is unique per provider.
CREATE UNIQUE INDEX idx_generations_provider_req ON generations(provider, provider_request_id);
CREATE INDEX idx_generations_status ON generations(status);

CREATE TABLE assets (
  id                   TEXT PRIMARY KEY,
  user_id              TEXT NOT NULL REFERENCES users(id),
  r2_key               TEXT NOT NULL,
  kind                 TEXT,                            -- image|video|thumb|avatar
  content_type         TEXT,
  bytes                INTEGER,
  width                INTEGER,
  height               INTEGER,
  duration_s           REAL,
  thumb_r2_key         TEXT,
  source_generation_id TEXT REFERENCES generations(id),
  created_at           INTEGER NOT NULL
);
CREATE INDEX idx_assets_user ON assets(user_id);
CREATE INDEX idx_assets_source ON assets(source_generation_id);

-- Webhook de-dupe (idempotency for Higgsfield/Polar/Clerk retries).
CREATE TABLE webhook_events (
  id                  TEXT PRIMARY KEY,
  provider            TEXT NOT NULL,                    -- higgsfield|polar|clerk
  provider_request_id TEXT NOT NULL,
  payload_json        TEXT,
  processed_at        INTEGER,
  created_at          INTEGER NOT NULL,
  UNIQUE(provider, provider_request_id)
);
