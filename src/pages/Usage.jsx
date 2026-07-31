import { useEffect, useMemo, useState } from 'react'
import { useUser, useClerk } from '@clerk/react'
import {
  Card,
  Text,
  Button,
  Banner,
  SegmentedControl,
  SegmentedControlItem,
  VStack,
  HStack,
  EmptyState,
} from '@astryxdesign/core'
import { api } from '../api/client'
import { describeEntry, fmtWhen, collapseResolvedHolds } from '../ui/ledgerLabels'
import AstryxScope from '../ui/ax/AstryxScope'
import RouterLink from '../ui/ax/RouterLink'
import { useSEO } from '../ui/seo'

// Usage & credit history (PRD §15, FR-C11). Money truth stays server-side — this page only reads.
// UI: Astryx Card / Banner / SegmentedControl (pilot 6).

const PAGE_SIZE = 50

async function withRetry(fn, tries = 4) {
  let lastErr
  for (let i = 0; i < tries; i++) {
    try { return await fn() } catch (e) {
      lastErr = e
      if (i < tries - 1) await new Promise((r) => setTimeout(r, 600 * (i + 1)))
    }
  }
  throw lastErr
}

const FILTERS = [
  { key: 'all', kind: null, label: 'All activity' },
  { key: 'spend', kind: 'spend', label: 'Spent' },
  { key: 'grant', kind: 'grant', label: 'Added' },
  { key: 'release', kind: 'release', label: 'Refunds' },
]

export default function Usage() {
  useSEO({ path: '/usage' })

  const { isLoaded, isSignedIn } = useUser()
  const clerk = useClerk()
  const [balance, setBalance] = useState(null)
  const [entries, setEntries] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [more, setMore] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const kind = FILTERS.find((f) => f.key === filter)?.kind ?? null

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let alive = true
    setError(null)
    withRetry(() => api.credits())
      .then((b) => { if (alive) setBalance(b) })
      .catch((e) => { if (alive) setError(e?.status === 401 ? 'auth' : 'load') })
    return () => { alive = false }
  }, [isLoaded, isSignedIn, reloadKey])

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    let alive = true
    setLoading(true)
    setEntries([])
    withRetry(() => api.ledger(`?limit=${PAGE_SIZE}${kind ? `&kind=${kind}` : ''}`))
      .then((r) => {
        if (!alive) return
        setEntries(r.entries)
        setMore(r.entries.length === PAGE_SIZE)
        setLoading(false)
      })
      .catch((e) => { if (alive) { setLoading(false); setError((cur) => cur || (e?.status === 401 ? 'auth' : 'load')) } })
    return () => { alive = false }
  }, [isLoaded, isSignedIn, kind, reloadKey])

  async function loadMore() {
    try {
      const r = await api.ledger(`?limit=${PAGE_SIZE}&offset=${entries.length}${kind ? `&kind=${kind}` : ''}`)
      setEntries((cur) => [...cur, ...r.entries])
      setMore(r.entries.length === PAGE_SIZE)
    } catch { setMore(false) }
  }

  const visible = useMemo(() => collapseResolvedHolds(entries), [entries])

  async function exportCsv() {
    setExporting(true)
    try {
      let all = []
      for (let offset = 0; offset < 2000; offset += 200) {
        const r = await api.ledger(`?limit=200&offset=${offset}`)
        all = all.concat(r.entries)
        if (r.entries.length < 200) break
      }
      const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const rows = [
        ['date', 'event', 'description', 'credits', 'balance_after', 'bucket', 'reference_type', 'reference_id'],
        ...all.map((e) => {
          const d = describeEntry(e)
          return [new Date(e.created_at).toISOString(), e.kind, `${d.title}${d.detail ? ` — ${d.detail}` : ''}`, e.amount, e.balance_after, e.bucket, e.ref_type, e.ref_id]
        }),
      ]
      const blob = new Blob([rows.map((r) => r.map(esc).join(',')).join('\n')], { type: 'text/csv' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `vymotion-credit-history-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch { /* transient */ }
    setExporting(false)
  }

  if (!isLoaded) {
    return <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'transparent' }} />
  }

  if (!isSignedIn) {
    return (
      <AstryxScope>
        <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'transparent' }}>
          <Card className="reveal" padding={8} style={{ maxWidth: 520, margin: '60px auto 0', textAlign: 'center' }}>
            <Text type="display-3" weight="bold" display="block">Usage & credits</Text>
            <Text type="body" size="sm" color="secondary" display="block" style={{ margin: '10px 0 20px', lineHeight: 1.6 }}>
              Sign in to see your credit balance, every generation you've run, and your full purchase history.
            </Text>
            <Button label="Log in" variant="primary" size="md" onClick={() => clerk.openSignIn?.()} />
          </Card>
        </div>
      </AstryxScope>
    )
  }

  const stats = [
    { label: 'Available', value: balance?.total, hint: 'Ready to spend' },
    { label: 'Plan credits', value: balance?.subscription_vc, hint: 'Reset each billing cycle' },
    { label: 'Top-up credits', value: balance?.topup_vc, hint: 'Valid 12 months · spent last' },
    { label: 'Reserved', value: balance?.held, hint: 'Generations in progress' },
  ]

  return (
    <AstryxScope>
      <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'transparent' }}>
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 24px 70px' }}>
          <div className="reveal" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text
                type="supporting"
                size="xsm"
                weight="bold"
                color="secondary"
                display="block"
                style={{ textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}
              >
                Ledger
              </Text>
              <Text type="display-2" weight="bold" display="block" style={{ letterSpacing: '-1px', lineHeight: 1.05 }}>
                Usage & credits
              </Text>
              <Text type="body" size="sm" color="secondary" display="block" style={{ marginTop: 7 }}>
                Every credit in and out — you're only ever charged for delivered generations.
              </Text>
            </div>
            <Button label="Buy credits" variant="primary" size="md" href="/pricing" as={RouterLink} />
          </div>

          {error && (
            <div className="reveal-1" style={{ margin: '20px 0 0' }}>
              <Banner
                status="error"
                title={error === 'auth' ? 'Your session needs a refresh' : "Couldn't load your credits"}
                description={
                  error === 'auth'
                    ? 'Sign in again to reconnect, or retry — your balance and history are safe.'
                    : 'A network hiccup stopped this from loading. Your balance and history are safe — try again.'
                }
                endContent={
                  <Button
                    label="Retry"
                    variant="primary"
                    size="sm"
                    onClick={() => { setError(null); setBalance(null); setReloadKey((k) => k + 1) }}
                  />
                }
              />
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, margin: '20px 0 26px' }} className="usage-stats reveal-1">
            {stats.map((s) => (
              <Card key={s.label} padding={4}>
                <Text type="supporting" size="xsm" weight="bold" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {s.label}
                </Text>
                <Text type="display-3" weight="bold" display="block" hasTabularNumbers style={{ letterSpacing: '-0.5px', margin: '4px 0 2px' }}>
                  {s.value ?? '…'}
                </Text>
                <Text type="supporting" size="xsm" color="secondary">{s.hint}</Text>
              </Card>
            ))}
          </div>

          <HStack justify="between" align="center" gap={2} style={{ flexWrap: 'wrap', marginBottom: 12 }}>
            <SegmentedControl
              label="Activity filter"
              value={filter}
              onChange={setFilter}
              size="sm"
            >
              {FILTERS.map((f) => (
                <SegmentedControlItem key={f.key} value={f.key} label={f.label} />
              ))}
            </SegmentedControl>
            <Button
              label={exporting ? 'Exporting…' : 'Export CSV'}
              variant="secondary"
              size="sm"
              isLoading={exporting}
              isDisabled={exporting}
              onClick={exportCsv}
            />
          </HStack>

          <Card className="reveal-2" padding={0} style={{ overflow: 'hidden' }}>
            {loading ? (
              <VStack gap={2} align="center" style={{ padding: 28 }}>
                <div className="blob-loader" />
                <Text type="body" size="sm" color="secondary">Loading your history…</Text>
              </VStack>
            ) : visible.length === 0 ? (
              <div style={{ padding: 28 }}>
                <EmptyState
                  title="Nothing here yet"
                  description="Your credit activity will appear as soon as you generate something."
                />
              </div>
            ) : (
              visible.map((e, i) => {
                const d = describeEntry(e)
                const plus = e.amount > 0
                return (
                  <HStack
                    key={e.id}
                    justify="between"
                    align="center"
                    gap={3}
                    style={{
                      padding: '13px 18px',
                      borderTop: i === 0 ? 'none' : '1px solid var(--color-border, var(--border-subtle))',
                    }}
                  >
                    <HStack gap={3} align="center" style={{ minWidth: 0, flex: 1 }}>
                      <div style={{
                        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: d.tone === 'plus' ? 'rgba(199,242,78,0.12)' : 'var(--bg-tertiary)',
                        color: d.tone === 'plus' ? 'var(--brand)' : 'var(--text-secondary)',
                      }}>
                        {d.tone === 'plus' ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                        ) : e.kind === 'hold' ? (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 3" /></svg>
                        ) : (
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M5 12h14" /></svg>
                        )}
                      </div>
                      <VStack gap={0} style={{ minWidth: 0, flex: 1 }}>
                        <Text type="body" size="sm" weight="bold" maxLines={1}>{d.title}</Text>
                        {d.detail && (
                          <Text type="supporting" size="xsm" color="secondary" maxLines={1}>{d.detail}</Text>
                        )}
                      </VStack>
                    </HStack>
                    <VStack gap={0} align="end" style={{ flexShrink: 0 }}>
                      <Text
                        type="body"
                        size="sm"
                        weight="bold"
                        hasTabularNumbers
                        color={plus ? 'accent' : d.tone === 'muted' ? 'secondary' : 'primary'}
                      >
                        {plus ? '+' : ''}{e.amount}
                      </Text>
                      <Text type="supporting" size="xsm" color="secondary">
                        {fmtWhen(e.created_at)} · bal {e.balance_after}
                      </Text>
                    </VStack>
                  </HStack>
                )
              })
            )}
            {more && !loading && (
              <Button
                label="Load more"
                variant="ghost"
                size="md"
                onClick={loadMore}
                style={{ width: '100%', borderRadius: 0, borderTop: '1px solid var(--color-border, var(--border-subtle))' }}
              />
            )}
          </Card>

          <Card className="reveal-3" padding={4} style={{ marginTop: 22 }}>
            <Text
              type="supporting"
              size="xsm"
              weight="bold"
              color="secondary"
              display="block"
              style={{ textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}
            >
              How credits work
            </Text>
            <HStack gap={4} style={{ flexWrap: 'wrap', marginBottom: 12 }}>
              {[['1 prompt', '1 credit'], ['1 image', '4 credits'], ['1 pose preview', '3 credits'], ['1 video clip', '20 credits']].map(([k, v]) => (
                <HStack key={k} gap={1.5} align="center">
                  <span style={{ width: 6, height: 6, background: 'var(--brand)', boxShadow: '0 0 8px rgba(199,242,78,0.7)', borderRadius: 1 }} />
                  <Text type="body" size="sm" color="secondary">
                    {k} ≈ <Text type="body" size="sm" weight="bold" color="primary" display="inline">{v}</Text>
                  </Text>
                </HStack>
              ))}
            </HStack>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--color-text-secondary, var(--text-secondary))', lineHeight: 1.8 }}>
              <li>Credits are <b>reserved</b> when a generation starts and only <b>charged when it's delivered</b> — failed, filtered, or timed-out generations are automatically refunded.</li>
              <li>Plan credits are spent first, then top-up credits.</li>
              <li>Plan credits reset at each billing cycle; top-up credits last 12 months.</li>
              <li>Purchases and plan renewals appear here the moment payment is confirmed.</li>
            </ul>
          </Card>
        </div>

        <style>{`
          @media (max-width: 720px) { .usage-stats { grid-template-columns: repeat(2, 1fr) !important; } }
        `}</style>
      </div>
    </AstryxScope>
  )
}
