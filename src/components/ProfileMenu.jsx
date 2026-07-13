import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser, useClerk } from '@clerk/react'
import {
  User,
  Settings,
  ShieldCheck,
  Users,
  LogOut,
  Gem,
  ChevronRight,
} from 'lucide-react'
import {
  Popover,
  Avatar,
  Card,
  Text,
  Button,
  Badge,
  ProgressBar,
  Divider,
  VStack,
  HStack,
} from '@astryxdesign/core'
import { api } from '../api/client'
import { useCredits } from '../api/creditsStore'
import PaywallModal from './PaywallModal'

// Account popup (replaces Clerk's bare <UserButton>). Absorbs the credit balance
// as a "Credits" row and Settings entry so the nav stays clean. Theme toggle
// lives on the Settings page, not here.
//
// UI: Astryx Popover + Avatar + ProgressBar (pilot 2).

const COMMUNITY_URL = 'https://discord.gg/vymotion'

// Monthly plan grants — matches Dashboard.PLAN_CREDITS; used to fill the credit bar.
const PLAN_MONTHLY = { free: 0, starter: 200, creator: 600, pro: 1800, studio: 5500 }

const iconProps = { size: 18, strokeWidth: 1.8, 'aria-hidden': true }

function MenuRow({ icon, label, onClick, danger }) {
  return (
    <Button
      label={label}
      variant="ghost"
      size="md"
      icon={icon}
      onClick={onClick}
      style={{
        width: '100%',
        justifyContent: 'flex-start',
        color: danger ? 'var(--color-error, var(--accent-2))' : undefined,
      }}
    />
  )
}

export default function ProfileMenu() {
  const { user } = useUser()
  const clerk = useClerk()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [paywall, setPaywall] = useState(false)
  const { bal, total: creditTotal, refresh: refreshCredits } = useCredits()
  const [plan, setPlan] = useState(null)

  // Plan is separate (less hot); credits come from the shared store and auto-refresh.
  useEffect(() => {
    if (!user) return
    let alive = true
    api.billing.plan().then((p) => { if (alive) setPlan(p) }).catch(() => {})
    return () => { alive = false }
  }, [user])

  if (!user) return null

  const planKey = plan?.plan || 'free'
  const planName = planKey.charAt(0).toUpperCase() + planKey.slice(1)
  const isFree = planKey === 'free'
  const total = creditTotal
  const monthly = PLAN_MONTHLY[planKey] || PLAN_MONTHLY.free || 1
  const subVc = bal?.subscription_vc ?? 0
  const pct = monthly > 0 ? Math.max(0, Math.min(100, (subVc / monthly) * 100)) : 0

  const username =
    user.username ||
    user.firstName ||
    user.primaryEmailAddress?.emailAddress?.split('@')[0] ||
    'Account'

  const go = (path) => { setOpen(false); navigate(path) }
  const signOut = () => { setOpen(false); clerk.signOut({ redirectUrl: '/' }) }
  const manageAccount = () => { setOpen(false); clerk.openUserProfile() }

  const content = (
    <Card className="vy-ax-panel" padding={2} variant="transparent">
      <VStack gap={2}>
        {/* Header */}
        <HStack gap={3} align="center" style={{ padding: '6px 8px 4px' }}>
          <Avatar
            src={user.imageUrl || undefined}
            name={username}
            size={40}
            alt={username}
          />
          <VStack gap={0} style={{ minWidth: 0, flex: 1 }}>
            <Text type="body" weight="bold" maxLines={1}>{username}</Text>
            <Text type="supporting" size="xsm" color="secondary">{planName} Plan</Text>
          </VStack>
        </HStack>

        {/* Credits bar */}
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            setPaywall(true)
            refreshCredits().catch(() => {})
          }}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            cursor: 'pointer',
            background: 'var(--color-background-muted, var(--bg-secondary))',
            border: '1px solid var(--color-border, var(--border))',
            borderRadius: 10,
            padding: '10px 12px',
            fontFamily: 'inherit',
          }}
        >
          <HStack justify="between" align="center" gap={2}>
            <Text type="body" size="sm" weight="semibold">Credits</Text>
            <HStack gap={1} align="center">
              <Text type="body" size="sm" weight="bold" hasTabularNumbers>
                {total == null ? '…' : `${total.toLocaleString()} left`}
              </Text>
              <ChevronRight size={15} strokeWidth={2} aria-hidden style={{ opacity: 0.55 }} />
            </HStack>
          </HStack>
          <div style={{ marginTop: 8 }}>
            <ProgressBar
              label="Plan credits remaining"
              isLabelHidden
              value={pct}
              max={100}
              variant="accent"
            />
          </div>
        </button>

        {/* Go Premium */}
        {isFree && (
          <Button
            label="Go Premium"
            variant="secondary"
            size="md"
            icon={<Gem size={17} strokeWidth={1.7} aria-hidden />}
            endContent={<Badge label="Upgrade" variant="success" />}
            onClick={() => go('/pricing')}
            style={{ width: '100%', justifyContent: 'flex-start' }}
          />
        )}

        <Divider variant="subtle" />

        <VStack gap={0.5}>
          <MenuRow
            icon={<User {...iconProps} />}
            label="View profile"
            onClick={() => go('/dashboard')}
          />
          <MenuRow
            icon={<Settings {...iconProps} />}
            label="Settings"
            onClick={() => go('/settings')}
          />
          <MenuRow
            icon={<ShieldCheck {...iconProps} />}
            label="Manage account"
            onClick={manageAccount}
          />
          {COMMUNITY_URL && (
            <MenuRow
              icon={<Users {...iconProps} />}
              label="Join community"
              onClick={() => {
                setOpen(false)
                window.open(COMMUNITY_URL, '_blank', 'noopener')
              }}
            />
          )}
        </VStack>

        <Divider variant="subtle" />

        <MenuRow
          icon={<LogOut {...iconProps} />}
          label="Sign out"
          onClick={signOut}
          danger
        />
      </VStack>
    </Card>
  )

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', marginLeft: 4 }}>
      <Popover
        isOpen={open}
        onOpenChange={setOpen}
        placement="below"
        alignment="end"
        width={300}
        label="Account menu"
        hasAutoFocus={false}
        content={<div className="vy-ax-popover-flush">{content}</div>}
      >
        {(triggerProps) => (
          <button
            type="button"
            {...triggerProps}
            aria-label="Account menu"
            className="liquid-press"
            style={{
              width: 34,
              height: 34,
              borderRadius: '50%',
              padding: 0,
              cursor: 'pointer',
              border: '1px solid var(--border)',
              background: 'transparent',
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: open ? '0 0 0 2px rgba(199,242,78,0.45)' : 'none',
              transition: 'box-shadow 0.15s var(--ease-out)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Avatar
              src={user.imageUrl || undefined}
              name={username}
              size={32}
              alt={username}
            />
          </button>
        )}
      </Popover>

      {paywall && (
        <PaywallModal
          balance={bal}
          onClose={() => setPaywall(false)}
        />
      )}
    </div>
  )
}
