import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Text,
  Button,
  VStack,
  HStack,
  Divider,
} from '@astryxdesign/core'
import { api } from '../api/client'
import { describeEntry, fmtDate, fmtWhen, collapseResolvedHolds, PLAN_NAMES } from '../ui/ledgerLabels'

// Info-first credits panel, shown in an Astryx Popover from CreditChip.
// Answers "how many do I have and where did they go?" — balance hero, plan/top-up
// breakdown, recent activity — with purchase actions in a compact bottom row.
// (PaywallModal still owns purchase intent.)
export default function CreditsPanel({ bal, total, onClose, onBuy }) {
  const navigate = useNavigate()
  const [recent, setRecent] = useState(null) // null = loading, [] = empty
  const [plan, setPlan] = useState(null)

  useEffect(() => {
    let alive = true
    // Over-fetch slightly so collapsing resolved holds still leaves 5 rows.
    api.ledger('?limit=12')
      .then((r) => { if (alive) setRecent(collapseResolvedHolds(r.entries).slice(0, 5)) })
      .catch(() => { if (alive) setRecent([]) })
    api.billing.plan()
      .then((p) => { if (alive) setPlan(p) })
      .catch(() => {})
    return () => { alive = false }
  }, [])

  const planKey = plan?.plan || 'free'
  const isFree = planKey === 'free'
  const planName = PLAN_NAMES[planKey] || 'Free'
  const resetAt = plan?.subscription?.current_period_end
  const held = bal?.held ?? 0

  const go = (path) => { onClose?.(); navigate(path) }

  const toneColor = {
    plus: 'var(--color-accent, var(--brand))',
    minus: 'var(--color-text-primary, var(--text-primary))',
    muted: 'var(--color-text-secondary, var(--text-tertiary))',
  }

  return (
    <Card className="vy-ax-panel" padding={4} variant="transparent">
      <VStack gap={3}>
        {/* Hero */}
        <VStack gap={0.5}>
          <Text
            type="supporting"
            size="xsm"
            weight="bold"
            color="secondary"
            style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
          >
            Credits
          </Text>
          <HStack gap={2} align="end">
            <Text type="display-3" weight="bold" color="primary" hasTabularNumbers style={{ letterSpacing: '-1px', lineHeight: 1.1 }}>
              {total == null ? '…' : total.toLocaleString()}
            </Text>
            <Text type="supporting" size="sm" color="secondary" style={{ paddingBottom: 4 }}>
              available
            </Text>
          </HStack>
          {held > 0 && (
            <Text type="supporting" size="xsm" color="secondary">
              {held.toLocaleString()} reserved for generations in progress
            </Text>
          )}
        </VStack>

        {/* Breakdown */}
        <VStack gap={1.5}>
          <BreakdownRow
            label={`${planName} plan credits`}
            value={bal?.subscription_vc}
            hint={isFree ? 'no monthly refill on Free' : resetAt ? `resets ${fmtDate(resetAt)}` : 'reset each cycle'}
          />
          <BreakdownRow
            label="Top-up credits"
            value={bal?.topup_vc}
            hint="spent last · valid 12 mo"
          />
        </VStack>

        <Divider variant="subtle" />

        {/* Recent activity */}
        <VStack gap={1}>
          <Text
            type="supporting"
            size="xsm"
            weight="bold"
            color="secondary"
            style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
          >
            Recent activity
          </Text>

          {recent == null && (
            <Text type="supporting" size="sm" color="secondary">Loading…</Text>
          )}
          {recent?.length === 0 && (
            <Text type="supporting" size="sm" color="secondary">
              No activity yet — it shows up as soon as you generate something.
            </Text>
          )}
          {recent?.map((e) => {
            const d = describeEntry(e)
            return (
              <HStack key={e.id} justify="between" align="center" gap={2}>
                <VStack gap={0} style={{ minWidth: 0, flex: 1 }}>
                  <Text type="body" size="sm" weight="semibold" maxLines={1}>
                    {d.title}
                  </Text>
                  <Text type="supporting" size="xsm" color="secondary">
                    {fmtWhen(e.created_at)}
                  </Text>
                </VStack>
                <Text
                  type="body"
                  size="sm"
                  weight="bold"
                  hasTabularNumbers
                  style={{ color: toneColor[d.tone], flexShrink: 0 }}
                >
                  {e.amount > 0 ? `+${e.amount.toLocaleString()}` : e.amount.toLocaleString()}
                </Text>
              </HStack>
            )
          })}

          <Button
            label="View all usage →"
            variant="ghost"
            size="sm"
            onClick={() => go('/usage')}
            style={{ alignSelf: 'flex-start' }}
          />
        </VStack>

        <Divider variant="subtle" />

        {/* Actions */}
        <HStack gap={2}>
          <Button
            label="Buy credits"
            variant="primary"
            size="md"
            onClick={() => { onClose?.(); onBuy?.() }}
            style={{ flex: 1 }}
          />
          <Button
            label={isFree ? 'Upgrade' : 'Manage plan'}
            variant="secondary"
            size="md"
            onClick={() => go(isFree ? '/pricing' : '/settings')}
            style={{ flex: 1 }}
          />
        </HStack>
      </VStack>
    </Card>
  )
}

function BreakdownRow({ label, value, hint }) {
  return (
    <Card padding={2.5} variant="muted">
      <HStack justify="between" align="center" gap={2}>
        <VStack gap={0} style={{ minWidth: 0, flex: 1 }}>
          <Text type="body" size="sm" weight="semibold">{label}</Text>
          {hint && (
            <Text type="supporting" size="xsm" color="secondary">{hint}</Text>
          )}
        </VStack>
        <Text type="body" size="sm" weight="bold" hasTabularNumbers>
          {value == null ? '…' : value.toLocaleString()}
        </Text>
      </HStack>
    </Card>
  )
}
