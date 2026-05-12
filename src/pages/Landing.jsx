import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const WORDS = ['Influencer', 'Creator', 'Avatar', 'Celebrity']
const TYPE_SPEED = 75
const DELETE_SPEED = 45
const PAUSE_MS = 1800

function useTypewriter() {
  const [text, setText] = useState('')
  const [wordIdx, setWordIdx] = useState(0)
  const [phase, setPhase] = useState('typing')

  useEffect(() => {
    const word = WORDS[wordIdx]
    if (phase === 'typing') {
      if (text.length < word.length) {
        const t = setTimeout(() => setText(word.slice(0, text.length + 1)), TYPE_SPEED)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setPhase('deleting'), PAUSE_MS)
        return () => clearTimeout(t)
      }
    }
    if (phase === 'deleting') {
      if (text.length > 0) {
        const t = setTimeout(() => setText(text.slice(0, -1)), DELETE_SPEED)
        return () => clearTimeout(t)
      } else {
        setWordIdx(i => (i + 1) % WORDS.length)
        setPhase('typing')
      }
    }
  }, [text, phase, wordIdx])

  return text
}

// 6 cards — 3 left, 3 right
// outer: position + static rotation
// inner: float + sway animation (keeps rotation clean)
const CARDS = [
  // LEFT
  { src: '/inf/i1.png', left: '-28px', top: '6%',  w: 158, rot: '-9deg',  opacity: 0.50, period: 8,  sway: 11, delay: 0.0 },
  { src: '/inf/i2.png', left:  '28px', top: '43%', w: 138, rot:  '5deg',  opacity: 0.38, period: 10, sway: 14, delay: 1.6 },
  { src: '/inf/i3.jpg', left: '-14px', top: '74%', w: 146, rot: '-5deg',  opacity: 0.42, period: 12, sway: 16, delay: 0.8 },
  // RIGHT
  { src: '/inf/i4.jpg', right: '-28px',top: '4%',  w: 160, rot:  '10deg', opacity: 0.50, period: 9,  sway: 13, delay: 0.4 },
  { src: '/inf/i5.png', right:  '24px',top: '42%', w: 140, rot: '-7deg',  opacity: 0.38, period: 11, sway: 15, delay: 2.0 },
  { src: '/inf/i6.jpg', right: '-16px',top: '72%', w: 148, rot:  '6deg',  opacity: 0.44, period: 13, sway: 17, delay: 1.2 },
]

export default function Landing() {
  const navigate = useNavigate()
  const animatedWord = useTypewriter()

  return (
    <div style={{
      minHeight: '100vh',
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#07070E',
      overflow: 'hidden',
      padding: 'calc(var(--nav-h) + 40px) 24px 80px',
      textAlign: 'center',
    }}>

      {/* Orbs */}
      <div style={{ position:'absolute', width:760, height:760, top:'-22%', left:'-18%', borderRadius:'50%', background:'radial-gradient(circle, rgba(236,72,153,0.28) 0%, transparent 65%)', animation:'orb1 14s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:620, height:620, top:'-14%', right:'-12%', borderRadius:'50%', background:'radial-gradient(circle, rgba(0,113,227,0.22) 0%, transparent 65%)', animation:'orb2 19s ease-in-out infinite', pointerEvents:'none' }}/>
      <div style={{ position:'absolute', width:820, height:820, bottom:'-32%', left:'18%', borderRadius:'50%', background:'radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)', animation:'orb3 23s ease-in-out infinite', pointerEvents:'none' }}/>

      {/* Dot grid */}
      <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize:'32px 32px', pointerEvents:'none' }}/>

      {/* ── Floating influencer cards ── */}
      {CARDS.map((card, i) => {
        const pos = {}
        if (card.left  !== undefined) pos.left  = card.left
        if (card.right !== undefined) pos.right = card.right
        return (
          <div
            key={i}
            className="landing-card"
            style={{
              position: 'absolute',
              top: card.top,
              ...pos,
              width: card.w,
              transform: `rotate(${card.rot})`,
              opacity: 0,
              animation: `cardAppear 1s ease ${card.delay + 0.2}s forwards`,
              pointerEvents: 'none',
              zIndex: 0,
            }}
          >
            {/* Inner: float + sway — doesn't disturb rotation above */}
            <div style={{
              animation: `cardFloat ${card.period}s ease-in-out ${card.delay}s infinite, cardSway ${card.sway}s ease-in-out ${card.delay * 0.7}s infinite`,
              borderRadius: 18,
              overflow: 'hidden',
              boxShadow: '0 28px 70px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.09)',
              '--target-opacity': card.opacity,
            }}>
              <img
                src={card.src}
                alt=""
                style={{ width: '100%', aspectRatio: '2/3', objectFit: 'cover', display: 'block' }}
              />
              {/* Bottom gradient for mood */}
              <div style={{ position:'absolute', inset:0, background:'linear-gradient(to top, rgba(7,7,14,0.45) 0%, transparent 55%)' }}/>
            </div>
          </div>
        )
      })}

      {/* Vignette — fades card edges toward center */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse at 50% 50%, transparent 30%, rgba(7,7,14,0.82) 100%)',
        pointerEvents: 'none', zIndex: 1,
      }}/>

      {/* ── Center content ── */}
      <div style={{ maxWidth: 620, position: 'relative', zIndex: 2 }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.52)',
          padding: '6px 16px 6px 12px', borderRadius: 20,
          fontSize: 12, fontWeight: 600, letterSpacing: '0.3px',
          marginBottom: 40, border: '1px solid rgba(255,255,255,0.09)',
          backdropFilter: 'blur(8px)',
        }}>
          <span style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'center', width:10, height:10 }}>
            <span style={{ position:'absolute', width:10, height:10, borderRadius:'50%', background:'#34C759', opacity:0.35, animation:'ping 1.8s ease-out infinite' }}/>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#34C759', flexShrink:0 }}/>
          </span>
          Made by Dan Kieft
        </div>

        <h1 style={{ fontSize:'clamp(48px,9vw,88px)', fontWeight:800, letterSpacing:'-3px', lineHeight:1.0, color:'#fff', marginBottom:2 }}>
          Create Your
        </h1>

        <div style={{
          fontSize: 'clamp(48px,9vw,88px)', fontWeight:800, letterSpacing:'-3px', lineHeight:1.1,
          minHeight: '1.15em', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:32,
        }}>
          <span style={{ background:'linear-gradient(135deg, #EC4899 0%, #A855F7 50%, #60A5FA 100%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            {animatedWord}
          </span>
          <span style={{ display:'inline-block', width:4, height:'0.7em', background:'linear-gradient(to bottom, #EC4899, #A855F7)', marginLeft:5, borderRadius:2, animation:'blink 1s step-end infinite', verticalAlign:'middle', flexShrink:0 }}/>
        </div>

        <p style={{ fontSize:18, color:'rgba(255,255,255,0.36)', lineHeight:1.65, margin:'0 auto 48px', maxWidth:400, fontWeight:400, letterSpacing:'-0.1px' }}>
          Manage your AI generated influencers.
        </p>

        <button
          onClick={() => navigate('/influencers')}
          style={{
            padding:'15px 52px', borderRadius:980,
            background:'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
            color:'#fff', fontSize:16, fontWeight:700, letterSpacing:'-0.2px',
            boxShadow:'0 0 32px rgba(168,85,247,0.45), 0 4px 20px rgba(0,0,0,0.5)',
            transition:'transform 0.18s, box-shadow 0.18s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='scale(1.04) translateY(-2px)'; e.currentTarget.style.boxShadow='0 0 60px rgba(168,85,247,0.65), 0 8px 32px rgba(0,0,0,0.5)' }}
          onMouseLeave={e => { e.currentTarget.style.transform='scale(1) translateY(0)'; e.currentTarget.style.boxShadow='0 0 32px rgba(168,85,247,0.45), 0 4px 20px rgba(0,0,0,0.5)' }}
        >
          Get Started →
        </button>
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @keyframes ping {
          0%        { transform: scale(1); opacity: 0.35; }
          80%, 100% { transform: scale(2.4); opacity: 0; }
        }
        @keyframes orb1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          33%       { transform: translate(55px,-45px) scale(1.07); }
          66%       { transform: translate(-35px,38px) scale(0.93); }
        }
        @keyframes orb2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50%       { transform: translate(-45px,55px) scale(1.11); }
        }
        @keyframes orb3 {
          0%, 100% { transform: translate(0,0) scale(1); }
          40%       { transform: translate(35px,-55px) scale(0.90); }
          70%       { transform: translate(-55px,22px) scale(1.08); }
        }
        /* Float: gentle vertical drift */
        @keyframes cardFloat {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-18px); }
        }
        /* Sway: subtle X drift — gives organic independent life */
        @keyframes cardSway {
          0%, 100% { transform: translateX(0px); }
          25%       { transform: translateX(5px); }
          75%       { transform: translateX(-4px); }
        }
        /* Appear: fade in from below, no transform (rotation lives on parent) */
        @keyframes cardAppear {
          from { opacity: 0; }
          to   { opacity: var(--target-opacity, 0.44); }
        }
        .landing-card { display: block; }
        @media (max-width: 860px) { .landing-card { display: none; } }
      `}</style>
    </div>
  )
}
