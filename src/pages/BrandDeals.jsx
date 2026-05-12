import { useState, useRef } from 'react'
import { useBrandDeals, generateId } from '../store'

function NewDealModal({ onClose, onSave }) {
  const [brand, setBrand] = useState('')
  const [category, setCategory] = useState('')
  const [image, setImage] = useState(null)
  const fileRef = useRef()

  function handleFile(e) {
    const f = e.target.files[0]
    if (!f) return
    const r = new FileReader()
    r.onload = ev => setImage(ev.target.result)
    r.readAsDataURL(f)
    e.target.value = ''
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 200,
    }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{
        background: 'var(--surface)', borderRadius: 20,
        padding: 32, width: 380, boxShadow: 'var(--shadow-lg)',
      }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 20 }}>New Brand Deal</h2>

        <label style={{ display: 'block', marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Brand Name</div>
          <input
            autoFocus
            value={brand}
            onChange={e => setBrand(e.target.value)}
            placeholder="e.g. Nike"
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 14, color: 'var(--text-primary)' }}
          />
        </label>

        <label style={{ display: 'block', marginBottom: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Category</div>
          <input
            value={category}
            onChange={e => setCategory(e.target.value)}
            placeholder="e.g. Fitness, Beauty, Tech..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid var(--border)', background: 'var(--bg)', fontSize: 14, color: 'var(--text-primary)' }}
          />
        </label>

        {/* Image upload */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>Brand Image</div>
          <div
            onClick={() => fileRef.current.click()}
            style={{
              width: '100%', aspectRatio: '16/9',
              borderRadius: 10,
              border: image ? 'none' : '1.5px dashed var(--border)',
              background: image ? 'transparent' : 'var(--bg-tertiary)',
              overflow: 'hidden',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexDirection: 'column', gap: 6,
            }}
            onMouseEnter={e => { if (!image) e.currentTarget.style.borderColor = 'var(--accent)' }}
            onMouseLeave={e => { if (!image) e.currentTarget.style.borderColor = 'var(--border)' }}
          >
            {image
              ? <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <>
                  <span style={{ fontSize: 22, opacity: 0.25 }}>+</span>
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Upload brand image</span>
                </>
            }
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 10, borderRadius: 8, border: '1.5px solid var(--border)', fontSize: 14, fontWeight: 500, color: 'var(--text-secondary)', background: 'transparent' }}>Cancel</button>
          <button
            disabled={!brand.trim()}
            onClick={() => onSave({ brand, category, image })}
            style={{ flex: 1, padding: 10, borderRadius: 8, background: brand.trim() ? 'var(--text-primary)' : 'var(--border)', color: brand.trim() ? '#fff' : 'var(--text-tertiary)', fontSize: 14, fontWeight: 600 }}
          >Add Deal</button>
        </div>
      </div>
    </div>
  )
}

function DealCard({ deal, onDelete }) {
  return (
    <div style={{
      background: 'var(--surface)',
      borderRadius: 'var(--radius-lg)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)',
      border: '1px solid var(--border-subtle)',
      transition: 'box-shadow 0.18s, transform 0.18s',
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.transform = 'translateY(0)' }}
    >
      {/* Image */}
      <div style={{ aspectRatio: '16/9', background: 'var(--bg-tertiary)', overflow: 'hidden' }}>
        {deal.image
          ? <img src={deal.image} alt={deal.brand} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 32, fontWeight: 800, color: 'var(--text-tertiary)', opacity: 0.3 }}>{deal.brand[0]}</span>
            </div>
        }
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{deal.brand}</div>
          {deal.category && <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginTop: 2 }}>{deal.category}</div>}
        </div>
        <button
          onClick={() => onDelete(deal.id)}
          style={{ width: 28, height: 28, borderRadius: '50%', background: '#FFF5F5', color: '#FF3B30', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >×</button>
      </div>
    </div>
  )
}

export default function BrandDeals() {
  const [deals, setDeals] = useBrandDeals()
  const [showNew, setShowNew] = useState(false)

  function addDeal({ brand, category, image }) {
    setDeals(prev => [...prev, { id: generateId(), brand, category, image, createdAt: Date.now() }])
    setShowNew(false)
  }

  function deleteDeal(id) {
    setDeals(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div style={{ paddingTop: 'var(--nav-h)', minHeight: '100vh', background: 'var(--bg)' }}>
      {showNew && <NewDealModal onClose={() => setShowNew(false)} onSave={addDeal} />}

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-0.6px' }}>Brand Deals</h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 4 }}>
              {deals.length} deal{deals.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            onClick={() => setShowNew(true)}
            style={{
              padding: '9px 20px', borderRadius: 980,
              background: 'var(--text-primary)', color: '#fff',
              fontSize: 14, fontWeight: 600,
            }}
          >+ New Deal</button>
        </div>

        {deals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-tertiary)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>✦</div>
            <p style={{ fontSize: 15, fontWeight: 500, marginBottom: 8 }}>No brand deals yet</p>
            <p style={{ fontSize: 13 }}>Add brands you want to promote with your influencers</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
            {deals.map(deal => (
              <DealCard key={deal.id} deal={deal} onDelete={deleteDeal} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
