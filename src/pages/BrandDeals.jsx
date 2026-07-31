import { useState, useRef } from 'react'
import {
  Card,
  Text,
  Button,
  TextInput,
  Dialog,
  DialogHeader,
  Layout,
  LayoutContent,
  LayoutFooter,
  EmptyState,
  VStack,
  HStack,
} from '@astryxdesign/core'
import { useSEO } from '../ui/seo'
import { useBrandDeals, generateId } from '../store'
import { compressImage, downloadImage } from '../utils/imageUtils'
import { generateSingleImage } from '../utils/higgsfieldGenerate'
import { isVymotionSession, promptSignUp } from '../api/serverGenerate'
import { buildCharSheetPrompt, buildCharSheetPromptWithClaude } from '../utils/charSheetPrompt'
import Lightbox from '../components/Lightbox'
import { glassCard } from '../ui/glass'
import AstryxScope from '../ui/ax/AstryxScope'

function NewDealModal({ onClose, onSave }) {
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [image, setImage] = useState(null)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef()

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = (ev) => compressImage(ev.target.result).then(setImage)
    r.readAsDataURL(f)
    e.target.value = ''
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (!f || !f.type.startsWith('image/')) return
    const r = new FileReader()
    r.onload = (ev) => compressImage(ev.target.result).then(setImage)
    r.readAsDataURL(f)
  }

  return (
    <Dialog
      isOpen
      onOpenChange={(open) => { if (!open) onClose() }}
      purpose="form"
      width={400}
      maxHeight="90vh"
      padding={0}
    >
      <Layout
        height="auto"
        header={
          <DialogHeader
            title="New Brand Deal"
            onOpenChange={(open) => { if (!open) onClose() }}
            hasDivider
          />
        }
        content={
          <LayoutContent padding={4} isScrollable={false}>
            <VStack gap={3}>
              <TextInput
                label="Brand name"
                value={brand}
                onChange={setBrand}
                placeholder="e.g. Nike"
                hasAutoFocus
                width="100%"
              />
              <TextInput
                label="Category"
                value={category}
                onChange={setCategory}
                placeholder="e.g. Fitness, Beauty, Tech..."
                width="100%"
              />
              <VStack gap={1}>
                <Text type="supporting" size="xsm" weight="bold" color="secondary" style={{ textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Brand image
                </Text>
                <div
                  onClick={() => fileRef.current.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  style={{
                    width: '100%', aspectRatio: '16/9',
                    borderRadius: 10,
                    border: image ? 'none' : `1.5px dashed ${dragging ? 'var(--brand)' : 'var(--color-border, var(--border))'}`,
                    background: image ? 'transparent' : dragging ? 'rgba(199,242,78,0.07)' : 'var(--color-background-muted, var(--bg-secondary))',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 6,
                  }}
                >
                  {image
                    ? <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : (
                      <>
                        <span style={{ fontSize: 22, opacity: dragging ? 0.6 : 0.25 }}>+</span>
                        <Text type="supporting" size="xsm" color="secondary">
                          {dragging ? 'Drop to upload' : 'Upload or drag & drop'}
                        </Text>
                      </>
                    )}
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
              </VStack>
            </VStack>
          </LayoutContent>
        }
        footer={
          <LayoutFooter hasDivider padding={4}>
            <HStack gap={2}>
              <Button label="Cancel" variant="secondary" size="md" onClick={onClose} style={{ flex: 1 }} />
              <Button
                label="Add Deal"
                variant="primary"
                size="md"
                isDisabled={!brand.trim()}
                onClick={() => onSave({ brand, category, image })}
                style={{ flex: 1 }}
              />
            </HStack>
          </LayoutFooter>
        }
      />
    </Dialog>
  )
}

function DealCard({ deal, generating, progress, onDelete, onOpen, onRename, onGenerate }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(deal.brand)
  const [showSheet, setShowSheet] = useState(true)

  function commitRename() {
    const trimmed = name.trim()
    if (trimmed) onRename(deal.id, trimmed)
    else setName(deal.brand)
    setEditing(false)
  }

  const hasSheet = !!deal.characterSheet
  const hasOriginal = !!deal.image
  const displayImage = hasSheet && hasOriginal
    ? (showSheet ? deal.characterSheet : deal.image)
    : (deal.characterSheet || deal.image)

  return (
    <div
      style={{
        ...glassCard,
        overflow: 'hidden',
        border: hasSheet ? '1px solid rgba(199,242,78,0.30)' : glassCard.border,
        transition: 'border-color 0.15s var(--ease-out), background 0.15s var(--ease-out)',
      }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface-hover)' }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)' }}
    >
      {/* Image area */}
      <div
        onClick={() => !editing && displayImage && !generating && onOpen()}
        style={{
          aspectRatio: '16/9',
          background: 'var(--bg-tertiary)',
          overflow: 'hidden',
          position: 'relative',
          cursor: displayImage && !generating ? 'zoom-in' : 'default',
        }}
      >
        {displayImage
          ? <img
              src={displayImage}
              alt={deal.brand}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.3s' }}
              onMouseEnter={e => { if (!generating) e.currentTarget.style.transform = 'scale(1.04)' }}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-tertiary)', opacity: 0.3 }}>{deal.brand[0]}</span>
            </div>
        }

        {/* Generating overlay */}
        {generating && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(4,4,10,0.62)',
            backdropFilter: 'blur(var(--blur-sm))',
            WebkitBackdropFilter: 'blur(var(--blur-sm))',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <div className="blob-loader" style={{ width: 30, height: 30 }} />
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 600 }}>
              {progress < 10 ? 'Asking Claude…' : progress < 25 ? 'Uploading…' : 'Generating…'}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>{Math.round(progress)}%</div>
          </div>
        )}

        {/* Original / Sheet toggle pill */}
        {hasSheet && hasOriginal && !generating && (
          <div
            onClick={e => { e.stopPropagation(); setShowSheet(v => !v) }}
            style={{
              position: 'absolute', top: 8, left: 8,
              display: 'flex', borderRadius: 'var(--radius-sm)', overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.2)',
              backdropFilter: 'blur(6px)',
              cursor: 'pointer',
            }}
          >
            {['Original', 'Sheet'].map(label => {
              const active = label === 'Sheet' ? showSheet : !showSheet
              return (
                <div key={label} style={{
                  padding: '3px 9px', fontSize: 10, fontWeight: 700,
                  background: active ? 'rgba(199,242,78,0.9)' : 'rgba(0,0,0,0.45)',
                  color: active ? 'var(--brand-ink)' : 'rgba(255,255,255,0.6)',
                  letterSpacing: '0.3px',
                  transition: 'background 0.4s var(--ease-liquid)',
                }}>{label}</div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info row */}
      <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={e => setName(e.target.value)}
              onClick={e => e.stopPropagation()}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') { setName(deal.brand); setEditing(false) } }}
              style={{ fontSize: 14, fontWeight: 700, border: 'none', background: 'transparent', color: 'var(--text-primary)', outline: 'none', width: '100%' }}
            />
          ) : (
            <div style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{deal.brand}</div>
          )}
          {deal.category && <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{deal.category}</div>}
        </div>

        <div style={{ display: 'flex', gap: 5, flexShrink: 0, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
          {/* Rename */}
          <button
            disabled={generating}
            onClick={() => setEditing(true)}
            style={{ padding: '4px 8px', borderRadius: 6, fontSize: 11, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', opacity: generating ? 0.4 : 1 }}
          >Rename</button>

          {/* Generate / Download */}
          {deal.image && !generating && (
            hasSheet ? (
              <>
                <button
                  title="Download character sheet"
                  onClick={() => downloadImage(deal.characterSheet, `${deal.brand}-sheet.jpg`)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >↓</button>
                <button
                  title="Regenerate sheet"
                  onClick={() => onGenerate(deal)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >↺</button>
              </>
            ) : (
              <button
                onClick={() => onGenerate(deal)}
                className="liquid-press"
                style={{
                  padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 800,
                  background: 'var(--brand)',
                  color: 'var(--brand-ink)',
                  border: '1px solid rgba(255,255,255,0.35)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.5), 0 0 14px rgba(199,242,78,0.3)',
                  whiteSpace: 'nowrap',
                }}
              >Generate</button>
            )
          )}

          {/* Delete */}
          <button
            disabled={generating}
            onClick={() => onDelete(deal.id)}
            style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(255,59,48,0.1)', color: '#FF3B30', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: generating ? 0.4 : 1 }}
          >×</button>
        </div>
      </div>
    </div>
  )
}

export default function BrandDeals() {
  useSEO({ path: '/brand-deals' })

  const [deals, setDeals] = useBrandDeals()
  const [showNew, setShowNew] = useState(false)
  const [lightboxDeal, setLightboxDeal] = useState(null)
  const [generating, setGenerating] = useState({})   // { [id]: bool }
  const [genProgress, setGenProgress] = useState({}) // { [id]: 0–100 }

  function addDeal({ brand, category, image }) {
    setDeals(prev => [...prev, { id: generateId(), brand, category, image, createdAt: Date.now() }])
    setShowNew(false)
  }

  function deleteDeal(id) {
    if (generating[id]) return
    const deal = deals.find(d => d.id === id)
    if (!deal) return
    if (!window.confirm(`Delete "${deal.brand}"?`)) return
    setDeals(prev => prev.filter(d => d.id !== id))
  }

  function renameDeal(id, brand) {
    setDeals(prev => prev.map(d => d.id === id ? { ...d, brand } : d))
  }

  async function handleGenerate(deal) {
    if (!isVymotionSession()) { promptSignUp(); return }

    setGenerating(g => ({ ...g, [deal.id]: true }))
    setGenProgress(p => ({ ...p, [deal.id]: 0 }))

    try {
      // Step 1 — Claude studies the image and writes the full Higgsfield prompt
      let imagePrompt = null
      if (deal.image) {
        try {
          setGenProgress(p => ({ ...p, [deal.id]: 5 }))
          imagePrompt = await buildCharSheetPromptWithClaude(deal.image, deal.brand, deal.category)
        } catch (e) {
          console.error('[BrandDeals] Claude failed:', e.message)
        }
      }

      // Step 2 — fall back to template if Claude wasn't available or failed
      if (!imagePrompt) {
        console.log('[BrandDeals] Using text fallback prompt')
        imagePrompt = buildCharSheetPrompt(deal.brand, deal.category)
      }

      // Step 3 — Higgsfield GPT Image 2 generates the character sheet
      setGenProgress(p => ({ ...p, [deal.id]: 15 }))
      const sheetUrl = await generateSingleImage({
        prompt: imagePrompt,
        aspectRatio: '16:9',
        referenceImage: deal.image,
        onProgress: pct => setGenProgress(prev => ({ ...prev, [deal.id]: pct })),
      })

      if (sheetUrl) {
        setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, characterSheet: sheetUrl } : d))
      }
    } catch (e) {
      if (!e.message?.includes('CANCELLED')) alert('Generation failed: ' + e.message)
    } finally {
      setGenerating(g => ({ ...g, [deal.id]: false }))
      setGenProgress(p => ({ ...p, [deal.id]: 0 }))
    }
  }

  return (
    <AstryxScope>
      <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'transparent' }}>
        {showNew && <NewDealModal onClose={() => setShowNew(false)} onSave={addDeal} />}

        {lightboxDeal && (
          <Lightbox
            images={[lightboxDeal.characterSheet || lightboxDeal.image]}
            startIndex={0}
            onClose={() => setLightboxDeal(null)}
          />
        )}

        <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 24px 70px' }}>
          <div className="reveal" style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, marginBottom: 30 }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <Text
                type="supporting"
                size="xsm"
                weight="bold"
                color="secondary"
                display="block"
                style={{ textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}
              >
                Partnerships · {deals.length} deal{deals.length !== 1 ? 's' : ''}
              </Text>
              <h1 style={{ font: 'inherit', margin: 0 }}>
                <Text type="display-2" weight="bold" display="block" style={{ letterSpacing: '-1.2px', lineHeight: 1 }}>
                  AI influencer brand deals
                </Text>
              </h1>
            </div>
            <Button label="+ New Deal" variant="primary" size="md" onClick={() => setShowNew(true)} />
          </div>

          {deals.length === 0 ? (
            <div className="reveal-1" style={{ padding: '60px 0' }}>
              <EmptyState
                title="No brand deals yet"
                description="Add brands you want to promote with your influencers"
                actions={<Button label="+ New Deal" variant="primary" size="md" onClick={() => setShowNew(true)} />}
              />
            </div>
          ) : (
            <div className="reveal-1" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
              {deals.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  generating={!!generating[deal.id]}
                  progress={genProgress[deal.id] || 0}
                  onDelete={deleteDeal}
                  onRename={renameDeal}
                  onOpen={() => setLightboxDeal(deal)}
                  onGenerate={handleGenerate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AstryxScope>
  )
}
