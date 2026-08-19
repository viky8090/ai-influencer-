import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useInfluencers, useProfile } from '../store'
import { compressImage } from '../utils/imageUtils'
import {
  computeStats, latestImageFor, isTemplate, relativeTime, readPhotoHistory,
} from '../utils/accountStats'
import {
  PageShell, Card, Button, Divider, Field, TextInput, TextArea,
  Avatar, Badge, StatTile, EmptyState, useToast, formatDate,
  ACCENT, ACCENT_2,
} from '../components/ui'
import {
  IconUsers, IconImage, IconVideo, IconPalette, IconMapPin, IconCalendar,
  IconEdit, IconLink, IconExternal, IconPlus, IconSettings, IconUpload,
  IconTrash, IconCheck,
} from '../components/icons'

/*
 * The creator's own profile.
 *
 * There is no server and no login here: "your profile" is the identity this
 * browser's studio carries. Every number on the page is derived from what is
 * actually in localStorage (see utils/accountStats), so nothing shown can
 * drift away from the real data.
 */

const BIO_MAX = 280

// Avatars are stored inline in localStorage alongside the influencer records,
// and that budget is tight — uploads get downscaled hard before being saved.
const AVATAR_MAX_PX = 400
const AVATAR_QUALITY = 0.85
// A 400px JPEG lands well under this; anything larger means the compression
// step did not actually run.
const AVATAR_MAX_BYTES = 400 * 1024

const LINK_FIELDS = [
  { key: 'website',   label: 'Website',   placeholder: 'yourstudio.com',        base: null },
  { key: 'instagram', label: 'Instagram', placeholder: 'instagram.com/you',     base: 'https://instagram.com/' },
  { key: 'tiktok',    label: 'TikTok',    placeholder: 'tiktok.com/@you',       base: 'https://tiktok.com/@' },
  { key: 'youtube',   label: 'YouTube',   placeholder: 'youtube.com/@channel',  base: 'https://youtube.com/@' },
  { key: 'x',         label: 'X',         placeholder: 'x.com/you',             base: 'https://x.com/' },
]

// "domain.tld", optionally with a path — enough to safely prefix https://.
const DOMAIN_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i

function linkHref(field, raw) {
  const value = String(raw || '').trim()
  if (!value) return null
  if (/^https?:\/\//i.test(value)) return value
  if (DOMAIN_RE.test(value)) return `https://${value}`
  // A bare handle only points somewhere when the field names a platform.
  if (field.base) return field.base + value.replace(/^@+/, '').replace(/\s+/g, '')
  return null
}

// Platform pills say the platform; the website pill says the domain.
function linkText(field, raw) {
  if (field.key !== 'website') return field.label
  const clean = String(raw || '').trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/+$/, '')
  return clean.split('/')[0] || field.label
}

const PILL_STYLE = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  maxWidth: '100%', minWidth: 0, overflow: 'hidden',
  padding: '6px 12px', borderRadius: 999,
  background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)',
  color: 'var(--text-secondary)', fontSize: 12.5, fontWeight: 600,
  transition: 'color 0.15s, border-color 0.15s',
}

function LinkPill({ field, value }) {
  const href = linkHref(field, value)
  const inner = (
    <>
      {field.key === 'website' && <IconLink size={13} style={{ flexShrink: 0 }} />}
      <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {linkText(field, value)}
      </span>
      {href && <IconExternal size={11} style={{ flexShrink: 0, opacity: 0.55 }} />}
    </>
  )

  // Something is saved but it is not an address we can build a URL from —
  // show it rather than rendering a link that goes nowhere.
  if (!href) return <span style={PILL_STYLE} title={value}>{inner}</span>

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="focus-ring"
      title={`${field.label} — ${href}`}
      style={PILL_STYLE}
      onMouseEnter={e => { e.currentTarget.style.color = ACCENT; e.currentTarget.style.borderColor = `${ACCENT}55` }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
    >
      {inner}
    </a>
  )
}

function Meta({ icon, children }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 7, minWidth: 0,
      fontSize: 13, color: 'var(--text-secondary)', overflowWrap: 'anywhere',
    }}>
      <span style={{ display: 'flex', color: 'var(--text-tertiary)', flexShrink: 0 }}>{icon}</span>
      {children}
    </span>
  )
}

function SectionHeading({ id, title, aside }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap', marginBottom: 14,
    }}>
      <h2 id={id} style={{ fontSize: 17, fontWeight: 650, letterSpacing: '-0.3px' }}>{title}</h2>
      {aside && <span style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>{aside}</span>}
    </div>
  )
}

function plural(n, word) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// ── Roster card ───────────────────────────────────────────────────

function RosterCard({ influencer, image, photoCount, videoCount }) {
  const accent = influencer.palette?.[0]
  const template = isTemplate(influencer)
  const niche = influencer.nicheCustom?.trim() || influencer.niche?.trim()

  return (
    <Link
      to="/influencers"
      className="focus-ring"
      aria-label={`${influencer.name} — open in Influencers`}
      style={{
        display: 'block', color: 'inherit', overflow: 'hidden',
        background: 'var(--surface)', border: '1px solid var(--border-subtle)',
        borderRadius: 16, boxShadow: 'var(--shadow-sm)',
        transition: 'box-shadow 0.18s, transform 0.18s',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      <div style={{
        position: 'relative', aspectRatio: '3 / 4', overflow: 'hidden',
        background: 'var(--bg-tertiary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {/* Sits behind the photo, so a broken or missing image still reads as
            this character rather than an empty grey box. */}
        <Avatar name={influencer.name} size={72} />
        {image && (
          <img
            src={image}
            alt={`Latest image of ${influencer.name}`}
            loading="lazy"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
      </div>

      {accent && <div aria-hidden="true" style={{ height: 3, background: accent }} />}

      <div style={{ padding: '13px 15px 15px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h3 style={{
            fontSize: 15, fontWeight: 650, letterSpacing: '-0.2px', minWidth: 0,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{influencer.name}</h3>
          {template && <Badge tone="neutral">Template</Badge>}
        </div>

        {niche && (
          <div style={{
            marginTop: 4, fontSize: 13, color: 'var(--text-secondary)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{niche}</div>
        )}

        <div style={{
          display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          marginTop: 11, fontSize: 12, color: 'var(--text-tertiary)',
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <IconImage size={13} />{plural(photoCount, 'photo')}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
            <IconVideo size={13} />{plural(videoCount, 'video')}
          </span>
        </div>
      </div>
    </Link>
  )
}

// ── Page ──────────────────────────────────────────────────────────

export default function Profile() {
  const [influencers] = useInfluencers()
  const { profile, updateProfile, saveError } = useProfile()
  const toast = useToast()
  const navigate = useNavigate()
  const fileRef = useRef(null)

  const [draft, setDraft] = useState(null)     // non-null while editing
  const [uploading, setUploading] = useState(false)
  const nameRef = useRef(null)
  const returnFocus = useRef(false)

  const photos = useMemo(() => readPhotoHistory(), [influencers])
  const stats = useMemo(() => computeStats(influencers), [influencers])

  const videosById = useMemo(() => {
    const map = new Map()
    for (const video of stats.videos) {
      map.set(video.influencerId, (map.get(video.influencerId) || 0) + 1)
    }
    return map
  }, [stats])

  // Yours first, newest first; the bundled templates sink to the bottom.
  const roster = useMemo(() => {
    const rank = inf => (isTemplate(inf) ? 1 : 0)
    return [...influencers].sort(
      (a, b) => rank(a) - rank(b) || (b.createdAt || 0) - (a.createdAt || 0)
    )
  }, [influencers])

  const withPhotos = influencers.filter(inf => stats.photosById.get(inf.id)).length
  const withVideos = influencers.filter(inf => videosById.get(inf.id)).length
  const lastActivity = relativeTime(stats.lastActivityAt)

  // "2 characters of your own · 3 templates" — only the halves that exist.
  const rosterSummary = [
    stats.createdCount ? `${plural(stats.createdCount, 'character')} of your own` : null,
    stats.templateCount ? plural(stats.templateCount, 'template') : null,
  ].filter(Boolean).join(' · ') || null

  const displayName = (profile.displayName || '').trim()
  const handle = (profile.handle || '').trim()
  const bio = (profile.bio || '').trim()
  const location = (profile.location || '').trim()
  const savedLinks = LINK_FIELDS.filter(f => (profile.links?.[f.key] || '').trim())

  const editing = draft !== null

  // Saving or cancelling unmounts the form, which would otherwise drop focus
  // on <body>; park it on the name the user just edited instead.
  useEffect(() => {
    if (!editing && returnFocus.current) {
      returnFocus.current = false
      nameRef.current?.focus()
    }
  }, [editing])

  function startEdit() {
    setDraft({
      displayName: profile.displayName || '',
      handle: profile.handle || '',
      avatar: profile.avatar || '',
      bio: profile.bio || '',
      location: profile.location || '',
      links: { ...(profile.links || {}) },
    })
  }

  // Cancel simply throws the draft away — nothing was written to the store.
  function cancelEdit() {
    returnFocus.current = true
    setDraft(null)
    setUploading(false)
  }

  function setField(key, value) {
    setDraft(d => ({ ...d, [key]: value }))
  }

  // The profile write lands in an effect inside the store, so the outcome is
  // only known on the render after save(). Report it then, once.
  const pendingSave = useRef(false)
  useEffect(() => {
    if (!pendingSave.current) return
    pendingSave.current = false
    if (saveError) toast(saveError, 'danger')
    else toast('Profile saved')
  })

  function setLink(key, value) {
    setDraft(d => ({ ...d, links: { ...d.links, [key]: value } }))
  }

  function onAvatarFile(e) {
    const file = e.target.files?.[0]
    e.target.value = ''   // let the same file be picked again after a remove
    if (!file) return
    if (!file.type.startsWith('image/')) {
      toast('That file is not an image', 'danger')
      return
    }
    setUploading(true)
    const reader = new FileReader()
    reader.onload = ev => {
      const original = ev.target.result
      compressImage(original, AVATAR_MAX_PX, AVATAR_QUALITY)
        .then(small => {
          // compressImage resolves with the ORIGINAL data URL when the browser
          // cannot decode the file (HEIC in Chrome and Firefox, for example),
          // so a successful promise is not proof it did anything. Reject the
          // result if it was not actually downscaled — storing a multi-megabyte
          // blob would blow the localStorage budget for the whole app.
          if (small === original || small.length > AVATAR_MAX_BYTES) {
            toast(
              'That image could not be resized — try a JPEG or PNG under a few megabytes.',
              'danger'
            )
            return
          }
          setDraft(d => (d ? { ...d, avatar: small } : d))
        })
        .catch(() => toast('Could not process that image', 'danger'))
        .finally(() => setUploading(false))
    }
    reader.onerror = () => {
      setUploading(false)
      toast('Could not read that file', 'danger')
    }
    reader.readAsDataURL(file)
  }

  function save(e) {
    e.preventDefault()
    const links = {}
    for (const field of LINK_FIELDS) links[field.key] = (draft.links?.[field.key] || '').trim()
    updateProfile({
      displayName: draft.displayName.trim(),
      handle: draft.handle.trim().replace(/^@+/, '').replace(/\s+/g, ''),
      avatar: draft.avatar,
      bio: draft.bio.trim(),
      location: draft.location.trim(),
      links,
    })
    returnFocus.current = true
    setDraft(null)
    setUploading(false)
    // Don't claim success yet — the write happens in an effect and can fail on
    // a full store. The effect below reports whichever way it goes.
    pendingSave.current = true
  }

  return (
    <PageShell
      title="Profile"
      subtitle="Your studio identity, and everything you have made on this device."
      actions={
        <>
          <Button variant="secondary" icon={<IconSettings size={16} />} onClick={() => navigate('/settings')}>
            Settings
          </Button>
          <Button variant="primary" icon={<IconPlus size={16} />} onClick={() => navigate('/create')}>
            New influencer
          </Button>
        </>
      }
    >
      {/* ── Identity ─────────────────────────────────────────── */}
      <Card padding={0} style={{ overflow: 'hidden', marginBottom: 30 }}>
        <div
          aria-hidden="true"
          style={{ height: 96, background: `linear-gradient(120deg, ${ACCENT_2}2E, ${ACCENT}2E)` }}
        />

        <div style={{ padding: '0 26px 26px' }}>
          <div style={{
            display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
            gap: 16, flexWrap: 'wrap', marginTop: -52,
          }}>
            <Avatar
              src={editing ? draft.avatar : profile.avatar}
              name={(editing ? draft.displayName.trim() : displayName) || 'Your studio'}
              size={104}
              ring
            />

            {editing ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingBottom: 2 }}>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={onAvatarFile}
                  style={{ display: 'none' }}
                />
                <Button
                  type="button"
                  size="sm"
                  icon={<IconUpload size={15} />}
                  loading={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {draft.avatar ? 'Replace photo' : 'Upload photo'}
                </Button>
                {draft.avatar && (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    icon={<IconTrash size={15} />}
                    onClick={() => setField('avatar', '')}
                  >
                    Remove photo
                  </Button>
                )}
              </div>
            ) : (
              <div style={{ paddingBottom: 2 }}>
                <Button
                  variant={displayName ? 'secondary' : 'primary'}
                  size="sm"
                  icon={<IconEdit size={15} />}
                  onClick={startEdit}
                >
                  {displayName ? 'Edit profile' : 'Set up profile'}
                </Button>
              </div>
            )}
          </div>

          {editing ? (
            <form onSubmit={save} style={{ marginTop: 22 }}>
              <div className="field-grid">
                <Field label="Display name" htmlFor="profile-name">
                  <TextInput
                    id="profile-name"
                    value={draft.displayName}
                    onChange={e => setField('displayName', e.target.value)}
                    placeholder="Your name or studio"
                    autoFocus
                  />
                </Field>
                <Field label="Handle" htmlFor="profile-handle" hint="Shown as @handle across the app.">
                  <TextInput
                    id="profile-handle"
                    prefix="@"
                    value={draft.handle}
                    onChange={e => setField('handle', e.target.value)}
                    placeholder="yourstudio"
                  />
                </Field>
              </div>

              <Field label="Location" htmlFor="profile-location" style={{ marginTop: 14 }}>
                <TextInput
                  id="profile-location"
                  value={draft.location}
                  onChange={e => setField('location', e.target.value)}
                  placeholder="Los Angeles, CA"
                />
              </Field>

              <Field
                label="Bio"
                htmlFor="profile-bio"
                hint={`${draft.bio.length}/${BIO_MAX}`}
                style={{ marginTop: 14 }}
              >
                <TextArea
                  id="profile-bio"
                  rows={3}
                  maxLength={BIO_MAX}
                  value={draft.bio}
                  onChange={e => setField('bio', e.target.value)}
                  placeholder="What kind of characters and content do you make?"
                />
              </Field>

              <Divider spacing={22} />

              <div style={{
                fontSize: 12, fontWeight: 650, letterSpacing: '0.2px',
                color: 'var(--text-secondary)', marginBottom: 12,
              }}>
                LINKS
              </div>
              <div className="field-grid">
                {LINK_FIELDS.map(field => (
                  <Field key={field.key} label={field.label} htmlFor={`profile-link-${field.key}`}>
                    <TextInput
                      id={`profile-link-${field.key}`}
                      value={draft.links?.[field.key] || ''}
                      onChange={e => setLink(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      inputMode="url"
                      autoComplete="off"
                    />
                  </Field>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap', marginTop: 24 }}>
                <Button type="button" variant="secondary" onClick={cancelEdit}>Cancel</Button>
                <Button type="submit" variant="primary" icon={<IconCheck size={16} />} disabled={uploading}>
                  Save profile
                </Button>
              </div>
            </form>
          ) : (
            <div style={{ marginTop: 18 }}>
              <h2 ref={nameRef} tabIndex={-1} className="focus-ring" style={{
                fontSize: 26, fontWeight: 700, letterSpacing: '-0.6px', lineHeight: 1.2,
                overflowWrap: 'anywhere',
                color: displayName ? 'var(--text-primary)' : 'var(--text-secondary)',
              }}>
                {displayName || 'Name your studio'}
              </h2>

              {handle && (
                <div style={{ marginTop: 5, fontSize: 14, fontWeight: 600, color: ACCENT, overflowWrap: 'anywhere' }}>
                  @{handle}
                </div>
              )}

              {displayName ? (
                bio && (
                  <p style={{
                    marginTop: 12, fontSize: 14.5, lineHeight: 1.65,
                    color: 'var(--text-secondary)', maxWidth: 620, overflowWrap: 'anywhere',
                  }}>{bio}</p>
                )
              ) : (
                <p style={{ marginTop: 10, fontSize: 14.5, lineHeight: 1.65, color: 'var(--text-secondary)', maxWidth: 560 }}>
                  Add a name, photo and links so this studio feels like yours. It is
                  saved in this browser only — nothing is uploaded anywhere.
                </p>
              )}

              {(location || profile.createdAt) && (
                <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', marginTop: 14 }}>
                  {location && <Meta icon={<IconMapPin size={15} />}>{location}</Meta>}
                  {profile.createdAt && (
                    <Meta icon={<IconCalendar size={15} />}>Creating since {formatDate(profile.createdAt)}</Meta>
                  )}
                </div>
              )}

              {savedLinks.length > 0 && (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                  {savedLinks.map(field => (
                    <LinkPill key={field.key} field={field} value={profile.links[field.key]} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Card>

      {/* ── Stats ────────────────────────────────────────────── */}
      <section aria-labelledby="profile-work" style={{ marginBottom: 32 }}>
        <SectionHeading
          id="profile-work"
          title="Your work"
          aside={lastActivity ? `Last generated ${lastActivity}` : null}
        />
        <div className="stat-grid">
          <StatTile
            label="Influencers"
            value={stats.influencerCount}
            hint={`${stats.createdCount} created by you`}
            icon={<IconUsers size={15} />}
          />
          <StatTile
            label="Photos"
            value={stats.photoCount}
            hint={withPhotos ? `Across ${plural(withPhotos, 'character')}` : 'None generated yet'}
            icon={<IconImage size={15} />}
          />
          <StatTile
            label="Videos"
            value={stats.videoCount}
            hint={withVideos ? `Across ${plural(withVideos, 'character')}` : 'None generated yet'}
            icon={<IconVideo size={15} />}
          />
          <StatTile
            label="Mood boards"
            value={stats.boardCount}
            hint={`${plural(stats.dealCount, 'brand deal')} tracked`}
            icon={<IconPalette size={15} />}
          />
        </div>
      </section>

      {/* ── Roster ───────────────────────────────────────────── */}
      <section aria-labelledby="profile-roster">
        <SectionHeading
          id="profile-roster"
          title="Roster"
          aside={rosterSummary}
        />

        {roster.length === 0 ? (
          <Card padding={8}>
            <EmptyState
              icon={<IconUsers size={22} />}
              title="No characters yet"
              description="Your influencers, their photos and their videos all show up here once you create the first one."
              action={
                <Button variant="primary" icon={<IconPlus size={16} />} onClick={() => navigate('/create')}>
                  Create an influencer
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="card-grid-3">
            {roster.map(inf => (
              <RosterCard
                key={inf.id}
                influencer={inf}
                image={latestImageFor(inf, photos)}
                photoCount={stats.photosById.get(inf.id) || 0}
                videoCount={videosById.get(inf.id) || 0}
              />
            ))}
          </div>
        )}
      </section>
    </PageShell>
  )
}
