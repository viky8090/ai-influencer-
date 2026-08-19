import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  PageShell, SectionCard, Row, Divider, Button, Badge, Avatar,
  Modal, ConfirmDialog, Segmented, useToast, formatDate,
  ACCENT, DANGER, WARN,
} from '../components/ui'
import {
  IconInfo, IconAlert, IconRefresh, IconDownload, IconUpload, IconDatabase,
  IconPlug, IconKey, IconTrash, IconEdit, IconLock, IconSettings,
} from '../components/icons'
import { useInfluencers, useProfile } from '../store'
import { computeStats } from '../utils/accountStats'
import {
  readStorageUsage, formatBytes, downloadBackup, restoreBackup, readBackupFile, wipeAllData,
} from '../utils/accountData'
import { isHFConnected } from '../utils/higgsfieldAuth'

/*
 * Manage account.
 *
 * There is no account server and no login: the user's account *is* the
 * localStorage of this browser. That is currently invisible, which makes it
 * frightening — this page makes it concrete (what is stored, how full it is),
 * safe (one-click backup, restore with an explicit merge/replace choice), and
 * manageable (a danger zone that cannot be triggered by accident).
 */

const CLAUDE_KEY = 'claude_api_key'

function readClaudeKey() {
  try { return localStorage.getItem(CLAUDE_KEY) || '' } catch { return '' }
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : (many || one + 's')}`
}

// Tinted note box. Colours are derived from the exported constants with an
// alpha suffix, so they read correctly on both the light and dark surface.
function Callout({ tone = 'info', icon, children }) {
  const color = tone === 'danger' ? DANGER : tone === 'warn' ? WARN : ACCENT
  return (
    <div style={{
      display: 'flex', gap: 11, alignItems: 'flex-start',
      padding: '13px 15px', borderRadius: 12,
      background: `${color}14`, border: `1px solid ${color}33`,
    }}>
      <span style={{ color, display: 'flex', flexShrink: 0, marginTop: 1 }}>{icon}</span>
      <div style={{ fontSize: 13.5, lineHeight: 1.6, color: 'var(--text-secondary)', minWidth: 0 }}>
        {children}
      </div>
    </div>
  )
}

const paragraph = {
  fontSize: 14, lineHeight: 1.65, color: 'var(--text-secondary)',
}

export default function Account() {
  const toast = useToast()
  const [influencers] = useInfluencers()
  const { profile } = useProfile()

  const [usage, setUsage] = useState(() => readStorageUsage())
  const [hfConnected, setHfConnected] = useState(() => {
    try { return isHFConnected() } catch { return false }
  })
  const [claudeKey, setClaudeKey] = useState(readClaudeKey)

  // Restore flow
  const fileRef = useRef(null)
  const [pending, setPending] = useState(null)          // { parsed, name }
  const [restoreMode, setRestoreMode] = useState('merge')
  const [restoreBusy, setRestoreBusy] = useState(false)
  const [restoreResult, setRestoreResult] = useState(null) // { written, skipped }

  // Danger zone
  const [confirmKind, setConfirmKind] = useState(null)  // 'content' | 'everything'
  const [wipeBusy, setWipeBusy] = useState(false)

  const stats = useMemo(() => computeStats(influencers), [influencers])

  const refresh = useCallback(() => {
    setUsage(readStorageUsage())
    try { setHfConnected(isHFConnected()) } catch { setHfConnected(false) }
    setClaudeKey(readClaudeKey())
  }, [])

  useEffect(() => { refresh() }, [refresh])

  // ── Backup ─────────────────────────────────────────────────────

  const handleDownload = useCallback(() => {
    try {
      downloadBackup()
      toast('Backup downloaded')
    } catch (err) {
      toast(err?.message || 'Could not create a backup file.', 'danger')
    }
  }, [toast])

  async function handleFilePicked(e) {
    const input = e.target
    const file = input.files && input.files[0]
    // Reset immediately so picking the same file again still fires onChange.
    input.value = ''
    if (!file) return
    try {
      const parsed = await readBackupFile(file)
      setRestoreResult(null)
      setRestoreMode('merge')
      setPending({ parsed, name: file.name })
    } catch (err) {
      toast(err?.message || 'Could not read that file.', 'danger')
    }
  }

  function closeRestore() {
    if (restoreBusy) return
    setPending(null)
  }

  function confirmRestore() {
    if (!pending) return
    setRestoreBusy(true)
    try {
      const result = restoreBackup(pending.parsed, restoreMode)
      setRestoreResult(result)
      refresh()
      toast(`Restored ${plural(result.written, 'item')}`)
    } catch (err) {
      toast(err?.message || 'Restore failed.', 'danger')
    } finally {
      setRestoreBusy(false)
    }
  }

  // ── Danger zone ────────────────────────────────────────────────

  function runWipe(includeConnections) {
    setWipeBusy(true)
    try {
      wipeAllData({ includeConnections })
      refresh()
      window.location.reload()
    } catch (err) {
      setWipeBusy(false)
      setConfirmKind(null)
      toast(err?.message || 'Could not clear this browser’s storage.', 'danger')
    }
  }

  // ── Derived display values ─────────────────────────────────────

  const displayName = profile.displayName?.trim() || 'Your studio'
  const handle = profile.handle?.trim()

  const pct = usage.percent || 0
  const pctLabel = usage.total > 0 && pct < 1 ? '<1%' : `${Math.round(pct)}%`
  const tone = pct > 85 ? 'danger' : pct >= 60 ? 'warn' : 'success'

  const segments = [
    ...usage.categories.filter(c => c.bytes > 0),
    ...(usage.other > 0
      ? [{ id: 'other', label: 'Other browser data', color: 'var(--text-tertiary)', bytes: usage.other }]
      : []),
  ]

  const atStake = [
    plural(stats.influencerCount, 'influencer'),
    plural(stats.photoCount, 'photo'),
    plural(stats.videoCount, 'video'),
    ...(stats.boardCount ? [plural(stats.boardCount, 'board')] : []),
    ...(stats.dealCount ? [plural(stats.dealCount, 'brand deal')] : []),
  ].join(' · ')

  const backupFooterNote = (
    <Button size="sm" icon={<IconDownload size={15} />} onClick={handleDownload}>
      Download a backup first
    </Button>
  )

  // Backup file summary for the restore modal.
  const parsed = pending?.parsed
  const parsedOk = !!parsed && typeof parsed === 'object' &&
    parsed.format === 'influencer-studio-backup' &&
    !!parsed.data && typeof parsed.data === 'object'
  const itemCount = parsedOk
    ? (Number.isFinite(parsed.keyCount) ? parsed.keyCount : Object.keys(parsed.data).length)
    : 0

  return (
    <PageShell
      title="Manage account"
      subtitle="There is no account server and no password here. Your studio is the data stored in this browser, on this device — this page is where you can see it, back it up, and clear it."
    >
      {/* ── 1. Where your account lives ───────────────────────── */}
      <SectionCard
        id="where"
        title="Where your account lives"
        description="What &ldquo;your account&rdquo; actually means in this app."
      >
        <Callout tone="info" icon={<IconInfo size={17} />}>
          No account server, no password, no sync. Everything you make is written to this
          browser&rsquo;s local storage, on this device only.
        </Callout>

        <p style={{ ...paragraph, marginTop: 16 }}>
          Your influencers, photo and video history, inspiration boards, brand deals and
          settings never leave this machine. Nothing is uploaded to us, and there is no copy
          of your work anywhere else. Generation runs through your own Higgsfield account, so
          images and credits stay yours too.
        </p>
        <p style={{ ...paragraph, marginTop: 12 }}>
          The flip side: clearing site data, browsing privately, or moving to another browser
          or computer means starting over. A backup file is the only way to carry your studio
          across &mdash; which is why the section below exists.
        </p>

        <Divider spacing={20} />

        <Row
          icon={<Avatar src={profile.avatar} name={displayName} size={40} />}
          align="center"
          title={displayName}
          description={handle ? `@${handle} · on this device` : 'Saved on this device'}
          control={
            <Button as={Link} to="/profile" size="sm" icon={<IconEdit size={15} />}>
              Edit profile
            </Button>
          }
        />
      </SectionCard>

      {/* ── 2. Storage ────────────────────────────────────────── */}
      <SectionCard
        id="storage"
        title="Storage"
        description="How much of this browser&rsquo;s local storage your studio is using."
        action={
          <Button size="sm" variant="secondary" icon={<IconRefresh size={15} />} onClick={refresh}>
            Recheck
          </Button>
        }
      >
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          flexWrap: 'wrap', marginBottom: 14,
        }}>
          <span style={{
            width: 30, height: 30, borderRadius: 9, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: `${ACCENT}14`, color: ACCENT,
          }}>
            <IconDatabase size={16} />
          </span>
          <span style={{ fontSize: 17, fontWeight: 650, letterSpacing: '-0.3px' }}>
            {formatBytes(usage.total)} of ~{formatBytes(usage.budget)} used
          </span>
          <Badge tone={tone}>{pctLabel} full</Badge>
        </div>

        <div
          role="img"
          aria-label={`Storage used: ${formatBytes(usage.total)} of about ${formatBytes(usage.budget)}, ${pctLabel} full`}
          style={{
            display: 'flex', width: '100%', height: 10, borderRadius: 999,
            background: 'var(--bg-tertiary)', overflow: 'hidden',
            border: '1px solid var(--border-subtle)',
          }}
        >
          {segments.map(seg => (
            <span
              key={seg.id}
              style={{
                width: `${Math.min(100, (seg.bytes / usage.budget) * 100)}%`,
                minWidth: 2,
                background: seg.color,
              }}
            />
          ))}
        </div>

        {segments.length > 0 ? (
          <ul style={{ listStyle: 'none', margin: '16px 0 0', padding: 0, display: 'grid', gap: 9 }}>
            {segments.map(seg => (
              <li key={seg.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: seg.color,
                }} />
                <span style={{
                  flex: 1, minWidth: 0, fontSize: 13.5, color: 'var(--text-primary)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {seg.label}
                </span>
                <span style={{
                  fontSize: 13, color: 'var(--text-secondary)', flexShrink: 0,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {formatBytes(seg.bytes)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ ...paragraph, marginTop: 16 }}>
            Nothing is stored in this browser yet.
          </p>
        )}

        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-tertiary)', marginTop: 16 }}>
          The 5 MB ceiling is an approximation &mdash; every browser sets its own local storage
          limit, and this counts characters rather than measuring the real quota.
        </p>

        {tone !== 'success' && (
          <div style={{ marginTop: 14 }}>
            <Callout tone={tone} icon={<IconAlert size={17} />}>
              {tone === 'danger'
                ? 'Almost full — new generations may fail to save. Download a backup, then delete influencers or generated images you no longer need.'
                : 'Filling up. Download a backup now, then delete any unused influencers or old generated images.'}
            </Callout>
          </div>
        )}
      </SectionCard>

      {/* ── 3. Backup & restore ───────────────────────────────── */}
      <SectionCard
        id="backup"
        title="Backup &amp; restore"
        description="A single JSON file that holds everything, and the way to bring it back."
      >
        <p style={paragraph}>
          A backup contains every influencer, your photo and video history, inspiration boards,
          brand deals, your profile and your app settings &mdash; the whole studio as one file
          you can keep, sync, or move to another browser.
        </p>

        <div style={{ marginTop: 14 }}>
          <Callout tone="info" icon={<IconLock size={17} />}>
            Your Higgsfield login and Claude API key are deliberately <strong>not</strong>{' '}
            included. The file holds no credentials, so it is safe to email or put in cloud
            storage &mdash; you just reconnect those once after restoring.
          </Callout>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
          <Button variant="primary" icon={<IconDownload size={16} />} onClick={handleDownload}>
            Download backup
          </Button>
          <Button
            variant="secondary"
            icon={<IconUpload size={16} />}
            onClick={() => fileRef.current?.click()}
          >
            Restore from backup
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            onChange={handleFilePicked}
            style={{ display: 'none' }}
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {restoreResult && !pending && (
          <div style={{ marginTop: 18 }}>
            <Callout tone="warn" icon={<IconRefresh size={17} />}>
              {plural(restoreResult.written, 'item')} restored,{' '}
              {restoreResult.skipped} skipped. This page is still showing the data it loaded
              when you opened it &mdash; reload to see the restored studio.
              <span style={{ display: 'block', marginTop: 12 }}>
                <Button size="sm" variant="primary" onClick={() => window.location.reload()}>
                  Reload now
                </Button>
              </span>
            </Callout>
          </div>
        )}
      </SectionCard>

      {/* ── 4. Connections ────────────────────────────────────── */}
      <SectionCard
        id="connections"
        title="Connections"
        description="The two outside services this app can use, and whether this browser is holding credentials for them."
        footer="Connecting, disconnecting and replacing keys all live in Settings. This page only reports what is stored."
      >
        <Row
          icon={<IconPlug size={18} />}
          title="Higgsfield"
          description="Generates every image and video, billed to your own Higgsfield credits."
          control={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {hfConnected
                ? <Badge tone="success" dot>Connected</Badge>
                : <Badge tone="neutral">Not connected</Badge>}
              <Button as={Link} to="/settings#connections" size="sm" icon={<IconSettings size={15} />}>
                Settings
              </Button>
            </div>
          }
        />

        <Divider spacing={18} />

        <Row
          icon={<IconKey size={18} />}
          title="Claude API key"
          description={
            claudeKey
              ? `Optional. Used for the AI writing and image-analysis steps. Stored key ends ···${claudeKey.slice(-4)}`
              : 'Optional. Used for the AI writing and image-analysis steps.'
          }
          control={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              {claudeKey
                ? <Badge tone="success" dot>Connected</Badge>
                : <Badge tone="neutral">Not connected</Badge>}
              <Button as={Link} to="/settings#connections" size="sm" icon={<IconSettings size={15} />}>
                Settings
              </Button>
            </div>
          }
        />
      </SectionCard>

      {/* ── 5. Danger zone ────────────────────────────────────── */}
      {/* `flow-root` contains the card's bottom margin so the spine can be
          measured against it; the vertical inset keeps it inside the card's
          rounded corners. */}
      <div style={{ position: 'relative', display: 'flow-root' }}>
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', left: 0, top: 14, bottom: 34, width: 3,
            borderRadius: '0 3px 3px 0', background: DANGER, zIndex: 1,
          }}
        />
        <SectionCard
          id="danger"
          title="Danger zone"
          description="Permanent deletion. There is no server copy and no undo."
          action={<Badge tone="danger">Irreversible</Badge>}
        >
          <Callout tone="danger" icon={<IconAlert size={17} />}>
            These actions erase data from this browser immediately. Once it is gone, the only
            way back is a backup file you already downloaded.
            <span style={{
              display: 'block', marginTop: 10, color: 'var(--text-primary)', fontWeight: 600,
            }}>
              At stake right now: {atStake}
            </span>
          </Callout>

          <div style={{ marginTop: 16 }}>
            <Button variant="primary" icon={<IconDownload size={16} />} onClick={handleDownload}>
              Download a backup first
            </Button>
          </div>

          <Divider spacing={22} />

          <Row
            icon={<IconTrash size={18} />}
            title="Delete all content"
            description="Removes every influencer, photo and video record, inspiration board, brand deal, your profile and your app settings. Your Higgsfield connection and Claude API key stay."
            control={
              <Button variant="danger" icon={<IconTrash size={15} />} onClick={() => setConfirmKind('content')}>
                Delete content
              </Button>
            }
          />

          <Divider spacing={20} />

          <Row
            icon={<IconLock size={18} />}
            title="Sign out of everything and erase"
            description="Everything above, plus your Higgsfield connection and the stored Claude API key. This browser is left exactly as it was before you first opened the app."
            control={
              <Button variant="dangerSolid" icon={<IconAlert size={15} />} onClick={() => setConfirmKind('everything')}>
                Erase everything
              </Button>
            }
          />
        </SectionCard>
      </div>

      {/* ── Restore modal ─────────────────────────────────────── */}
      <Modal
        open={!!pending}
        onClose={closeRestore}
        width={480}
        title={restoreResult ? 'Backup restored' : 'Restore from backup'}
        description={
          restoreResult
            ? 'The app is still showing the data it loaded when this page opened. Reload to see the restored studio.'
            : 'Check that this is the file you meant, then choose how it should be applied.'
        }
      >
        {restoreResult ? (
          <>
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
              fontSize: 14, lineHeight: 1.6, color: 'var(--text-primary)',
            }}>
              <strong>{plural(restoreResult.written, 'item')} restored</strong>
              {', '}{restoreResult.skipped} skipped.
              <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: 'var(--text-secondary)' }}>
                Items are skipped when they are not part of a studio backup, or &mdash; in Merge
                mode &mdash; when this browser already has its own copy.
              </span>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <Button variant="secondary" onClick={closeRestore}>Not now</Button>
              <Button variant="primary" icon={<IconRefresh size={15} />} onClick={() => window.location.reload()}>
                Reload now
              </Button>
            </div>
          </>
        ) : (
          <>
            <div style={{
              padding: '14px 16px', borderRadius: 12,
              background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
              display: 'grid', gap: 7,
            }}>
              <div style={{
                fontSize: 14, fontWeight: 650, overflow: 'hidden',
                textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {pending?.name}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {parsedOk
                  ? <>Exported {formatDate(parsed.exportedAt)} · {plural(itemCount, 'item')}</>
                  : 'Unrecognised file'}
              </div>
            </div>

            {!parsedOk && (
              <div style={{ marginTop: 14 }}>
                <Callout tone="danger" icon={<IconAlert size={17} />}>
                  This is not an Influencer Studio backup file. Pick the JSON file that
                  &ldquo;Download backup&rdquo; produced.
                </Callout>
              </div>
            )}

            {parsedOk && (
              <>
                <div style={{ marginTop: 20 }}>
                  <span style={{
                    display: 'block', fontSize: 12, fontWeight: 650, marginBottom: 8,
                    color: 'var(--text-secondary)', letterSpacing: '0.2px',
                  }}>
                    How should it be applied?
                  </span>
                  <Segmented
                    ariaLabel="Restore mode"
                    value={restoreMode}
                    onChange={setRestoreMode}
                    options={[
                      { value: 'merge', label: 'Merge' },
                      { value: 'replace', label: 'Replace' },
                    ]}
                  />
                </div>
                <p style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-secondary)', marginTop: 12 }}>
                  {restoreMode === 'merge'
                    ? 'Merge only adds what is missing. Anything already in this browser is left exactly as it is.'
                    : 'Replace overwrites this browser’s copy with the backup’s version of every item in the file.'}
                  {' '}Neither mode deletes anything that is not in the file.
                </p>
              </>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
              <Button variant="secondary" onClick={closeRestore} disabled={restoreBusy}>Cancel</Button>
              <Button
                variant="primary"
                onClick={confirmRestore}
                disabled={!parsedOk}
                loading={restoreBusy}
              >
                {restoreMode === 'merge' ? 'Merge backup' : 'Replace with backup'}
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Danger confirmations ──────────────────────────────── */}
      <ConfirmDialog
        open={confirmKind === 'content'}
        busy={wipeBusy}
        tone="danger"
        title="Delete all content?"
        confirmPhrase="DELETE"
        confirmLabel="Delete everything I made"
        description={
          <>
            This erases every influencer, photo and video record, inspiration board, brand deal,
            your profile and your app settings from this browser. Your Higgsfield connection and
            Claude API key are kept. It cannot be undone.
            <span style={{ display: 'block', marginTop: 8, color: 'var(--text-primary)', fontWeight: 600 }}>
              Going now: {atStake}
            </span>
            <span style={{ display: 'block', marginTop: 14 }}>{backupFooterNote}</span>
          </>
        }
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => runWipe(false)}
      />

      <ConfirmDialog
        open={confirmKind === 'everything'}
        busy={wipeBusy}
        tone="danger"
        title="Erase everything?"
        confirmPhrase="ERASE"
        confirmLabel="Erase this browser"
        description={
          <>
            This erases all of your content <em>and</em> disconnects Higgsfield and removes the
            stored Claude API key. You will have to reconnect both afterwards. It cannot be undone.
            <span style={{ display: 'block', marginTop: 8, color: 'var(--text-primary)', fontWeight: 600 }}>
              Going now: {atStake}
            </span>
            <span style={{ display: 'block', marginTop: 14 }}>{backupFooterNote}</span>
          </>
        }
        onCancel={() => setConfirmKind(null)}
        onConfirm={() => runWipe(true)}
      />
    </PageShell>
  )
}
