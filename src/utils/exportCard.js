function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines = 4) {
  if (!text) return y
  const words = text.split(' ')
  let line = ''
  let cy = y
  let lc = 0
  for (const word of words) {
    if (lc >= maxLines) break
    const test = line ? line + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, cy)
      line = word; cy += lineHeight; lc++
    } else line = test
  }
  if (line && lc < maxLines) { ctx.fillText(line, x, cy); cy += lineHeight }
  return cy
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y); ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.lineTo(x + w, y + h - r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.lineTo(x + r, y + h); ctx.arcTo(x, y + h, x, y, r)
  ctx.lineTo(x, y + r); ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

async function loadImg(src) {
  if (!src) return null
  return new Promise(res => {
    const i = new Image()
    i.onload = () => res(i)
    i.onerror = () => res(null)
    i.src = src
  })
}

import { gColor, pLabel } from './influencerUtils'

export async function exportInfluencerCard(inf) {
  const W = 900, H = 520, IW = 270
  const RX = IW + 30, RW = W - IW - 56
  const gc = gColor(inf.gender)

  const canvas = document.createElement('canvas')
  canvas.width = W * 2; canvas.height = H * 2
  const ctx = canvas.getContext('2d')
  ctx.scale(2, 2)

  // Background
  ctx.fillStyle = '#FAFAFA'
  ctx.fillRect(0, 0, W, H)

  // Image column background
  ctx.fillStyle = '#E8E8ED'
  ctx.fillRect(0, 0, IW, H)

  // Main image
  const img = await loadImg(inf.mainImage)
  if (img) {
    ctx.save()
    ctx.beginPath(); ctx.rect(0, 0, IW, H); ctx.clip()
    const sc = Math.max(IW / img.width, H / img.height)
    ctx.drawImage(img, (IW - img.width * sc) / 2, (H - img.height * sc) / 2, img.width * sc, img.height * sc)
    ctx.restore()
    // Bottom gradient on image
    const g = ctx.createLinearGradient(0, H * 0.6, 0, H)
    g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.5)')
    ctx.fillStyle = g; ctx.fillRect(0, 0, IW, H)
  }

  // Char sheet (bottom-left inset)
  const cs = await loadImg(inf.characterSheetImage)
  if (cs) {
    ctx.save()
    const cx2 = 10, cy2 = H - 80, cw = 60, ch = 70
    rr(ctx, cx2, cy2, cw, ch, 6); ctx.clip()
    ctx.drawImage(cs, cx2, cy2, cw, ch)
    ctx.restore()
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 1.5
    rr(ctx, 10, H - 80, 60, 70, 6); ctx.stroke()
  }

  // Accent bar
  ctx.fillStyle = gc; ctx.fillRect(IW, 0, W - IW, 5)

  let cy = 36
  // Name
  ctx.fillStyle = '#1D1D1F'
  ctx.font = 'bold 26px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
  ctx.fillText(inf.name || 'Untitled', RX, cy); cy += 8

  // Meta
  const meta = [inf.gender, (inf.niche && inf.niche !== 'Other') ? inf.niche : inf.nicheCustom, inf.age ? `Age ${inf.age}` : null].filter(Boolean).join('  ·  ')
  ctx.fillStyle = gc
  ctx.font = '13px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
  ctx.fillText(meta, RX, cy + 16); cy += 38

  // Divider
  ctx.strokeStyle = '#E5E5EA'; ctx.lineWidth = 1
  ctx.beginPath(); ctx.moveTo(RX, cy); ctx.lineTo(RX + RW, cy); ctx.stroke()
  cy += 16

  // Backstory
  if (inf.backstory?.trim()) {
    ctx.fillStyle = '#AEAEB2'
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
    ctx.fillText('BACKSTORY', RX, cy); cy += 14
    ctx.fillStyle = '#3A3A3C'
    ctx.font = '12.5px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
    cy = wrapText(ctx, inf.backstory, RX, cy, RW, 17, 3)
    cy += 8
  }

  // Hobbies
  if (inf.hobbies?.trim()) {
    ctx.fillStyle = '#AEAEB2'
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
    ctx.fillText('HOBBIES', RX, cy)
    const lw = ctx.measureText('HOBBIES').width + 8
    ctx.fillStyle = '#3A3A3C'
    ctx.font = '12px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
    ctx.fillText(inf.hobbies.slice(0, 55), RX + lw, cy)
    cy += 18
  }

  // Voice / Dream brands
  for (const [label, val] of [['VOICE', inf.voice], ['DREAM BRANDS', inf.dreamBrands]]) {
    if (!val?.trim()) continue
    ctx.fillStyle = '#AEAEB2'
    ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
    ctx.fillText(label, RX, cy)
    const lw = ctx.measureText(label).width + 8
    ctx.fillStyle = '#3A3A3C'
    ctx.font = '12px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
    ctx.fillText(val.slice(0, 55), RX + lw, cy)
    cy += 18
  }

  // Personality bar
  const pv = inf.introExtrovert ?? 50
  cy += 4
  ctx.fillStyle = '#AEAEB2'
  ctx.font = 'bold 10px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
  ctx.fillText('PERSONALITY', RX, cy); cy += 12
  const BW = Math.min(RW, 180)
  ctx.fillStyle = '#E5E5EA'; rr(ctx, RX, cy, BW, 5, 2.5); ctx.fill()
  const g2 = ctx.createLinearGradient(RX, 0, RX + BW, 0)
  g2.addColorStop(0, '#FBBF24'); g2.addColorStop(0.5, '#F97316'); g2.addColorStop(1, '#EF4444')
  ctx.fillStyle = g2; rr(ctx, RX, cy, BW * pv / 100, 5, 2.5); ctx.fill()
  cy += 14
  ctx.fillStyle = '#F97316'
  ctx.font = '11px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
  ctx.fillText(pLabel(pv), RX, cy)

  // Bottom bar
  const BY = H - 32
  ctx.fillStyle = '#F0F0F5'; ctx.fillRect(IW, BY, W - IW, 32)

  if (inf.palette?.length > 0) {
    inf.palette.forEach((c, i) => {
      ctx.fillStyle = c; rr(ctx, RX + i * 26, BY + 6, 20, 20, 5); ctx.fill()
    })
  }
  ctx.fillStyle = '#AEAEB2'
  ctx.font = '9.5px -apple-system, BlinkMacSystemFont, Arial, sans-serif'
  ctx.textAlign = 'right'
  ctx.fillText('AI Influencer Studio · Made by Dan Kieft', W - 20, BY + 20)
  ctx.textAlign = 'left'

  const link = document.createElement('a')
  link.download = `${(inf.name || 'influencer').toLowerCase().replace(/\s+/g, '-')}-card.png`
  link.href = canvas.toDataURL('image/png', 0.95)
  link.click()
}
