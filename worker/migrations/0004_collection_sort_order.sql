-- Vymotion D1 — migration 0004: ordering for inspiration boards + brand deals.
-- Same rationale as influencers (0003): the bulk-replace PUT stamps each item's position.
ALTER TABLE inspiration_boards ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE brand_deals ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
