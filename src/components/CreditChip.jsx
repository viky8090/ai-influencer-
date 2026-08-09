import { useEffect, useState } from 'react'
import { useAuth } from '@clerk/react'
import { Token, Popover } from '@astryxdesign/core'
import { useCredits } from '../api/creditsStore'
import CreditsPanel from './CreditsPanel'
import PaywallModal from './PaywallModal'

// Live credit balance in the nav (PRD §10.4 FR-C9).
// Click → CreditsPanel popover; 402 → PaywallModal via `vymotion:paywall`.
export default function CreditChip() {
  const { isSignedIn } = useAuth()
  const { bal, total, loading, err, stale, refresh } = useCredits()
  const [panel, setPanel] = useState(false)
  const [paywall, setPaywall] = useState(false)
  const [needed, setNeeded] = useState(null)

  useEffect(() => {
    function onPaywall(e) {
      setPanel(false)
      setNeeded(e.detail?.needed ?? null)
      setPaywall(true)
    }
    window.addEventListener('vymotion:paywall', onPaywall)
    return () => window.removeEventListener('vymotion:paywall', onPaywall)
  }, [])

  if (!isSignedIn) return null

  let label = '…'
  if (err && total == null) label = '— cr'
  else if (total != null) label = `${total} cr`
  else if (loading) label = '…'
  else label = '0 cr'

  const title = err
    ? "Couldn't load balance — retrying…"
    : stale
      ? 'Credits (refreshing…)'
      : 'Vymotion credits'

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Popover
        isOpen={panel}
        onOpenChange={(open) => {
          setPanel(open)
          if (open) refresh().catch(() => {})
        }}
        placement="below"
        alignment="end"
        width={340}
        label="Credits"
        hasAutoFocus={false}
        content={
          <div className="vy-ax-popover-flush">
            <CreditsPanel
              bal={bal}
              total={total}
              onClose={() => setPanel(false)}
              onBuy={() => { setNeeded(null); setPaywall(true) }}
            />
          </div>
        }
      >
        <Token
          className="vy-credit-token liquid-press"
          label={label}
          size="md"
          color="yellow"
          description={title}
          style={{
            opacity: stale ? 0.85 : 1,
            boxShadow: panel
              ? '0 0 0 2px rgba(199,242,78,0.45)'
              : 'none',
            cursor: 'pointer',
            fontWeight: 800,
            transition: 'box-shadow 0.15s var(--ease-out), opacity 0.15s var(--ease-out)',
          }}
          icon={
            <span
              aria-hidden
              style={{
                width: 7,
                height: 7,
                background: 'var(--brand)',
                borderRadius: 2,
                flexShrink: 0,
                display: 'inline-block',
                boxShadow: '0 0 6px rgba(199,242,78,0.5)',
                animation: loading && total == null ? 'pulse 1.2s ease-in-out infinite' : undefined,
              }}
            />
          }
        />
      </Popover>

      {paywall && (
        <PaywallModal
          balance={bal}
          needed={needed}
          onClose={() => { setPaywall(false); setNeeded(null); refresh().catch(() => {}) }}
        />
      )}
    </div>
  )
}
