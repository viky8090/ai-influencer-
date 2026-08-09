-- Vymotion D1 — migration 0003: explicit influencer ordering.
-- The bulk-replace PUT receives the full ordered list, so it can stamp each row's position.
-- GET orders by sort_order to faithfully preserve the user's influencer sequence
-- (the old localStorage store kept order via the influencer_ids array).
ALTER TABLE influencers ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
