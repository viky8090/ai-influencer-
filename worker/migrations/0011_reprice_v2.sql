-- Vymotion D1 — migration 0011: reprice v2 (Phase A unit economics + B3 plan math).
-- Target: ≥60% gross margin at pack anchor ≈ $0.04/VC (Creator ~$0.048/VC after B3).
-- COGS basis: live fal.ai (2026-07) + Claude Opus 4.8 + HF Soul.
-- Reprice again with UPDATE — no deploy required for future tuning.
--
-- Image floors (COGS → VC @ $0.04/VC and 60% margin ≈ ceil(COGS/0.016)):
--   flash $0.04 → 6 · gpt medium ~$0.05 → 12 · gpt high ~$0.17 → 22 (quote multiplier)
--   nano pro $0.15 → 20 (4K ×2) · seedream $0.03 → 5 · krea ~$0.03 → 5 · soul ~$0.01 → 6
-- Video floors:
--   lite $0.18/5s → 25+4/s · pro $0.62/5s → 80+16/s · kling $0.35/5s → 50+10/s
--   sora ~$0.10/s → 100+12/s · veo 8s audio $1.20 → 160 · seedance2 $0.3034/s → 200+40/s
--   seedance2 1080p: quote multiplies 2.25× (see priceBook.js)

UPDATE price_book SET cost_vc = 2  WHERE id = 'pb_v1_prompt';
UPDATE price_book SET cost_vc = 6  WHERE id = 'pb_v1_img_flash';
UPDATE price_book SET cost_vc = 12 WHERE id = 'pb_v1_img_gpt2';       -- medium default; high → 22 via quote()
UPDATE price_book SET cost_vc = 20 WHERE id = 'pb_v1_img_nb2';        -- 1K; 4K ×2 via quote()
UPDATE price_book SET cost_vc = 6  WHERE id = 'pb_v1_img_soul';
UPDATE price_book SET cost_vc = 6  WHERE id = 'pb_v1_pose';
UPDATE price_book SET cost_vc = 28 WHERE id = 'pb_v1_sheet';
UPDATE price_book SET cost_vc = 5  WHERE id = 'pb_v1_img_seedream4';
UPDATE price_book SET cost_vc = 5  WHERE id = 'pb_v1_img_krea';

UPDATE price_book SET cost_vc = 25 WHERE id = 'pb_v1_video_lite';
UPDATE price_book SET cost_vc = 4  WHERE id = 'pb_v1_video_lite_extra_sec';
UPDATE price_book SET cost_vc = 80 WHERE id = 'pb_v1_video_seedance_pro';
UPDATE price_book SET cost_vc = 16 WHERE id = 'pb_v1_video_pro_extra_sec';
UPDATE price_book SET cost_vc = 50 WHERE id = 'pb_v1_video_kling25';
UPDATE price_book SET cost_vc = 10 WHERE id = 'pb_v1_video_kling_extra_sec';
UPDATE price_book SET cost_vc = 100 WHERE id = 'pb_v1_video_sora2';
UPDATE price_book SET cost_vc = 12 WHERE id = 'pb_v1_video_sora_extra_sec';
UPDATE price_book SET cost_vc = 160 WHERE id = 'pb_v1_video_veo3_fast';
UPDATE price_book SET cost_vc = 200 WHERE id = 'pb_v1_video_std';           -- seedance_2_0 base (5s @720p)
UPDATE price_book SET cost_vc = 40 WHERE id = 'pb_v1_video_extra_sec';     -- seedance_2_0 per extra second
UPDATE price_book SET cost_vc = 120 WHERE id = 'pb_v1_video_4k_upscale';  -- optional 4k upscale add-on

-- Vision Claude (brand-sheet prompt analysis, caption with image) — higher than flat prompt
INSERT OR IGNORE INTO price_book (id, version, operation, model, unit, cost_vc, active, created_at) VALUES
  ('pb_v2_prompt_vision', 2, 'prompt', 'vision', 'per_call', 5, 1, (strftime('%s','now') * 1000));

-- GPT Image high-quality surcharge row (lookup optional; quote() also hard-maps 12→22)
INSERT OR IGNORE INTO price_book (id, version, operation, model, unit, cost_vc, active, created_at) VALUES
  ('pb_v2_img_gpt2_high', 2, 'image', 'gpt_image_2_high', 'per_image', 22, 1, (strftime('%s','now') * 1000));
