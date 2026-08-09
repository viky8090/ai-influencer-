-- Vymotion D1 — migration 0009: seedance_2_0 now maps to the REAL Seedance 2.0 on fal
-- (bytedance/seedance-2.0/*), which is ~8-17× the COGS of the v1 lite it used to run on:
-- fal charges $0.3034/s @720p, $0.682/s @1080p ($0.014/1k tokens; 4k at $0.008/1k).
-- The old lite endpoints live on as the budget model id `seedance_lite`.
-- ⚠︎CALIBRATE (VC retail ≈ $0.02/VC, ≥60% target margin; quote = per_clip base (5s) +
-- video_extra_second × (duration-5), derived server-side in routes/generate.js):
--   seedance_2_0 base 150 VC ($3.00 vs $1.52 COGS @720p/5s ≈ 49%) + 30 VC/s extra
--     ($0.60/s vs $0.30 @720p ≈ 49%). ⚠ 1080p runs at/below cost ($0.682/s vs $0.60/s
--     retail) — needs resolution-aware quoting or a reprice before promoting 1080p.
--   seedance_lite base 20 VC + 2 VC/s extra (unchanged v1-lite economics).

UPDATE price_book SET cost_vc = 150 WHERE id = 'pb_v1_video_std';          -- seedance_2_0 base
UPDATE price_book SET cost_vc = 30  WHERE id = 'pb_v1_video_extra_sec';    -- seedance_2_0 per extra second

INSERT INTO price_book (id, version, operation, model, unit, cost_vc, active, created_at) VALUES
  ('pb_v1_video_lite',           1, 'video',              'seedance_lite', 'per_clip',   20, 1, (strftime('%s','now') * 1000)),
  ('pb_v1_video_lite_extra_sec', 1, 'video_extra_second', 'seedance_lite', 'per_second', 2,  1, (strftime('%s','now') * 1000)),
  -- extra-second rows for the other duration-variable models (no row = flat price; Veo is a
  -- fixed 8s clip so it deliberately has none):
  ('pb_v1_video_pro_extra_sec',   1, 'video_extra_second', 'seedance_pro',  'per_second', 15, 1, (strftime('%s','now') * 1000)),
  ('pb_v1_video_kling_extra_sec', 1, 'video_extra_second', 'kling_2_5_pro', 'per_second', 9,  1, (strftime('%s','now') * 1000)),
  ('pb_v1_video_sora_extra_sec',  1, 'video_extra_second', 'sora_2',        'per_second', 5,  1, (strftime('%s','now') * 1000));
