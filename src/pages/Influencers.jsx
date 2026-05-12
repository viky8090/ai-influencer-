import { useState, useRef, useEffect } from 'react'
import { useInfluencers, generateId } from '../store'
import ImageGrid from '../components/ImageGrid'
import MasonryGrid from '../components/MasonryGrid'
import Lightbox from '../components/Lightbox'
import { exportInfluencerCard } from '../utils/exportCard'

// ─────────────────────────────────────────────
// Dark sidebar palette
const SD = {
  bg:      '#18181B',
  border:  'rgba(255,255,255,0.07)',
  text:    '#F4F4F5',
  dim:     'rgba(255,255,255,0.38)',
  active:  'rgba(255,255,255,0.1)',
  hover:   'rgba(255,255,255,0.055)',
  ring:    'rgba(255,255,255,0.12)',
}

// ─────────────────────────────────────────────
// Niche lists
const NICHES_F   = ['Fashion','Beauty','Lifestyle','Wellness','Fitness','Travel','Food & Dining','Home & Decor','Parenting','Entertainment','Other']
const NICHES_M   = ['Fitness','Gaming','Tech','Sports','Finance','Cars & Motors','Travel','Outdoor & Adventure','Food & Dining','Entertainment','Other']
const NICHES_ALL = ['Fashion','Fitness','Lifestyle','Beauty','Tech','Gaming','Travel','Food & Dining','Finance','Entertainment','Wellness','Sports','Other']

// ─────────────────────────────────────────────
// Helpers
function getNiches(g)  { return g==='Female'?NICHES_F:g==='Male'?NICHES_M:NICHES_ALL }
function audiencePh(g,n) {
  const nl = n && n!=='Other' ? n.toLowerCase() : null
  if (g==='Female') return `e.g. a woman, 18–34, interested in ${nl||'fashion & beauty'}`
  if (g==='Male')   return `e.g. a man, 20–35, interested in ${nl||'fitness & gaming'}`
  return `e.g. adults, 18–30, interested in ${nl||'lifestyle & entertainment'}`
}
function pLabel(v) {
  if (v<15) return 'Strongly Introverted'
  if (v<30) return 'Introverted'
  if (v<43) return 'Slightly Introverted'
  if (v<57) return 'Balanced'
  if (v<70) return 'Slightly Extroverted'
  if (v<85) return 'Extroverted'
  return 'Strongly Extroverted'
}
function pColor(v) {
  const l=(a,b,t)=>Math.round(a+(b-a)*t)
  if(v<=50){const t=v/50;return`rgb(${l(251,249,t)},${l(191,115,t)},${l(36,22,t)})`}
  const t=(v-50)/50;return`rgb(${l(249,239,t)},${l(115,68,t)},${l(22,68,t)})`
}
function gColor(g) { return g==='Female'?'#EC4899':g==='Male'?'#3B82F6':'#8B5CF6' }

// Profile accent: use first palette color or fall back to gender color
function accent(inf) { return inf?.palette?.[0] || gColor(inf?.gender) }

// Light-or-dark text on accent bg
function accentText(hex) {
  if (!hex || hex.length < 7) return '#fff'
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16)
  return (0.299*r+0.587*g+0.114*b) < 145 ? '#fff' : '#1D1D1F'
}

function completeness(inf) {
  const c = [
    inf.name?.trim(), inf.gender, inf.mainImage, inf.characterSheetImage, inf.closeUpImage1,
    inf.prompt?.trim(), inf.backstory?.trim(), inf.niche, inf.audience?.trim(), inf.voice?.trim(),
    inf.wardrobeImages?.length>0, inf.homeImages?.length>0,
    inf.contentPillars?.length>0, inf.palette?.length>0,
  ]
  return Math.round(c.filter(Boolean).length / c.length * 100)
}

// ─────────────────────────────────────────────
// Completeness ring
function Ring({ pct, size=42 }) {
  const r=(size-5)/2, c=2*Math.PI*r, off=c-(pct/100)*c
  const col = pct>=80?'#34C759':pct>=50?'#F97316':pct>=25?'#0071E3':'#555'
  return (
    <svg width={size} height={size} style={{position:'absolute',top:-1,left:-1,pointerEvents:'none'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={SD.ring} strokeWidth={2.5}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={col} strokeWidth={2.5}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{transition:'stroke-dashoffset 0.5s,stroke 0.3s'}}/>
    </svg>
  )
}

// ─────────────────────────────────────────────
// Context menu
function CtxMenu({ x, y, items, onClose }) {
  useEffect(() => {
    const h = () => onClose()
    window.addEventListener('click', h, { once: true })
    return () => window.removeEventListener('click', h)
  }, [onClose])
  return (
    <div onClick={e=>e.stopPropagation()} style={{
      position:'fixed', top:y, left:x, zIndex:400,
      background:'rgba(28,28,30,0.96)', backdropFilter:'blur(20px)',
      borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.4)', border:'1px solid rgba(255,255,255,0.1)',
      padding:4, minWidth:170,
    }}>
      {items.map(({label,color,action})=>(
        <button key={label} onClick={()=>{action();onClose()}} style={{
          display:'block', width:'100%', textAlign:'left',
          padding:'9px 14px', borderRadius:8,
          fontSize:13, fontWeight:500,
          color: color||'#F4F4F5', background:'transparent', transition:'background 0.1s',
        }}
          onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.1)'}
          onMouseLeave={e=>e.currentTarget.style.background='transparent'}
        >{label}</button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// Hero banner — clean profile card
function HeroBanner({ influencer, onExport, onDelete, pct }) {
  const ac = accent(influencer)
  const gc = gColor(influencer.gender)
  const r = 33, c = 2*Math.PI*r, off = c*(1-pct/100)
  const ringColor = pct>=80?'#34C759':pct>=50?'#F97316':'#0071E3'

  return (
    <div style={{
      background:'var(--surface)',
      borderRadius:16,
      border:'1px solid var(--border-subtle)',
      boxShadow:'var(--shadow-sm)',
      overflow:'hidden',
      flexShrink:0,
    }}>
      {/* Accent stripe */}
      <div style={{height:3,background:`linear-gradient(to right, ${ac}, ${ac}55, transparent)`}}/>

      <div style={{padding:'18px 22px',display:'flex',alignItems:'center',gap:18}}>
        {/* Avatar + completion ring */}
        <div style={{position:'relative',width:74,height:74,flexShrink:0}}>
          <svg width={74} height={74} style={{position:'absolute',top:0,left:0,pointerEvents:'none'}}>
            <circle cx={37} cy={37} r={r} fill="none" stroke="var(--border)" strokeWidth={2.5}/>
            <circle cx={37} cy={37} r={r} fill="none" stroke={ringColor} strokeWidth={2.5}
              strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
              transform="rotate(-90 37 37)"
              style={{transition:'stroke-dashoffset 0.5s,stroke 0.3s'}}/>
          </svg>
          <div style={{
            position:'absolute',top:5,left:5,width:64,height:64,
            borderRadius: influencer.mainImage ? '50%' : 14,
            overflow:'hidden',
            background:`${ac}1A`,
            display:'flex',alignItems:'center',justifyContent:'center',
            transition:'border-radius 0.2s',
          }}>
            {influencer.mainImage
              ?<img src={influencer.mainImage} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              :<span style={{fontSize:24,fontWeight:800,color:ac,letterSpacing:'-1px'}}>
                {influencer.name[0]?.toUpperCase()}
              </span>
            }
          </div>
        </div>

        {/* Name + meta */}
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:22,fontWeight:800,letterSpacing:'-0.5px',color:'var(--text-primary)',marginBottom:7,lineHeight:1.2}}>
            {influencer.name}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
            {influencer.gender&&(
              <span style={{
                fontSize:12,fontWeight:600,color:gc,
                background:`${gc}14`,padding:'3px 10px',borderRadius:20,
              }}>{GM[influencer.gender]?.icon} {influencer.gender}</span>
            )}
            {influencer.niche&&influencer.niche!=='Other'&&(
              <span style={{fontSize:12,color:'var(--text-secondary)',background:'var(--bg-tertiary)',padding:'3px 10px',borderRadius:20}}>
                {influencer.niche}
              </span>
            )}
            {influencer.age&&(
              <span style={{fontSize:12,color:'var(--text-tertiary)'}}>Age {influencer.age}</span>
            )}
          </div>
          <div style={{marginTop:8,fontSize:11,color:'var(--text-tertiary)',fontWeight:500,display:'flex',alignItems:'center',gap:5}}>
            <span style={{color:ringColor,fontWeight:700}}>{pct}%</span>
            <span>profile complete</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{display:'flex',gap:8,flexShrink:0}}>
          <button onClick={onExport} style={{
            padding:'8px 16px',borderRadius:8,fontSize:12,fontWeight:600,
            background:'var(--bg-tertiary)',color:'var(--text-primary)',
            border:'1.5px solid var(--border)',
            display:'flex',alignItems:'center',gap:5,transition:'background 0.15s',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='#E8E8ED'}
            onMouseLeave={e=>e.currentTarget.style.background='var(--bg-tertiary)'}
          >↓ Export</button>
          <button onClick={onDelete} style={{
            padding:'8px 14px',borderRadius:8,fontSize:12,fontWeight:600,
            background:'#FFF5F5',color:'#FF3B30',border:'1.5px solid #FFD2D2',
            transition:'background 0.15s',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='#FFE5E5'}
            onMouseLeave={e=>e.currentTarget.style.background='#FFF5F5'}
          >Delete</button>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Compress image to JPEG before storing (prevents localStorage crash on large photos)
function compressImage(dataUrl, maxPx = 1400, quality = 0.82) {
  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const w = Math.round(img.width * scale)
      const h = Math.round(img.height * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w; canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = dataUrl
  })
}

// ─────────────────────────────────────────────
// Single image slot
function ImageSlot({ value, onChange, label, aspectRatio='3/4', onLightbox }) {
  const ref = useRef()
  return (
    <div style={{position:'relative',width:'100%',aspectRatio}}>
      {value ? (
        <>
          <img src={value} alt={label} onClick={()=>onLightbox?.()} style={{
            width:'100%',height:'100%',objectFit:'cover',borderRadius:10,cursor:'zoom-in',display:'block'
          }}/>
          <button onClick={()=>ref.current.click()} style={{
            position:'absolute',bottom:7,left:7,padding:'3px 8px',borderRadius:5,
            background:'rgba(0,0,0,0.55)',color:'#fff',fontSize:11,fontWeight:500,
            backdropFilter:'blur(4px)',border:'1px solid rgba(255,255,255,0.15)',
          }}>Replace</button>
          <button onClick={()=>onChange(null)} style={{
            position:'absolute',bottom:7,right:7,width:24,height:24,borderRadius:'50%',
            background:'rgba(0,0,0,0.6)',color:'#fff',fontSize:13,
            display:'flex',alignItems:'center',justifyContent:'center',
            backdropFilter:'blur(4px)',border:'1px solid rgba(255,255,255,0.15)',transition:'background 0.15s',
          }}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(220,50,50,0.85)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(0,0,0,0.6)'}
          >×</button>
        </>
      ) : (
        <div onClick={()=>ref.current.click()} style={{
          width:'100%',height:'100%',borderRadius:10,
          border:'1.5px dashed var(--border)',background:'var(--bg-tertiary)',
          display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
          cursor:'pointer',gap:5,transition:'border-color 0.15s',
        }}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--accent)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}
        >
          <span style={{fontSize:20,opacity:0.22}}>+</span>
          <span style={{fontSize:11,color:'var(--text-tertiary)',fontWeight:500}}>{label}</span>
        </div>
      )}
      <input ref={ref} type="file" accept="image/*" style={{display:'none'}}
        onChange={e=>{
          const f=e.target.files[0]; if(!f) return
          const r=new FileReader()
          r.onload=ev=>compressImage(ev.target.result).then(onChange)
          r.readAsDataURL(f); e.target.value=''
        }}/>
    </div>
  )
}

// ─────────────────────────────────────────────
// Personality slider
function PersonalitySlider({ value, onChange }) {
  return (
    <div>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
        <span style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)'}}>Introvert</span>
        <span style={{fontSize:12,fontWeight:600,color:'var(--text-secondary)'}}>Extrovert</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={e=>onChange(Number(e.target.value))} style={{
        width:'100%',height:6,borderRadius:3,
        background:'linear-gradient(to right,#FBBF24,#F97316,#EF4444)',
        outline:'none',appearance:'none',WebkitAppearance:'none',cursor:'pointer',
      }}/>
      <style>{`input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:#fff;border:2px solid #F97316;box-shadow:0 1px 4px rgba(0,0,0,.15);cursor:pointer;}`}</style>
      <div style={{textAlign:'center',marginTop:7,fontSize:12,fontWeight:500,color:'#F97316'}}>{pLabel(value)}</div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Field helpers
function FL({ children }) {
  return <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>{children}</div>
}
function FI({ value, onChange, placeholder }) {
  return <input value={value} onChange={onChange} placeholder={placeholder} style={{width:'100%',padding:'10px 14px',borderRadius:'var(--radius-sm)',border:'1.5px solid var(--border)',background:'var(--bg)',fontSize:14,color:'var(--text-primary)'}}/>
}
function FTA({ value, onChange, placeholder, rows=3 }) {
  return <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={{width:'100%',padding:'10px 14px',borderRadius:'var(--radius-sm)',border:'1.5px solid var(--border)',background:'var(--bg)',fontSize:14,color:'var(--text-primary)',resize:'vertical',lineHeight:1.6}}/>
}

// ─────────────────────────────────────────────
// Gender buttons
const GM = {
  Female:       {icon:'♀',color:'#EC4899',bg:'rgba(236,72,153,0.08)',border:'#EC4899'},
  Male:         {icon:'♂',color:'#3B82F6',bg:'rgba(59,130,246,0.08)',border:'#3B82F6'},
  'Non-binary': {icon:'⚧',color:'#8B5CF6',bg:'rgba(139,92,246,0.08)',border:'#8B5CF6'},
}
function GenderButtons({ value, onChange }) {
  return (
    <div style={{display:'flex',gap:8}}>
      {Object.entries(GM).map(([g,m])=>{
        const active=value===g
        return (
          <button key={g} onClick={()=>onChange(g)} style={{
            flex:1,height:38,padding:'0 8px',borderRadius:8,fontSize:13,fontWeight:500,
            border:`1.5px solid ${active?m.border:'var(--border)'}`,
            background:active?m.bg:'var(--bg)',color:active?m.color:'var(--text-secondary)',
            transition:'all 0.18s',display:'flex',alignItems:'center',justifyContent:'center',
            gap:5,whiteSpace:'nowrap',
          }}>
            <span style={{fontSize:13,color:active?m.color:m.color+'99'}}>{m.icon}</span>
            <span>{g}</span>
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// Content pillars
function ContentPillars({ pillars=[], onChange }) {
  const [input,setInput]=useState('')
  function add(){ const t=input.trim(); if(t&&pillars.length<7){onChange([...pillars,t]);setInput('')} }
  return (
    <div>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:pillars.length?10:0}}>
        {pillars.map((p,i)=>(
          <span key={i} style={{display:'inline-flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:20,background:'var(--bg-tertiary)',fontSize:12,fontWeight:500,color:'var(--text-primary)',border:'1px solid var(--border)'}}>
            {p}<button onClick={()=>onChange(pillars.filter((_,j)=>j!==i))} style={{fontSize:13,color:'var(--text-tertiary)',lineHeight:1}}>×</button>
          </span>
        ))}
      </div>
      <div style={{display:'flex',gap:8}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&add()}
          placeholder={pillars.length>=7?'Max 7':'e.g. Morning routines…'} disabled={pillars.length>=7}
          style={{flex:1,padding:'8px 12px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--bg)',fontSize:13,color:'var(--text-primary)'}}/>
        <button onClick={add} disabled={!input.trim()||pillars.length>=7}
          style={{padding:'8px 14px',borderRadius:8,background:input.trim()?'var(--text-primary)':'var(--border)',color:input.trim()?'#fff':'var(--text-tertiary)',fontSize:13,fontWeight:600}}>Add</button>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Color palette
const DEFAULT_PALETTES = {
  Female:['#F9A8D4','#FBCFE8','#E879F9','#BE185D'],
  Male:['#93C5FD','#BFDBFE','#3B82F6','#1E3A8A'],
  'Non-binary':['#C4B5FD','#DDD6FE','#7C3AED','#4C1D95'],
}
function ColorPalette({ palette=[], onChange, gender }) {
  const defs = DEFAULT_PALETTES[gender]||['#E5E7EB','#D1D5DB','#9CA3AF','#6B7280']
  const cols = palette.length===4?palette:defs
  return (
    <div>
      <div style={{display:'flex',gap:10,alignItems:'center'}}>
        {[0,1,2,3].map(i=>(
          <label key={i} style={{cursor:'pointer'}}>
            <div style={{width:36,height:36,borderRadius:9,background:cols[i],border:'2px solid rgba(0,0,0,0.08)',boxShadow:'0 1px 4px rgba(0,0,0,0.1)',transition:'transform 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.transform='scale(1.12)'}
              onMouseLeave={e=>e.currentTarget.style.transform='scale(1)'}/>
            <input type="color" value={cols[i]} onChange={e=>{const n=[...cols];n[i]=e.target.value;onChange(n)}}
              style={{position:'absolute',width:0,height:0,opacity:0,pointerEvents:'none'}}/>
          </label>
        ))}
        <button onClick={()=>onChange(defs)} style={{marginLeft:4,padding:'5px 10px',borderRadius:7,border:'1px solid var(--border)',fontSize:11,fontWeight:500,color:'var(--text-secondary)',background:'var(--bg)'}}>Auto</button>
      </div>
      <div style={{fontSize:11,color:'var(--text-tertiary)',marginTop:6}}>Click any swatch to change color</div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Video URL helpers (used in scripts)
function ytId(u){ return u?.match(/(?:youtu\.be\/|youtube\.com\/watch\?v=)([\w-]+)/)?.[1]??null }
function domain(u){ try{return new URL(u).hostname.replace('www.','')}catch{return'link'} }

// ─────────────────────────────────────────────
// Scripts section
const SCRIPT_STATUSES = ['Planned','Shooting','Done']
const SCRIPT_STATUS_STYLE = {
  Planned:  {bg:'rgba(174,174,178,0.15)',color:'#6E6E73'},
  Shooting: {bg:'rgba(249,115,22,0.12)', color:'#F97316'},
  Done:     {bg:'rgba(52,199,89,0.12)',  color:'#34C759'},
}

function ScriptsSection({ scripts=[], influencerPrompt='', onChange }) {
  const [expanded,setExpanded]=useState(null)
  const [copied,setCopied]=useState(null)
  const [saving,setSaving]=useState(null)

  function add() {
    const s={id:generateId(),title:`Script ${scripts.length+1}`,status:'Planned',prompt:'',script:'',notes:'',videoUrl:''}
    onChange([...scripts,s])
    setExpanded(s.id)
  }
  function upd(id,k,v){ onChange(scripts.map(s=>s.id===id?{...s,[k]:v}:s)) }
  function del(id){ onChange(scripts.filter(s=>s.id!==id)); if(expanded===id) setExpanded(null) }

  function copy(text,key) {
    navigator.clipboard.writeText(text).catch(()=>{})
    setCopied(key); setTimeout(()=>setCopied(null),1600)
  }

  function save(id) {
    setSaving(id)
    setTimeout(()=>{ setExpanded(null); setSaving(null) }, 550)
  }

  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div style={{display:'flex',justifyContent:'flex-end'}}>
        <button onClick={add} style={{
          padding:'8px 18px',borderRadius:980,background:'var(--text-primary)',color:'#fff',
          fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:6,
          transition:'opacity 0.15s',
        }}>+ New Script</button>
      </div>

      {scripts.length===0&&(
        <div style={{textAlign:'center',padding:'52px 0',color:'var(--text-tertiary)'}}>
          <div style={{fontSize:36,marginBottom:10,opacity:.2}}>🎬</div>
          <div style={{fontSize:14,fontWeight:600,color:'var(--text-secondary)',marginBottom:6}}>No scripts yet</div>
          <div style={{fontSize:13}}>Plan your videos — prompts, dialogue, links.</div>
        </div>
      )}

      {scripts.map((s,idx)=>{
        const ss=SCRIPT_STATUS_STYLE[s.status]||SCRIPT_STATUS_STYLE.Planned
        const open=expanded===s.id
        const yt=ytId(s.videoUrl)
        const isSaving=saving===s.id
        return (
          <div key={s.id} style={{
            background:'var(--surface)', borderRadius:12,
            border:'1.5px solid var(--border)',
            overflow:'hidden',
            boxShadow: open ? 'var(--shadow-md)' : 'var(--shadow-sm)',
            transition:'box-shadow 0.2s',
          }}>
            {/* Header row */}
            <div
              onClick={()=>setExpanded(open?null:s.id)}
              style={{padding:'14px 18px',display:'flex',alignItems:'center',gap:12,cursor:'pointer',userSelect:'none',
                background: open ? 'var(--bg)' : 'transparent',
                transition:'background 0.15s',
              }}
            >
              <span style={{fontSize:11,fontWeight:700,color:'var(--text-tertiary)',minWidth:20}}>#{idx+1}</span>
              <span style={{flex:1,fontSize:14,fontWeight:600,color:'var(--text-primary)'}}>{s.title}</span>
              {s.videoUrl&&(
                <span style={{
                  width:20,height:20,borderRadius:5,
                  background:'rgba(52,199,89,0.15)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontSize:9,color:'#34C759',flexShrink:0,
                }}>▶</span>
              )}
              <span style={{padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:600,background:ss.bg,color:ss.color,flexShrink:0}}>{s.status}</span>
              <span style={{fontSize:18,color:'var(--text-tertiary)',transform:open?'rotate(90deg)':'rotate(0deg)',transition:'transform 0.2s',lineHeight:1}}>›</span>
            </div>

            {/* Expanded body */}
            {open&&(
              <div style={{borderTop:'1px solid var(--border)',padding:'22px 20px',display:'flex',flexDirection:'column',gap:20}}>
                {/* Title + Status */}
                <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:14,alignItems:'flex-end'}}>
                  <label>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Title</div>
                    <input value={s.title} onChange={e=>upd(s.id,'title',e.target.value)}
                      style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--bg)',fontSize:14,color:'var(--text-primary)'}}/>
                  </label>
                  <div>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Status</div>
                    <div style={{display:'flex',gap:5}}>
                      {SCRIPT_STATUSES.map(st=>{
                        const stStyle=SCRIPT_STATUS_STYLE[st]
                        return (
                          <button key={st} onClick={()=>upd(s.id,'status',st)} style={{
                            padding:'7px 12px',borderRadius:8,fontSize:12,fontWeight:600,
                            background:s.status===st?stStyle.bg:'transparent',
                            color:s.status===st?stStyle.color:'var(--text-tertiary)',
                            border:`1.5px solid ${s.status===st?stStyle.color+'44':'var(--border)'}`,
                            transition:'all 0.15s',
                          }}>{st}</button>
                        )
                      })}
                    </div>
                  </div>
                </div>

                {/* Generation Prompt */}
                <div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Generation Prompt</div>
                    <div style={{display:'flex',gap:6}}>
                      {influencerPrompt&&(
                        <button onClick={()=>upd(s.id,'prompt',influencerPrompt)} style={{padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:500,border:'1px solid var(--border)',color:'var(--text-secondary)',background:'var(--surface)'}}>
                          Use influencer prompt
                        </button>
                      )}
                      <button onClick={()=>copy(s.prompt,`p-${s.id}`)} style={{
                        padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,
                        border:'1px solid var(--border)',
                        color:copied===`p-${s.id}`?'#34C759':'var(--text-secondary)',
                        background:'var(--surface)',transition:'color 0.15s',
                      }}>{copied===`p-${s.id}`?'✓ Copied':'Copy'}</button>
                    </div>
                  </div>
                  <textarea value={s.prompt} onChange={e=>upd(s.id,'prompt',e.target.value)}
                    placeholder="Paste the Higgsfield prompt for this video scene…"
                    rows={3}
                    style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--bg)',fontSize:13,color:'var(--text-primary)',resize:'vertical',lineHeight:1.6,fontFamily:'inherit'}}/>
                </div>

                {/* Script / Dialogue */}
                <div>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                    <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.5px'}}>Script / Dialogue</div>
                    <button onClick={()=>copy(s.script,`s-${s.id}`)} style={{
                      padding:'3px 9px',borderRadius:6,fontSize:11,fontWeight:600,
                      border:'1px solid var(--border)',
                      color:copied===`s-${s.id}`?'#34C759':'var(--text-secondary)',
                      background:'var(--surface)',transition:'color 0.15s',
                    }}>{copied===`s-${s.id}`?'✓ Copied':'Copy'}</button>
                  </div>
                  <textarea value={s.script} onChange={e=>upd(s.id,'script',e.target.value)}
                    placeholder="What does the influencer say or narrate? Write the full dialogue here…"
                    rows={5}
                    style={{width:'100%',padding:'10px 14px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--bg)',fontSize:13,color:'var(--text-primary)',resize:'vertical',lineHeight:1.7,fontFamily:'inherit'}}/>
                </div>

                {/* Video URL */}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Video URL</div>
                  <input value={s.videoUrl||''} onChange={e=>upd(s.id,'videoUrl',e.target.value)}
                    placeholder="Paste Higgsfield / YouTube / Vimeo link once generated…"
                    style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--bg)',fontSize:13,color:'var(--text-primary)'}}/>
                  {s.videoUrl&&(
                    <div style={{marginTop:10,borderRadius:8,overflow:'hidden',border:'1px solid var(--border-subtle)'}}>
                      {yt
                        ?<img src={`https://img.youtube.com/vi/${yt}/mqdefault.jpg`} alt="" style={{width:'100%',display:'block',aspectRatio:'16/9',objectFit:'cover'}}/>
                        :<a href={s.videoUrl} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',gap:10,padding:'10px 14px',background:'var(--bg-tertiary)',textDecoration:'none'}}>
                          <span style={{fontSize:18,opacity:.5}}>▶</span>
                          <span style={{fontSize:12,color:'var(--text-secondary)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{domain(s.videoUrl)}</span>
                          <span style={{fontSize:11,color:'var(--text-tertiary)',marginLeft:'auto',flexShrink:0}}>Open ↗</span>
                        </a>
                      }
                    </div>
                  )}
                </div>

                {/* Notes */}
                <div>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:6}}>Notes</div>
                  <input value={s.notes||''} onChange={e=>upd(s.id,'notes',e.target.value)}
                    placeholder="Scene notes, b-roll ideas, music vibe…"
                    style={{width:'100%',padding:'9px 12px',borderRadius:8,border:'1.5px solid var(--border)',background:'var(--bg)',fontSize:13,color:'var(--text-primary)'}}/>
                </div>

                {/* Footer */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',paddingTop:6,borderTop:'1px solid var(--border)'}}>
                  <button onClick={()=>del(s.id)} style={{
                    padding:'7px 14px',borderRadius:8,border:'1.5px solid #FFD2D2',
                    color:'#FF3B30',fontSize:13,fontWeight:500,background:'#FFF5F5',
                    transition:'background 0.15s',
                  }}
                    onMouseEnter={e=>e.currentTarget.style.background='#FFE5E5'}
                    onMouseLeave={e=>e.currentTarget.style.background='#FFF5F5'}
                  >Delete</button>
                  <button onClick={()=>save(s.id)} style={{
                    padding:'8px 22px',borderRadius:8,fontSize:13,fontWeight:600,
                    background: isSaving ? '#34C759' : 'var(--text-primary)',
                    color:'#fff',
                    display:'flex',alignItems:'center',gap:6,
                    transition:'background 0.25s',
                  }}>{isSaving ? '✓ Saved' : 'Save'}</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────
// Reusable tile for the description grid
function InfoCell({ label, icon, children, span }) {
  const [focused, setFocused] = useState(false)
  return (
    <div
      style={{
        background: focused ? 'var(--surface)' : 'var(--bg)',
        borderRadius: 12,
        padding: '13px 16px',
        border: `1.5px solid ${focused ? 'var(--accent)' : 'transparent'}`,
        boxShadow: focused ? '0 0 0 3px rgba(0,113,227,0.09)' : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        gridColumn: span ? `span ${span}` : undefined,
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={() => setFocused(false)}
    >
      <div style={{
        fontSize: 9.5, fontWeight: 700, color: 'var(--text-tertiary)',
        textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 7,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        {icon && <span style={{ fontSize: 11 }}>{icon}</span>}
        {label}
      </div>
      {children}
    </div>
  )
}

// Bare input — no box, just text
function BareInput({ value, onChange, placeholder, multiline, rows = 3 }) {
  const s = {
    width: '100%', border: 'none', background: 'transparent',
    padding: 0, fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
    color: value ? 'var(--text-primary)' : 'var(--text-tertiary)',
    outline: 'none', resize: multiline ? 'vertical' : 'none',
    lineHeight: 1.6,
  }
  return multiline
    ? <textarea value={value} onChange={onChange} placeholder={placeholder} rows={rows} style={s}/>
    : <input value={value} onChange={onChange} placeholder={placeholder} style={s}/>
}

// ─────────────────────────────────────────────
// Description form — brief layout
function DescriptionForm({ influencer, onUpdate }) {
  const u = (k, v) => onUpdate(influencer.id, { [k]: v })
  const niches = getNiches(influencer.gender)
  const aPh = audiencePh(influencer.gender, influencer.niche)
  const gc = gColor(influencer.gender)
  const pv = influencer.introExtrovert ?? 50

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

      {/* ── Row 1: Identity + Personality ── */}
      <div style={{ background: 'var(--bg)', borderRadius: 12, padding: '16px 18px' }}>
        {/* Identity pills — Gender, Niche, Age as compact editable row */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <GenderButtons value={influencer.gender ?? ''} onChange={v => u('gender', v)}/>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '72px 1fr', gap: 8, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 5 }}>Age</div>
            <input value={influencer.age ?? ''} onChange={e => u('age', e.target.value)} placeholder="—"
              style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', outline: 'none' }}/>
          </div>
          <div>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 4 }}>Niche</div>
            <select value={niches.includes(influencer.niche) ? influencer.niche : (influencer.niche ? 'Other' : '')} onChange={e => u('niche', e.target.value)}
              style={{ width: '100%', border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit', fontSize: 14, fontWeight: 600, color: influencer.niche ? 'var(--text-primary)' : 'var(--text-tertiary)', outline: 'none', appearance: 'none', cursor: 'pointer' }}>
              <option value="" disabled>Select…</option>
              {niches.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>

        {/* Personality — compact visual bar */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>Personality</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: pColor(pv) }}>{pLabel(pv)}</span>
          </div>
          <input type="range" min={0} max={100} value={pv} onChange={e => u('introExtrovert', Number(e.target.value))}
            style={{ width: '100%', height: 5, borderRadius: 3, background: 'linear-gradient(to right,#FBBF24,#F97316,#EF4444)', outline: 'none', appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer' }}/>
          <style>{`input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:16px;border-radius:50%;background:#fff;border:2.5px solid ${pColor(pv)};box-shadow:0 1px 4px rgba(0,0,0,.15);cursor:pointer;}`}</style>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 5 }}>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Introvert</span>
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)' }}>Extrovert</span>
          </div>
        </div>
      </div>

      {/* ── Row 2: Backstory — prominent, full width ── */}
      <InfoCell label="Backstory" icon="✦" span={null}>
        <BareInput
          value={influencer.backstory ?? ''}
          onChange={e => u('backstory', e.target.value)}
          placeholder="Who are they? Where are they from? What drives them?"
          multiline rows={4}
        />
      </InfoCell>

      {/* ── Row 3: Audience ── */}
      <InfoCell label="Target Audience" icon="👥">
        <BareInput value={influencer.audience ?? ''} onChange={e => u('audience', e.target.value)} placeholder={aPh}/>
      </InfoCell>

      {/* ── Row 4: Style trifecta ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
        <InfoCell label="Clothing Style" icon="👗">
          <BareInput value={influencer.clothingStyle ?? ''} onChange={e => u('clothingStyle', e.target.value)} placeholder="e.g. Minimalist…"/>
        </InfoCell>
        <InfoCell label="Hobbies" icon="🎯">
          <BareInput value={influencer.hobbies ?? ''} onChange={e => u('hobbies', e.target.value)} placeholder="e.g. Yoga, travel…"/>
        </InfoCell>
        <InfoCell label="Dream Brands" icon="💎">
          <BareInput value={influencer.dreamBrands ?? ''} onChange={e => u('dreamBrands', e.target.value)} placeholder="e.g. Nike, Glossier…"/>
        </InfoCell>
      </div>

      {/* ── Row 5: Palette + Voice ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <InfoCell label="Aesthetic Palette" icon="🎨">
          <ColorPalette palette={influencer.palette ?? []} onChange={v => u('palette', v)} gender={influencer.gender}/>
        </InfoCell>
        <InfoCell label="Voice" icon="🎙">
          <BareInput value={influencer.voice ?? ''} onChange={e => u('voice', e.target.value)} placeholder="Higgsfield / ElevenLabs"/>
        </InfoCell>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────
// New influencer modal
function NewModal({ onClose, onSave }) {
  const [name,setName]=useState('')
  const [gender,setGender]=useState('')
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.4)',backdropFilter:'blur(6px)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--surface)',borderRadius:20,padding:32,width:360,boxShadow:'var(--shadow-lg)'}}>
        <h2 style={{fontSize:20,fontWeight:700,letterSpacing:'-0.4px',marginBottom:20}}>New Influencer</h2>
        <label style={{display:'block',marginBottom:16}}><FL>Name</FL><FI value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Luna Rose"/></label>
        <div style={{marginBottom:28}}><FL>Gender</FL><GenderButtons value={gender} onChange={setGender}/></div>
        <div style={{display:'flex',gap:10}}>
          <button onClick={onClose} style={{flex:1,padding:10,borderRadius:8,border:'1.5px solid var(--border)',fontSize:14,fontWeight:500,color:'var(--text-secondary)',background:'transparent'}}>Cancel</button>
          <button disabled={!name.trim()} onClick={()=>onSave(name.trim(),gender)}
            style={{flex:1,padding:10,borderRadius:8,background:name.trim()?'var(--text-primary)':'var(--border)',color:name.trim()?'#fff':'var(--text-tertiary)',fontSize:14,fontWeight:600}}>Create</button>
        </div>
      </div>
    </div>
  )
}

function Sec({ children, style }) {
  return (
    <div
      style={{background:'var(--surface)',borderRadius:'var(--radius-lg)',padding:20,boxShadow:'var(--shadow-sm)',border:'1px solid var(--border-subtle)',transition:'box-shadow 0.2s',...style}}
      onMouseEnter={e=>e.currentTarget.style.boxShadow='var(--shadow-md)'}
      onMouseLeave={e=>e.currentTarget.style.boxShadow='var(--shadow-sm)'}
    >{children}</div>
  )
}

// ─────────────────────────────────────────────
// Detail tabs with palette-tinted active state
const DETAIL_TABS = ['Description','Scripts','Wardrobe','Home','Brand Deals']

function Tabs({ active, onChange, ac }) {
  const tc = accentText(ac)
  return (
    <div style={{display:'flex',gap:6,marginBottom:20,flexWrap:'wrap'}}>
      {DETAIL_TABS.map(tab=>(
        <button key={tab} onClick={()=>onChange(tab)} style={{
          padding:'7px 16px',borderRadius:8,fontSize:13,fontWeight:500,
          background: active===tab ? ac : 'var(--bg-tertiary)',
          color: active===tab ? tc : 'var(--text-secondary)',
          border: `1.5px solid ${active===tab ? ac+'55' : 'transparent'}`,
          transition:'all 0.18s',
        }}>{tab}</button>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────
// Main export
export default function Influencers() {
  const [influencers,setInfluencers]=useInfluencers()
  const [selectedId,setSelectedId]=useState(influencers[0]?.id??null)
  const [activeTab,setActiveTab]=useState('Description')
  const [showNew,setShowNew]=useState(false)
  const [lightbox,setLightbox]=useState(null)
  const [ctxMenu,setCtxMenu]=useState(null)
  const [renameId,setRenameId]=useState(null)
  const [renameVal,setRenameVal]=useState('')

  const influencer=influencers.find(i=>i.id===selectedId)
  const ac=accent(influencer)
  const pct=influencer?completeness(influencer):0

  const topImages=influencer?[influencer.mainImage,influencer.characterSheetImage,influencer.closeUpImage1,influencer.closeUpImage2].filter(Boolean):[]

  function create(name,gender) {
    const n={
      id:generateId(),name,gender,type:'Influencer',createdAt:Date.now(),
      mainImage:null,characterSheetImage:null,closeUpImage1:null,closeUpImage2:null,
      prompt:'',age:'',backstory:'',introExtrovert:50,
      niche:'',nicheCustom:'',audience:'',hobbies:'',clothingStyle:'',dreamBrands:'',voice:'',
      contentPillars:[],palette:[],videoUrls:[],scripts:[],
      homeImages:[],wardrobeImages:[],brandDealImages:[],
    }
    setInfluencers(prev=>[...prev,n]); setSelectedId(n.id); setShowNew(false)
  }

  function upd(id,updates){ setInfluencers(prev=>prev.map(i=>i.id===id?{...i,...updates}:i)) }

  function dup(id) {
    const src=influencers.find(i=>i.id===id); if(!src) return
    const n={...src,id:generateId(),name:src.name+' (copy)',createdAt:Date.now()}
    setInfluencers(prev=>[...prev,n]); setSelectedId(n.id)
  }

  function del(id) {
    const next=influencers.filter(i=>i.id!==id)
    setInfluencers(next); setSelectedId(next[0]?.id??null)
  }

  function commitRename() {
    if(renameVal.trim()) upd(renameId,{name:renameVal.trim()})
    setRenameId(null); setRenameVal('')
  }

  function openCtx(e,id) {
    e.preventDefault()
    const inf=influencers.find(i=>i.id===id)
    setCtxMenu({x:e.clientX,y:e.clientY,id,inf})
  }

  return (
    <div style={{display:'flex',position:'fixed',top:'var(--nav-h)',left:0,right:0,bottom:0,background:'var(--bg)'}}>
      {showNew&&<NewModal onClose={()=>setShowNew(false)} onSave={create}/>}
      {lightbox&&<Lightbox images={lightbox.images} startIndex={lightbox.index} onClose={()=>setLightbox(null)}/>}
      {ctxMenu&&(
        <CtxMenu x={ctxMenu.x} y={ctxMenu.y} onClose={()=>setCtxMenu(null)}
          items={[
            {label:'Rename',       action:()=>{setSelectedId(ctxMenu.id);setRenameId(ctxMenu.id);setRenameVal(ctxMenu.inf.name)}},
            {label:'Duplicate',    action:()=>dup(ctxMenu.id)},
            {label:'Export Card',  action:()=>exportInfluencerCard(ctxMenu.inf)},
            {label:'Delete',color:'#FF6B6B',action:()=>del(ctxMenu.id)},
          ]}
        />
      )}

      {/* ── Dark sidebar */}
      <aside style={{width:216,flexShrink:0,background:SD.bg,borderRight:`1px solid ${SD.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
        <div style={{padding:'16px 16px 8px',display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:`1px solid ${SD.border}`}}>
          <span style={{fontSize:11,fontWeight:700,color:SD.dim,textTransform:'uppercase',letterSpacing:'0.6px'}}>Influencers</span>
          <button onClick={()=>setShowNew(true)} style={{width:26,height:26,borderRadius:7,background:'rgba(255,255,255,0.12)',color:SD.text,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center',transition:'background 0.15s'}}
            onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'}
            onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}
          >+</button>
        </div>

        <div className="dark-scroll" style={{flex:1,overflowY:'auto',padding:'6px 8px'}}>
          {influencers.length===0&&(
            <div style={{padding:'24px 8px',textAlign:'center',color:SD.dim,fontSize:13}}>No influencers yet</div>
          )}
          {influencers.map(inf=>{
            const pct=completeness(inf)
            const active=selectedId===inf.id
            const gc=gColor(inf.gender)
            return (
              <button key={inf.id}
                onClick={()=>setSelectedId(inf.id)}
                onContextMenu={e=>openCtx(e,inf.id)}
                style={{
                  width:'100%',padding:'10px',borderRadius:10,textAlign:'left',
                  background:active?SD.active:'transparent',
                  marginBottom:2,display:'flex',alignItems:'center',gap:10,
                  transition:'background 0.15s',
                }}
                onMouseEnter={e=>{ if(!active) e.currentTarget.style.background=SD.hover }}
                onMouseLeave={e=>{ if(!active) e.currentTarget.style.background='transparent' }}
              >
                {/* Avatar + ring */}
                <div style={{position:'relative',width:40,height:40,flexShrink:0}}>
                  <Ring pct={pct} size={42}/>
                  <div style={{position:'absolute',top:3,left:3,width:34,height:34,borderRadius:inf.mainImage?'50%':8,overflow:'hidden',background:'rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'center',transition:'border-radius 0.2s'}}>
                    {inf.mainImage
                      ?<img src={inf.mainImage} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                      :<span style={{fontSize:14,fontWeight:700,color:SD.dim}}>{inf.name[0]?.toUpperCase()}</span>
                    }
                  </div>
                </div>
                {/* Name + gender */}
                <div style={{minWidth:0,flex:1}}>
                  {renameId===inf.id?(
                    <input autoFocus value={renameVal} onChange={e=>setRenameVal(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={e=>{if(e.key==='Enter')commitRename();if(e.key==='Escape')setRenameId(null)}}
                      onClick={e=>e.stopPropagation()}
                      style={{fontSize:13,fontWeight:600,border:'none',background:'transparent',color:SD.text,outline:'none',width:'100%'}}/>
                  ):(
                    <div style={{fontSize:13,fontWeight:600,color:SD.text,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{inf.name}</div>
                  )}
                  <div style={{fontSize:11,color:inf.gender?gc:SD.dim,marginTop:1}}>{inf.gender||'Influencer'}</div>
                </div>
                {/* Pct badge */}
                <div style={{fontSize:10,fontWeight:700,color:SD.dim,flexShrink:0}}>{pct}%</div>
              </button>
            )
          })}
        </div>
      </aside>

      {/* ── Main */}
      {influencer ? (
        <main style={{flex:1,overflow:'auto',padding:'20px 24px',display:'flex',flexDirection:'column',gap:14,backgroundImage:'radial-gradient(ellipse at 75% 0%, rgba(0,113,227,0.04) 0%, transparent 55%)'}}>
          {/* Hero banner */}
          <HeroBanner influencer={influencer} pct={pct} onExport={()=>exportInfluencerCard(influencer)} onDelete={()=>del(influencer.id)}/>

          {/* Three image sections */}
          <Sec>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--text-secondary)',marginBottom:8}}>Image</div>
                <ImageSlot value={influencer.mainImage} onChange={v=>upd(influencer.id,{mainImage:v})} label="Main image" aspectRatio="3/4"
                  onLightbox={()=>setLightbox({images:topImages,index:topImages.indexOf(influencer.mainImage)})}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--text-secondary)',marginBottom:8}}>Character Sheet</div>
                <ImageSlot value={influencer.characterSheetImage} onChange={v=>upd(influencer.id,{characterSheetImage:v})} label="Character sheet" aspectRatio="3/4"
                  onLightbox={()=>setLightbox({images:topImages,index:topImages.indexOf(influencer.characterSheetImage)})}/>
              </div>
              <div>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.5px',color:'var(--text-secondary)',marginBottom:8}}>Close Ups</div>
                <div style={{display:'flex',flexDirection:'column',gap:8}}>
                  <ImageSlot value={influencer.closeUpImage1} onChange={v=>upd(influencer.id,{closeUpImage1:v})} label="Close up 1" aspectRatio="3/2"
                    onLightbox={()=>setLightbox({images:topImages,index:topImages.indexOf(influencer.closeUpImage1)})}/>
                  <ImageSlot value={influencer.closeUpImage2} onChange={v=>upd(influencer.id,{closeUpImage2:v})} label="Close up 2" aspectRatio="3/2"
                    onLightbox={()=>setLightbox({images:topImages,index:topImages.indexOf(influencer.closeUpImage2)})}/>
                </div>
              </div>
            </div>
          </Sec>

          {/* Prompt */}
          <Sec>
            <div style={{fontSize:11,fontWeight:700,color:'var(--text-secondary)',textTransform:'uppercase',letterSpacing:'0.5px',marginBottom:10}}>Prompt</div>
            <textarea value={influencer.prompt} onChange={e=>upd(influencer.id,{prompt:e.target.value})}
              placeholder="Paste your prompt here" rows={3}
              style={{width:'100%',padding:'10px 14px',borderRadius:'var(--radius-sm)',border:'1.5px solid var(--border)',background:'var(--bg)',fontSize:14,color:'var(--text-primary)',resize:'vertical',lineHeight:1.6}}/>
          </Sec>

          {/* Detail tabs */}
          <Sec style={{marginBottom:20}}>
            <Tabs active={activeTab} onChange={setActiveTab} ac={ac}/>

            {activeTab==='Description' && <DescriptionForm influencer={influencer} onUpdate={upd}/>}
            {activeTab==='Scripts' && (
              <ScriptsSection
                scripts={influencer.scripts??[]}
                influencerPrompt={influencer.prompt}
                onChange={s=>upd(influencer.id,{scripts:s})}
              />
            )}
            {activeTab==='Wardrobe' && (
              <MasonryGrid images={influencer.wardrobeImages??[]} onChange={imgs=>upd(influencer.id,{wardrobeImages:imgs})} emptyLabel="Add wardrobe images" cols={3}/>
            )}
            {activeTab==='Home' && (
              <MasonryGrid images={influencer.homeImages??[]} onChange={imgs=>upd(influencer.id,{homeImages:imgs})} emptyLabel="Add home / room photos" cols={3}/>
            )}
            {activeTab==='Brand Deals' && (
              <ImageGrid images={influencer.brandDealImages??[]} onChange={imgs=>upd(influencer.id,{brandDealImages:imgs})} emptyLabel="Add brand" columns={4}/>
            )}
          </Sec>
        </main>
      ) : (
        <main style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:14,color:'var(--text-tertiary)'}}>
          <div style={{fontSize:40}}>✦</div>
          <p style={{fontSize:15,fontWeight:500}}>No influencer selected</p>
          <button onClick={()=>setShowNew(true)} style={{padding:'10px 24px',borderRadius:980,background:'var(--text-primary)',color:'#fff',fontSize:14,fontWeight:600}}>
            Create your first influencer
          </button>
        </main>
      )}
    </div>
  )
}
