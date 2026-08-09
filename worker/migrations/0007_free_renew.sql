-- Free-tier monthly refresh (advertised "30 credits / mo"). `free_credits_renew_at` is the
-- epoch-ms timestamp when the user is next due a free grant; the cron sweep (scheduled() in
-- index.js) grants FREE_MONTHLY_CREDITS to free-tier users whose renewal is due and advances it.
ALTER TABLE users ADD COLUMN free_credits_renew_at INTEGER;
CREATE INDEX idx_users_free_renew ON users(free_credits_renew_at);

-- Backfill existing users so they enter the monthly cycle ~30 days out (2592000000 ms).
UPDATE users SET free_credits_renew_at = (strftime('%s','now') * 1000) + 2592000000
WHERE free_credits_renew_at IS NULL;
