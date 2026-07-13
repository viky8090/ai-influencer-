-- Plans have separate Polar products for monthly vs annual billing; packs are one-time.
-- interval: 'month' | 'year' for kind='plan', NULL for kind='pack'.
ALTER TABLE polar_products ADD COLUMN interval TEXT;
