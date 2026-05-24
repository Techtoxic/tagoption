'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const DERIV_WS = 'wss://ws.derivws.com/websockets/v3?app_id=1089'
const MARKETS = [
  { sym:'R_10_1S',  label:'Vol 10 (1s)' },
  { sym:'R_10',     label:'Vol 10' },
  { sym:'R_15_1S',  label:'Vol 15 (1s)' },
  { sym:'R_25_1S',  label:'Vol 25 (1s)' },
  { sym:'R_25',     label:'Vol 25' },
  { sym:'R_50_1S',  label:'Vol 50 (1s)' },
  { sym:'R_50',     label:'Vol 50' },
  { sym:'R_75_1S',  label:'Vol 75 (1s)' },
  { sym:'R_75',     label:'Vol 75' },
  { sym:'R_100_1S', label:'Vol 100 (1s)' },
  { sym:'R_100',    label:'Vol 100' },
]
const TRADE_TYPES = ['Matches/Differs', 'Even/Odd', 'Over/Under']

/* ─── Deriv WebSocket hook ─── */
function useDerivWS(symbol) {
  const wsRef = useRef(null)
  const [ticks, setTicks] = useState([])
  const [price, setPrice] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null }
    setTicks([]); setPrice(null); setConnected(false)
    const ws = new WebSocket(DERIV_WS)
    wsRef.current = ws
    ws.onopen = () => {
      setConnected(true)
      ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 }))
    }
    ws.onmessage = e => {
      const d = JSON.parse(e.data)
      if (d.msg_type === 'tick') {
        const p = d.tick.quote
        setPrice(p)
        setTicks(prev => [...prev, { price: p, time: d.tick.epoch * 1000 }].slice(-300))
      }
    }
    ws.onclose = () => setConnected(false)
    ws.onerror = () => setConnected(false)
    return () => { ws.close(); wsRef.current = null }
  }, [symbol])

  return { ticks, price, connected }
}

/* ─── Price Chart ─── */
function PriceChart({ ticks, mockTicks }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(null)
  const data = ticks.length >= 2 ? ticks : mockTicks

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return

    function draw() {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      if (!W || !H) { rafRef.current = requestAnimationFrame(draw); return }
      canvas.width = W; canvas.height = H
      const ctx = canvas.getContext('2d')
      const prices = data.map(d => d.price)
      const times = data.map(d => d.time)
      const mn = Math.min(...prices), mx = Math.max(...prices)
      const range = mx - mn || 1
      const pad = { t: 10, b: 28, l: 8, r: 62 }
      const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b
      const toX = i => pad.l + (i / (prices.length - 1)) * cW
      const toY = v => pad.t + cH - ((v - mn) / range) * cH

      ctx.clearRect(0, 0, W, H)

      // Grid lines + right axis labels
      ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + (i / 4) * cH
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke()
        ctx.fillStyle = 'rgba(136,146,164,0.75)'; ctx.font = '9px DM Sans,sans-serif'; ctx.textAlign = 'left'
        ctx.fillText((mx - (i / 4) * range).toFixed(2), pad.l + cW + 4, y + 3)
      }

      // Time labels on x-axis
      const lc = Math.min(5, prices.length)
      ctx.fillStyle = 'rgba(136,146,164,0.6)'; ctx.font = '8px DM Sans,sans-serif'; ctx.textAlign = 'center'
      for (let i = 0; i < lc; i++) {
        const idx = Math.floor((i / (lc - 1)) * (prices.length - 1))
        const t = new Date(times[idx])
        const hh = t.getHours().toString().padStart(2, '0')
        const mm = t.getMinutes().toString().padStart(2, '0')
        const ss = t.getSeconds().toString().padStart(2, '0')
        ctx.fillText(`${hh}:${mm}:${ss}`, toX(idx), H - 4)
      }

      // Gradient fill
      ctx.beginPath()
      prices.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
      ctx.lineTo(toX(prices.length - 1), pad.t + cH)
      ctx.lineTo(toX(0), pad.t + cH)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
      grad.addColorStop(0, 'rgba(255,255,255,0.07)')
      grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad; ctx.fill()

      // Line
      ctx.beginPath()
      prices.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()

      // Live dot + price tag
      const lx = toX(prices.length - 1), ly = toY(prices[prices.length - 1])
      ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'; ctx.fill()
      ctx.fillStyle = '#3b7bff'
      ctx.beginPath()
      if (ctx.roundRect) ctx.roundRect(lx + 4, ly - 10, 66, 20, 3)
      else { ctx.rect(lx + 4, ly - 10, 66, 20) }
      ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 9px DM Sans,sans-serif'; ctx.textAlign = 'left'
      ctx.fillText(prices[prices.length - 1].toFixed(2), lx + 8, ly + 3)
    }

    draw()
    rafRef.current = requestAnimationFrame(function loop() { draw(); rafRef.current = requestAnimationFrame(loop) })
    return () => cancelAnimationFrame(rafRef.current)
  }, [data])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
}

/* ─── Digit Row ─── */
function DigitRow({ ticks, mockTicks }) {
  const src = ticks.length >= 10 ? ticks : mockTicks
  const last10 = src.slice(-10)
  const digits = last10.map(t => {
    const s = t.price.toFixed(2).replace('.', '')
    return parseInt(s[s.length - 1])
  })
  const counts = Array(10).fill(0)
  const sample = src.slice(-100)
  sample.forEach(t => {
    const s = t.price.toFixed(2).replace('.', '')
    counts[parseInt(s[s.length - 1])]++
  })
  const tot = sample.length || 1
  const pcts = counts.map(c => ((c / tot) * 100).toFixed(1))

  // figure out highlighted digit (last one)
  const lastDigit = digits[digits.length - 1]

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 4,
      padding: '10px 8px', background: '#0b0d14',
      borderTop: '1px solid rgba(255,255,255,0.06)',
      overflowX: 'auto', flexShrink: 0
    }}>
      {Array.from({ length: 10 }, (_, d) => {
        const isLast = d === lastDigit
        const pct = pcts[d]
        const highlight = isLast
        const borderColor = highlight ? (d === 5 ? '#ff4757' : '#3b7bff') : 'rgba(255,255,255,0.12)'
        const bg = highlight ? (d === 5 ? 'rgba(255,71,87,0.2)' : 'rgba(59,123,255,0.2)') : 'transparent'
        return (
          <div key={d} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              border: `2px solid ${borderColor}`,
              background: bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, fontWeight: 700,
              color: highlight ? '#fff' : 'rgba(226,232,240,0.5)'
            }}>{d}</div>
            <span style={{ fontSize: 8.5, color: 'rgba(136,146,164,0.8)', whiteSpace: 'nowrap' }}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

/* ─── Main Component ─── */
export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [market, setMarket] = useState(MARKETS[0])
  const [showMarketDrop, setShowMarketDrop] = useState(false)
  const [tradeType, setTradeType] = useState('Even/Odd')
  const [autoMode, setAutoMode] = useState(true)
  const [stake, setStake] = useState(10)
  const [positions, setPositions] = useState([])
  const [balance, setBalance] = useState(0)
  const [bottomTab, setBottomTab] = useState('trade') // 'trade' | 'ai' | 'positions'
  const [showBanner, setShowBanner] = useState(true)
  const [muted, setMuted] = useState(false)
  const mockRef = useRef([])
  const [mockTicks, setMockTicks] = useState([])
  const marketDropRef = useRef(null)

  // Build mock ticks on mount
  useEffect(() => {
    let base = 9500
    const arr = []
    for (let i = 0; i < 150; i++) {
      base += (Math.random() - 0.48) * 2.5
      arr.push({ price: base, time: Date.now() - (150 - i) * 1000 })
    }
    mockRef.current = arr
    setMockTicks([...arr])
    const t = setInterval(() => {
      base += (Math.random() - 0.48) * 2.5
      mockRef.current = [...mockRef.current, { price: base, time: Date.now() }].slice(-300)
      setMockTicks([...mockRef.current])
    }, 1000)
    return () => clearInterval(t)
  }, [])

  const { ticks, price, connected } = useDerivWS(market.sym)

  useEffect(() => {
    const s = localStorage.getItem('tagoption_user')
    if (!s) { router.push('/login'); return }
    setUser(JSON.parse(s))
  }, [router])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = e => {
      if (marketDropRef.current && !marketDropRef.current.contains(e.target)) setShowMarketDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const displayPrice = price ?? mockTicks.at(-1)?.price ?? 9500
  const payout = (stake * 1.9522).toFixed(2)
  const openPos = positions.filter(p => p.status === 'open')
  const closedPos = positions.filter(p => p.status !== 'open')

  const placeTrade = (type) => {
    const id = Date.now()
    const entry = price || mockTicks.at(-1)?.price || 9500
    setPositions(prev => [{ id, type, stake, entry, time: new Date().toLocaleTimeString(), status: 'open', payout: parseFloat(payout) }, ...prev])
    setTimeout(() => {
      setPositions(prev => prev.map(t => {
        if (t.id !== id) return t
        const cur = price || mockTicks.at(-1)?.price || entry
        const ld = Math.floor(cur * 100) % 10
        let win = false
        if (type === 'even') win = ld % 2 === 0
        if (type === 'odd') win = ld % 2 !== 0
        if (type === 'over') win = ld > 4
        if (type === 'under') win = ld < 5
        const profit = win ? +(t.payout - t.stake).toFixed(2) : -t.stake
        setBalance(b => +(b + profit).toFixed(2))
        return { ...t, status: win ? 'won' : 'lost', profit }
      }))
    }, 5000)
  }

  if (!user) return <div style={{ background: '#0b0d14', minHeight: '100vh' }} />

  const priceChange = ticks.length >= 2
    ? (ticks.at(-1).price - ticks[0].price).toFixed(2)
    : '+0.02'
  const priceChangePos = parseFloat(priceChange) >= 0

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow: hidden; }
        .dash-root { display: flex; flex-direction: column; height: 100dvh; background: #0b0d14; color: #e2e8f0; font-family: 'DM Sans', sans-serif; overflow: hidden; }

        /* scrollbar hide */
        .no-scroll::-webkit-scrollbar { display: none; }
        .no-scroll { -ms-overflow-style: none; scrollbar-width: none; }

        /* trade type tab row */
        .tab-row { display: flex; overflow-x: auto; background: #0b0d14; border-bottom: 1px solid rgba(255,255,255,0.07); flex-shrink: 0; }
        .tab-row::-webkit-scrollbar { display: none; }
        .tab-btn { flex-shrink: 0; padding: 11px 16px; font-size: 13px; font-weight: 600; color: #8892a4; border: none; background: transparent; cursor: pointer; border-bottom: 2px solid transparent; display: flex; align-items: center; gap: 6px; white-space: nowrap; }
        .tab-btn.active { color: #3b7bff; border-bottom-color: #3b7bff; }

        /* quick stake buttons */
        .stake-btn { flex: 1; padding: 7px 0; border-radius: 7px; border: 1px solid rgba(255,255,255,0.08); background: #141828; color: #8892a4; font-size: 12px; font-weight: 600; cursor: pointer; }
        .stake-btn.active { border-color: #3b7bff; background: rgba(59,123,255,0.18); color: #3b7bff; }

        /* trade action buttons */
        .trade-btn-even { flex: 1; padding: 14px 12px; border-radius: 12px; border: none; cursor: pointer; background: #00c97b; color: #fff; font-size: 15px; font-weight: 700; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
        .trade-btn-odd  { flex: 1; padding: 14px 12px; border-radius: 12px; border: none; cursor: pointer; background: #ff4757; color: #fff; font-size: 15px; font-weight: 700; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
        .trade-btn-over  { flex: 1; padding: 14px 12px; border-radius: 12px; border: none; cursor: pointer; background: #00c97b; color: #fff; font-size: 15px; font-weight: 700; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }
        .trade-btn-under { flex: 1; padding: 14px 12px; border-radius: 12px; border: none; cursor: pointer; background: #ff4757; color: #fff; font-size: 15px; font-weight: 700; display: flex; flex-direction: column; align-items: flex-start; gap: 2px; }

        /* bottom nav */
        .bottom-nav { display: flex; background: #0f1220; border-top: 1px solid rgba(255,255,255,0.07); flex-shrink: 0; }
        .bottom-nav-btn { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px; padding: 10px 0; border: none; background: transparent; cursor: pointer; color: #8892a4; font-size: 11px; font-weight: 500; }
        .bottom-nav-btn.active { color: #3b7bff; }

        /* market dropdown */
        .mkt-drop { position: absolute; top: calc(100% + 4px); left: 0; width: 220px; background: #141828; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.8); z-index: 500; overflow: hidden; max-height: 260px; overflow-y: auto; }
        .mkt-drop::-webkit-scrollbar { width: 4px; }
        .mkt-drop::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .mkt-opt { width: 100%; padding: 10px 14px; border: none; background: transparent; color: #e2e8f0; font-size: 13px; text-align: left; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,0.04); display: flex; align-items: center; gap: 8px; }
        .mkt-opt:hover { background: rgba(59,123,255,0.1); }
        .mkt-opt.selected { background: rgba(59,123,255,0.15); color: #3b7bff; }

        @media (max-width: 380px) {
          .tab-btn { padding: 10px 12px; font-size: 12px; }
          .stake-btn { font-size: 11px; }
        }
      `}</style>

      <div className="dash-root">

        {/* ── APP BANNER ── */}
        {showBanner && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 14px', background: '#1a1f35',
            borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: '#3b7bff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 700 }}>Get the TagOption App</div>
              <div style={{ fontSize: 11, color: '#8892a4', marginTop: 1 }}>Get a better trading experience</div>
            </div>
            <button style={{
              padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.2)',
              background: 'transparent', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0
            }}>Download</button>
            <button onClick={() => setShowBanner(false)} style={{
              width: 24, height: 24, borderRadius: 6, border: 'none',
              background: 'rgba(255,255,255,0.08)', color: '#8892a4', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}

        {/* ── TOP NAV ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '0 12px', height: 50,
          background: '#0f1220', borderBottom: '1px solid rgba(255,255,255,0.07)',
          flexShrink: 0
        }}>
          {/* Hamburger */}
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8892a4', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>

          {/* Avatar */}
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: '#3b7bff',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0
          }}>{user?.name?.[0]?.toUpperCase() || 'T'}</div>

          {/* Balance */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 9px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)', background: '#141828'
          }}>
            <span style={{
              width: 18, height: 18, borderRadius: 5,
              background: '#ff4757', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 9, fontWeight: 700, flexShrink: 0
            }}>R</span>
            <span style={{ fontSize: 13, fontWeight: 700 }}>$ {balance.toFixed(2)}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8892a4" strokeWidth="2.5">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </div>

          <div style={{ flex: 1 }} />

          {/* Sound */}
          <button onClick={() => setMuted(m => !m)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8892a4', padding: 4 }}>
            {muted
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
            }
          </button>

          {/* Deposit */}
          <button style={{
            padding: '7px 14px', borderRadius: 8, border: 'none',
            background: '#3b7bff', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer'
          }}>Deposit</button>

          {/* Bell */}
          <button style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#8892a4', padding: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/>
            </svg>
          </button>
        </div>

        {/* ── TRADE TYPE TABS ── */}
        <div className="tab-row">
          {TRADE_TYPES.map(t => (
            <button key={t} className={`tab-btn ${tradeType === t ? 'active' : ''}`} onClick={() => setTradeType(t)}>
              {t === 'Matches/Differs' && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
              )}
              {t === 'Even/Odd' && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
                </svg>
              )}
              {t === 'Over/Under' && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/>
                </svg>
              )}
              {t}
            </button>
          ))}
        </div>

        {/* ── CHART AREA ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

          {/* Chart toolbar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '0 10px', height: 42,
            background: '#0b0d14', borderBottom: '1px solid rgba(255,255,255,0.06)',
            flexShrink: 0
          }}>
            {/* Chart type icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8892a4" strokeWidth="2" style={{ flexShrink: 0 }}>
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            </svg>

            {/* Market selector */}
            <div style={{ position: 'relative', flexShrink: 0 }} ref={marketDropRef}>
              <button onClick={() => setShowMarketDrop(d => !d)} style={{
                display: 'flex', alignItems: 'center', gap: 5,
                border: 'none', background: 'transparent', cursor: 'pointer', color: '#e2e8f0'
              }}>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{market.label}</span>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8892a4" strokeWidth="2.5">
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {showMarketDrop && (
                <div className="mkt-drop">
                  {MARKETS.map(m => (
                    <button key={m.sym} className={`mkt-opt ${market.sym === m.sym ? 'selected' : ''}`}
                      onClick={() => { setMarket(m); setShowMarketDrop(false) }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
                      {m.label}
                      {market.sym === m.sym && <span style={{ marginLeft: 'auto', width: 6, height: 6, borderRadius: '50%', background: '#00c97b', display: 'inline-block' }} />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Price + change */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 13, fontWeight: 700 }}>{displayPrice.toFixed(2)}</span>
              <span style={{ fontSize: 11, color: priceChangePos ? '#00c97b' : '#ff4757', fontWeight: 600 }}>
                {priceChangePos ? '+' : ''}{priceChange}%
              </span>
            </div>

            {/* Connection dot */}
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: connected ? '#00c97b' : '#fbbf24',
              display: 'inline-block', flexShrink: 0
            }} />

            <div style={{ flex: 1 }} />

            {/* 100% button */}
            <span style={{
              padding: '3px 8px', borderRadius: 5,
              background: '#141828', color: '#8892a4',
              fontSize: 11, fontWeight: 600, flexShrink: 0
            }}>100%</span>
          </div>

          {/* Chart canvas */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
            {/* Zoom buttons */}
            <div style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', display: 'flex', flexDirection: 'column', gap: 4, zIndex: 10 }}>
              <button style={{
                width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)',
                background: '#141828', color: '#e2e8f0', fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1
              }}>+</button>
              <button style={{
                width: 24, height: 24, borderRadius: 6, border: '1px solid rgba(255,255,255,0.12)',
                background: '#141828', color: '#e2e8f0', fontSize: 20, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1, paddingBottom: 3
              }}>−</button>
            </div>
            <PriceChart ticks={ticks} mockTicks={mockTicks} />
          </div>

          {/* Digit row */}
          <DigitRow ticks={ticks} mockTicks={mockTicks} />
        </div>

        {/* ── BOTTOM PANELS ── */}
        {bottomTab === 'trade' && (
          <div className="no-scroll" style={{
            background: '#0f1220', flexShrink: 0,
            overflowY: 'auto', maxHeight: '48vh',
            borderTop: '1px solid rgba(255,255,255,0.07)'
          }}>
            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>

              {/* AUTO / MANUAL */}
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                {['AUTO', 'MANUAL'].map(m => (
                  <button key={m} onClick={() => setAutoMode(m === 'AUTO')} style={{
                    flex: 1, padding: '9px 0', border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: 700,
                    background: autoMode === (m === 'AUTO') ? '#3b7bff' : '#141828',
                    color: autoMode === (m === 'AUTO') ? '#fff' : '#8892a4'
                  }}>{m}</button>
                ))}
              </div>

              {/* Stake */}
              <div>
                <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#8892a4', marginBottom: 6 }}>STAKE</div>
                <div style={{
                  display: 'flex', alignItems: 'center',
                  borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)',
                  background: '#141828', padding: '6px 10px'
                }}>
                  <button onClick={() => setStake(s => Math.max(1, s - 1))} style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>−</button>
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <span style={{ fontSize: 12, color: '#8892a4', marginRight: 4 }}>$</span>
                    <span style={{ fontSize: 28, fontWeight: 700 }}>{stake}</span>
                  </div>
                  <button onClick={() => setStake(s => s + 1)} style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'rgba(255,255,255,0.08)', color: '#e2e8f0', fontSize: 20,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>+</button>
                </div>

                {/* Quick amounts */}
                <div style={{ display: 'flex', gap: 5, marginTop: 7 }}>
                  {[1, 5, 10, 25, 50, 100].map(v => (
                    <button key={v} onClick={() => setStake(v)}
                      className={`stake-btn ${stake === v ? 'active' : ''}`}>
                      ${v}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target / Stop / Multiplier */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                <div style={{ padding: '8px 8px', borderRadius: 10, background: '#141828', border: '1px solid rgba(0,201,123,0.25)' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#00c97b', marginBottom: 4 }}>TARGET PROFIT</div>
                  <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 2 }}>$</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>200</div>
                </div>
                <div style={{ padding: '8px 8px', borderRadius: 10, background: '#141828', border: '1px solid rgba(255,71,87,0.25)' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#ff4757', marginBottom: 4 }}>STOP LOSS</div>
                  <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 2 }}>$</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>999</div>
                </div>
                <div style={{ padding: '8px 8px', borderRadius: 10, background: '#141828', border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: 8, fontWeight: 700, color: '#8892a4', marginBottom: 4 }}>MULTIPLIER</div>
                  <div style={{ fontSize: 11, color: '#8892a4', marginBottom: 2 }}>x</div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>2</div>
                </div>
              </div>

              {/* Trade Buttons */}
              {tradeType === 'Even/Odd' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="trade-btn-even" onClick={() => placeTrade('even')}>
                    <span>Even</span>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>${payout}</span>
                    <span style={{ fontSize: 11, opacity: 0.85 }}>95.2% Payout</span>
                  </button>
                  <button className="trade-btn-odd" onClick={() => placeTrade('odd')}>
                    <span>Odd</span>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>${payout}</span>
                    <span style={{ fontSize: 11, opacity: 0.85 }}>95.2% Payout</span>
                  </button>
                </div>
              )}
              {tradeType === 'Over/Under' && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="trade-btn-over" onClick={() => placeTrade('over')}>
                    <span>Over 4</span>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>${payout}</span>
                    <span style={{ fontSize: 11, opacity: 0.85 }}>95.2% Payout</span>
                  </button>
                  <button className="trade-btn-under" onClick={() => placeTrade('under')}>
                    <span>Under 5</span>
                    <span style={{ fontSize: 16, fontWeight: 800 }}>${payout}</span>
                    <span style={{ fontSize: 11, opacity: 0.85 }}>95.2% Payout</span>
                  </button>
                </div>
              )}
              {tradeType === 'Matches/Differs' && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(d => (
                    <button key={d} onClick={() => placeTrade(`match-${d}`)} style={{
                      padding: '10px 12px', borderRadius: 10,
                      border: '1px solid rgba(59,123,255,0.3)',
                      background: 'rgba(59,123,255,0.1)', color: '#3b7bff',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between'
                    }}>
                      <span>Match {d}</span>
                      <span style={{ fontSize: 11, opacity: 0.8 }}>${payout}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {bottomTab === 'positions' && (
          <div className="no-scroll" style={{
            background: '#0f1220', flexShrink: 0,
            overflowY: 'auto', maxHeight: '48vh',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: 12
          }}>
            {openPos.length === 0 && closedPos.length === 0 && (
              <div style={{ textAlign: 'center', color: '#515c72', fontSize: 13, padding: '30px 0' }}>
                No positions yet. Place a trade to get started.
              </div>
            )}
            {openPos.map(p => (
              <div key={p.id} style={{ marginBottom: 8, padding: 12, borderRadius: 10, background: '#141828', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#3b7bff', textTransform: 'capitalize' }}>{p.type}</span>
                  <span style={{ fontSize: 12, color: '#fbbf24' }}>Pending…</span>
                </div>
                <div style={{ fontSize: 12, color: '#8892a4' }}>Stake ${p.stake} → Payout ${p.payout}</div>
              </div>
            ))}
            {closedPos.map(p => (
              <div key={p.id} style={{ marginBottom: 8, padding: 12, borderRadius: 10, background: '#141828', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 700, textTransform: 'capitalize', color: p.status === 'won' ? '#00c97b' : '#ff4757' }}>
                    {p.type} — {p.status}
                  </span>
                  <span style={{ fontSize: 11, color: '#515c72' }}>{p.time}</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: p.profit > 0 ? '#00c97b' : '#ff4757' }}>
                  {p.profit > 0 ? '+' : ''}{p.profit?.toFixed(2)} USD
                </div>
              </div>
            ))}
          </div>
        )}

        {bottomTab === 'ai' && (
          <div className="no-scroll" style={{
            background: '#0f1220', flexShrink: 0,
            overflowY: 'auto', maxHeight: '48vh',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #3b7bff)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 6 }}>TagOption AI</div>
              <div style={{ fontSize: 13, color: '#8892a4' }}>AI-powered trading signals and market analysis coming soon.</div>
            </div>
          </div>
        )}

        {/* ── BOTTOM NAV ── */}
        <div className="bottom-nav">
          <button className={`bottom-nav-btn ${bottomTab === 'trade' ? 'active' : ''}`} onClick={() => setBottomTab('trade')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
            </svg>
            Trade
          </button>
          <button className={`bottom-nav-btn ${bottomTab === 'ai' ? 'active' : ''}`} onClick={() => setBottomTab('ai')}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: bottomTab === 'ai'
                ? 'linear-gradient(135deg, #7c3aed, #3b7bff)'
                : 'linear-gradient(135deg, #7c3aed88, #3b7bff88)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            AI
          </button>
          <button className={`bottom-nav-btn ${bottomTab === 'positions' ? 'active' : ''}`} onClick={() => setBottomTab('positions')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
            </svg>
            Positions
          </button>
        </div>

      </div>
    </>
  )
}
