import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogHeader,
  Layout,
  LayoutContent,
  LayoutFooter,
  SelectableCard,
  Button,
  Badge,
  Text,
  VStack,
  HStack,
} from '@astryxdesign/core'
import { api } from '../api/client'

// Credit / paywall modal (PRD §15.3). Opened from the credit chip ("Buy credits") or when a
// generation is short on credits (pass `needed`). Buying a pack goes straight to the Polar
// hosted checkout; plan upgrades route through /pricing.
const PACKS = [
  { key: 'small', c: 500, label: '500', price: '$21.99', per: '$0.044/cr' },
  { key: 'medium', c: 1500, label: '1,500', price: '$59.99', per: '$0.040/cr', best: true },
  { key: 'large', c: 5000, label: '5,000', price: '$171.99', per: '$0.034/cr' },
]

export default function PaywallModal({ balance, needed, onClose }) {
  const navigate = useNavigate()
  const [sel, setSel] = useState(1)
  const [busy, setBusy] = useState(false)
  const pack = PACKS[sel]
  const total = balance?.total ?? 0
  const short = needed != null ? needed - total : null
  const title = needed != null ? 'Not enough credits' : 'Buy credits'
  const subtitle = needed != null
    ? `This generation needs ${needed} credits. Top up to keep going — you're only charged for successful generations.`
    : 'Credits power every prompt, image, and video. Top up anytime — you\'re only charged for successful generations.'

  const close = () => onClose?.()

  const go = async () => {
    if (busy) return
    setBusy(true)
    try {
      const { url } = await api.billing.checkout(pack.key)
      window.location.assign(url)
    } catch (e) {
      console.warn('checkout unavailable:', e)
      setBusy(false)
      onClose?.()
      navigate('/pricing')
    }
  }

  const goPricing = () => {
    onClose?.()
    navigate('/pricing')
  }

  return (
      <Dialog
        isOpen
        onOpenChange={(open) => { if (!open) close() }}
        purpose="info"
        width={440}
        maxHeight="90vh"
        padding={0}
      >
        <Layout
          height="auto"
          header={
            <DialogHeader
              title={title}
              subtitle={subtitle}
              onOpenChange={(open) => { if (!open) close() }}
              hasDivider
            />
          }
          content={
            <LayoutContent padding={4} isScrollable={false}>
              <VStack gap={3}>
                <HStack
                  justify="between"
                  align="center"
                  gap={2}
                  style={{
                    background: 'var(--color-background-muted, var(--bg-secondary))',
                    border: '1px solid var(--color-border, var(--border))',
                    borderRadius: 10,
                    padding: '12px 14px',
                  }}
                >
                  <Text type="body" size="sm" color="secondary">
                    Balance{' '}
                    <Text type="body" size="sm" weight="bold" color="primary" display="inline">
                      {total}
                    </Text>
                    {needed != null && (
                      <>
                        {' '}· need{' '}
                        <Text type="body" size="sm" weight="bold" color="primary" display="inline">
                          {needed}
                        </Text>
                      </>
                    )}
                  </Text>
                  {short != null && short > 0 && (
                    <Text type="body" size="sm" weight="bold" color="accent">
                      −{short}
                    </Text>
                  )}
                </HStack>

                <Text
                  type="supporting"
                  size="xsm"
                  weight="bold"
                  color="secondary"
                  style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}
                >
                  Buy a credit pack
                </Text>

                <VStack gap={2}>
                  {PACKS.map((p, i) => {
                    const on = i === sel
                    return (
                      <SelectableCard
                        key={p.key}
                        label={`${p.label} credits for ${p.price}`}
                        isSelected={on}
                        onChange={(selected) => { if (selected) setSel(i) }}
                        padding={3}
                      >
                        <HStack justify="between" align="center" gap={2}>
                          <HStack gap={2} align="center">
                            <Text type="body" weight="bold">{p.label}</Text>
                            {p.best ? (
                              <Badge label="Best value" variant="success" />
                            ) : (
                              <Text type="supporting" size="xsm" color="secondary">
                                · {p.per}
                              </Text>
                            )}
                          </HStack>
                          <Text type="body" weight="bold">{p.price}</Text>
                        </HStack>
                      </SelectableCard>
                    )
                  })}
                </VStack>
              </VStack>
            </LayoutContent>
          }
          footer={
            <LayoutFooter hasDivider padding={4}>
              <VStack gap={2} width="100%">
                <Button
                  label={busy ? 'Redirecting to checkout…' : `Buy ${pack.label} credits · ${pack.price}`}
                  variant="primary"
                  size="lg"
                  isDisabled={busy}
                  isLoading={busy}
                  onClick={go}
                  style={{ width: '100%' }}
                />
                <Button
                  label="Or upgrade to Pro — 1,800 credits / mo →"
                  variant="secondary"
                  size="md"
                  onClick={goPricing}
                  style={{ width: '100%' }}
                />
                <Button
                  label="Maybe later"
                  variant="ghost"
                  size="sm"
                  onClick={close}
                  style={{ width: '100%' }}
                />
                <Text type="supporting" size="xsm" color="secondary" justify="center" display="block">
                  🔒 Secure checkout via Polar
                </Text>
              </VStack>
            </LayoutFooter>
          }
        />
      </Dialog>
  )
}
