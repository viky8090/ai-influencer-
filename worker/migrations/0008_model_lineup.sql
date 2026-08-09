-- Vymotion D1 — migration 0008: price rows for the expanded fal.ai model lineup
-- (Seedream 4 + FLUX Krea images; Seedance Pro / Kling 2.5 Pro / Veo 3 Fast / Sora 2 video).
-- ⚠︎CALIBRATE (VC retail ≈ $0.02/VC, PRD §5 targets ≥60% blended gross margin):
--   seedream_4    ~$0.03/img COGS  → 4 VC ($0.08, ~62% margin)
--   flux_krea     ~$0.025/img COGS → 3 VC ($0.06, ~58%)
--   seedance_pro  ~$0.62/5s@1080p  → 50 VC ($1.00, ~38% — thin; watch real usage mix)
--   kling_2_5_pro ~$0.35/5s        → 45 VC ($0.90, ~61%; 10s clips halve the margin — the
--                                    clip price is flat regardless of duration for now)
--   veo_3_fast    ~$1.20/8s w/audio → 90 VC ($1.80, ~33% — premium loss-tolerant tier; raise
--                                    to 150 VC if volume materializes)
--   sora_2        ~$0.10/s → 4-8s   → 50 VC ($1.00, ~20-60% depending on duration tier)
-- Reprice anytime with UPDATE price_book SET cost_vc=… (data, not code — no deploy needed).

INSERT INTO price_book (id, version, operation, model, unit, cost_vc, active, created_at) VALUES
  ('pb_v1_img_seedream4',      1, 'image', 'seedream_4',    'per_image', 4,  1, (strftime('%s','now') * 1000)),
  ('pb_v1_img_krea',           1, 'image', 'flux_krea',     'per_image', 3,  1, (strftime('%s','now') * 1000)),
  ('pb_v1_video_seedance_pro', 1, 'video', 'seedance_pro',  'per_clip',  50, 1, (strftime('%s','now') * 1000)),
  ('pb_v1_video_kling25',      1, 'video', 'kling_2_5_pro', 'per_clip',  45, 1, (strftime('%s','now') * 1000)),
  ('pb_v1_video_veo3_fast',    1, 'video', 'veo_3_fast',    'per_clip',  90, 1, (strftime('%s','now') * 1000)),
  ('pb_v1_video_sora2',        1, 'video', 'sora_2',        'per_clip',  50, 1, (strftime('%s','now') * 1000));
