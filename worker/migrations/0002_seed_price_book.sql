-- Vymotion D1 — migration 0002: seed price book v1 (PRD §10.2).
-- ⚠︎CALIBRATE: these VC costs are placeholders pending the live Higgsfield price
-- sheet + measured Claude Opus token costs. They live in data (not code) precisely
-- so finance can reprice without a deploy. Spend order/expiry rules are in the DO.
-- ⚠︎CALIBRATE (fal.ai routing, PRD §12.7): no-ref nano_banana_flash runs on fal.ai where
-- COGS is ~$0.039/image — at 2 VC (≈$0.04 retail) the margin is near zero. Reprice to
-- 3 VC via a price_book UPDATE (no deploy needed) or accept flash as a loss-leader.
-- No-ref gpt_image_2 runs on fal gpt-image-1 at quality:high (~$0.17/image COGS) — 4 VC
-- (≈$0.08 retail) is UNDERWATER; reprice to ≥12 VC or drop quality to medium.
-- PRD §5 targets ≥60% blended gross margin.

INSERT INTO price_book (id, version, operation, model, unit, cost_vc, active, created_at) VALUES
  ('pb_v1_prompt',            1, 'prompt',             NULL,                'per_call',   1,  1, (strftime('%s','now') * 1000)),
  ('pb_v1_img_flash',         1, 'image',              'nano_banana_flash', 'per_image',  2,  1, (strftime('%s','now') * 1000)),
  ('pb_v1_img_gpt2',          1, 'image',              'gpt_image_2',       'per_image',  4,  1, (strftime('%s','now') * 1000)),
  ('pb_v1_img_nb2',           1, 'image',              'nano_banana_2',     'per_image',  4,  1, (strftime('%s','now') * 1000)),
  ('pb_v1_img_soul',          1, 'image',              'soul_2',            'per_image',  6,  1, (strftime('%s','now') * 1000)),
  ('pb_v1_pose',              1, 'pose',               NULL,                'per_image',  3,  1, (strftime('%s','now') * 1000)),
  ('pb_v1_sheet',             1, 'sheet',              NULL,                'per_sheet',  6,  1, (strftime('%s','now') * 1000)),
  ('pb_v1_video_std',         1, 'video',              'seedance_2_0',      'per_clip',   20, 1, (strftime('%s','now') * 1000)),
  ('pb_v1_video_extra_sec',   1, 'video_extra_second', 'seedance_2_0',      'per_second', 2,  1, (strftime('%s','now') * 1000)),
  ('pb_v1_video_4k_upscale',  1, 'video_4k_upscale',   'seedance_2_0',      'per_clip',   10, 1, (strftime('%s','now') * 1000));
