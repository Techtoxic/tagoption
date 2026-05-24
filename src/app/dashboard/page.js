'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const DERIV_WS = 'wss://ws.derivws.com/websockets/v3?app_id=1089'

const MARKETS = [
  { sym: 'R_10_1S', label: 'Volatility 10 (1s) Index' },
  { sym: 'R_10',    label: 'Volatility 10 Index' },
  { sym: 'R_15_1S', label: 'Volatility 15 (1s) Index' },
  { sym: 'R_25_1S', label: 'Volatility 25 (1s) Index' },
  { sym: 'R_25',    label: 'Volatility 25 Index' },
  { sym: 'R_30_1S', label: 'Volatility 30 (1s) Index' },
  { sym: 'R_50_1S', label: 'Volatility 50 (1s) Index' },
  { sym: 'R_50',    label: 'Volatility 50 Index' },
  { sym: 'R_75_1S', label: 'Volatility 75 (1s) Index' },
  { sym: 'R_75',    label: 'Volatility 75 Index' },
  { sym: 'R_90_1S', label: 'Volatility 90 (1s) Index' },
  { sym: 'R_100_1S',label: 'Volatility 100 (1s) Index' },
  { sym: 'R_100',   label: 'Volatility 100 Index' },
]

function useDerivWS(symbol) {
  const ws = useRef(null)
  const [ticks, setTicks] = useState([])
  const [price, setPrice]  = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (ws.current) { ws.current.close(); ws.current = null }
    setTicks([]); setPrice(null); setConnected(false)
    const socket = new WebSocket(DERIV_WS)
    ws.current = socket
    socket.onopen  = () => { setConnected(true); socket.send(JSON.stringify({ ticks: symbol, subscribe: 1 })) }
    socket.onmessage = e => {
      const d = JSON.parse(e.data)
      if (d.msg_type === 'tick') {
        const p = d.tick.quote, t = d.tick.epoch * 1000
        setPrice(p)
        setTicks(prev => [...prev, { price: p, time: t }].slice(-200))
      }
    }
    socket.onclose = () => setConnected(false)
    socket.onerror = () => setConnected(false)
    return () => { socket.close() }
  }, [symbol])

  return { ticks, price, connected }
}

function PriceChart({ ticks, mockTicks }) {
  const canvasRef = useRef(null)
  const rafRef    = useRef(null)
  const data = ticks.length >= 2 ? ticks : mockTicks

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length < 2) return
    const ctx = canvas.getContext('2d')

    function draw() {
      const W = canvas.offsetWidth, H = canvas.offsetHeight
      if (W === 0 || H === 0) { rafRef.current = requestAnimationFrame(draw); return }
      canvas.width = W; canvas.height = H

      const prices = data.map(d => d.price)
      const times  = data.map(d => d.time)
      const mn = Math.min(...prices), mx = Math.max(...prices), range = mx - mn || 1
      const pad = { t: 16, b: 36, l: 10, r: 72 }
      const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b
      const toX = i  => pad.l + (i / (prices.length - 1)) * cW
      const toY = v  => pad.t + cH - ((v - mn) / range) * cH

      ctx.clearRect(0, 0, W, H)

      // Grid lines + right-side price labels
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + (i / 4) * cH
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke()
        const val = mx - (i / 4) * range
        ctx.fillStyle = 'rgba(136,146,164,0.75)'; ctx.font = '11px DM Sans, sans-serif'
        ctx.textAlign = 'left'; ctx.fillText(val.toFixed(2), pad.l + cW + 6, y + 4)
      }

      // Time labels at bottom
      const labelCount = Math.min(6, prices.length)
      ctx.fillStyle = 'rgba(136,146,164,0.6)'; ctx.font = '10px DM Sans, sans-serif'; ctx.textAlign = 'center'
      for (let i = 0; i < labelCount; i++) {
        const idx = Math.floor((i / (labelCount - 1)) * (prices.length - 1))
        const x = toX(idx)
        const t = new Date(times[idx])
        const label = t.getHours().toString().padStart(2,'0') + ':' + t.getMinutes().toString().padStart(2,'0') + ':' + t.getSeconds().toString().padStart(2,'0')
        ctx.fillText(label, x, H - 6)
      }

      // Fill gradient
      ctx.beginPath()
      prices.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
      ctx.lineTo(toX(prices.length - 1), pad.t + cH); ctx.lineTo(toX(0), pad.t + cH); ctx.closePath()
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
      grad.addColorStop(0, 'rgba(226,232,240,0.08)'); grad.addColorStop(1, 'rgba(226,232,240,0)')
      ctx.fillStyle = grad; ctx.fill()

      // Line
      ctx.beginPath()
      prices.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.stroke()

      // End dot + label
      const lx = toX(prices.length - 1), ly = toY(prices[prices.length - 1])
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fillStyle = '#e2e8f0'; ctx.fill()
      ctx.fillStyle = '#3b7bff'
      ctx.beginPath(); ctx.roundRect(lx + 6, ly - 11, 74, 22, 4); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px DM Sans, sans-serif'; ctx.textAlign = 'left'
      ctx.fillText(prices[prices.length - 1].toFixed(2), lx + 10, ly + 4)
    }

    draw()
    rafRef.current = requestAnimationFrame(function loop() { draw(); rafRef.current = requestAnimationFrame(loop) })
    return () => cancelAnimationFrame(rafRef.current)
  }, [data])

  return <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
}

function DigitRow({ ticks, mockTicks }) {
  const src = ticks.length >= 10 ? ticks : mockTicks
  const last10 = src.slice(-10)

  const digits = last10.map(t => {
    const str = t.price.toFixed(2).replace('.', '')
    return parseInt(str[str.length - 1])
  })

  const counts = Array(10).fill(0)
  src.slice(-100).forEach(t => {
    const str = t.price.toFixed(2).replace('.', '')
    counts[parseInt(str[str.length - 1])]++
  })
  const total = src.slice(-100).length || 1
  const pcts = counts.map(c => ((c / total) * 100).toFixed(1) + '%')

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', background: '#0b0d14', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
      {digits.map((d, i) => {
        const isLast = i === digits.length - 1
        const color = isLast ? '#fff' : 'rgba(226,232,240,0.55)'
        const borderColor = d === 5 ? '#ff4757' : isLast ? '#3b7bff' : 'rgba(255,255,255,0.12)'
        const bg = isLast ? (d === 5 ? 'rgba(255,71,87,0.25)' : 'rgba(59,123,255,0.25)') : 'transparent'
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${borderColor}`, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color, transition: 'all 0.3s' }}>{d}</div>
            <span style={{ fontSize: 10, color: 'rgba(136,146,164,0.8)' }}>{pcts[d]}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [market, setMarket]   = useState(MARKETS[0])
  const [showDrop, setShowDrop] = useState(false)
  const [stake, setStake]     = useState(10)
  const [tradeMode, setTradeMode] = useState('even-odd')
  const [autoMode, setAutoMode]   = useState(true)
  const [positions, setPositions] = useState([])
  const [balance, setBalance] = useState(0)
  const [tab, setTab]         = useState('open')
  const [muted, setMuted]     = useState(false)
  const dropRef = useRef(null)

  // Mock ticks for fallback
  const mockRef = useRef([])
  const [mockTicks, setMockTicks] = useState([])
  useEffect(() => {
    let base = 9443
    const arr = []
    for (let i = 0; i < 120; i++) { base += (Math.random() - 0.48) * 2.5; arr.push({ price: base, time: Date.now() - (120 - i) * 1000 }) }
    mockRef.current = arr
    setMockTicks([...arr])
    const t = setInterval(() => {
      base += (Math.random() - 0.48) * 2.5
      mockRef.current = [...mockRef.current, { price: base, time: Date.now() }].slice(-200)
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

  useEffect(() => {
    function h(e) { if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const payout = (stake * 1.9522).toFixed(2)

  const placeTrade = (type) => {
    const id = Date.now()
    const entry = price || mockTicks.at(-1)?.price || 9443
    setPositions(p => [{ id, type, stake, entry, time: new Date().toLocaleTimeString(), status: 'open', payout: parseFloat(payout) }, ...p])
    setTimeout(() => {
      setPositions(p => p.map(t => {
        if (t.id !== id) return t
        const cur = price || mockTicks.at(-1)?.price || entry
        const lastDigit = Math.floor(cur * 100) % 10
        let win = false
        if (type === 'even') win = lastDigit % 2 === 0
        if (type === 'odd')  win = lastDigit % 2 !== 0
        if (type === 'over') win = lastDigit > 4
        if (type === 'under') win = lastDigit < 5
        const profit = win ? +(t.payout - t.stake).toFixed(2) : -t.stake
        setBalance(b => +(b + profit).toFixed(2))
        return { ...t, status: win ? 'won' : 'lost', profit }
      }))
    }, 5000)
  }

  if (!user) return <div style={{ background: '#0b0d14', minHeight: '100vh' }} />

  const openPos   = positions.filter(p => p.status === 'open')
  const closedPos = positions.filter(p => p.status !== 'open')
  const displayPrice = price ?? mockTicks.at(-1)?.price

  // icon button style
  const navBtn = (active) => ({
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
    background: active ? 'rgba(59,123,255,0.18)' : 'transparent',
    color: active ? '#3b7bff' : '#8892a4', fontSize: 13, fontWeight: 500, whiteSpace: 'nowrap',
    textDecoration: 'none',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', background: '#0b0d14', fontFamily: 'DM Sans, sans-serif', color: '#e2e8f0' }}>

      {/* ── TOP NAV ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '0 12px', height: 48, background: '#0f1220', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0, overflowX: 'auto' }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: '#3b7bff', marginRight: 8, flexShrink: 0, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
        </Link>

        {/* Nav links */}
        {[
          { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: "Trader's Hub", href: '/' },
          { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>, label: 'Deposit', href: '#' },
          { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/></svg>, label: 'Withdraw', href: '#' },
          { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: 'History', href: '#' },
          { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, label: 'Chat', href: '#' },
        ].map(item => (
          <a key={item.label} href={item.href} style={navBtn(false)}>{item.icon}<span>{item.label}</span></a>
        ))}

        {/* Profile badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, background: '#3b7bff', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0, marginLeft: 2 }}>
          <span style={{ width: 20, height: 20, borderRadius: 5, background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>TO</span>
          <span>TagOption Trader</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Right controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
          {/* AI */}
          <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(59,123,255,0.15)', color: '#3b7bff', fontSize: 12, fontWeight: 600 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>AI
          </button>
          {/* Mute */}
          <button onClick={() => setMuted(m => !m)} style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#8892a4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {muted
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>}
          </button>
          {/* Sun */}
          <button style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#8892a4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          </button>
          {/* Balance */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.08)', color: '#8892a4', fontSize: 13 }}>
            <span style={{ width: 18, height: 18, borderRadius: 4, background: '#ff4757', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>R</span>
            <span style={{ fontWeight: 600, color: '#e2e8f0' }}>${balance.toFixed(2)}</span>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          {/* Deposit */}
          <button style={{ padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', background: '#3b7bff', color: '#fff', fontSize: 13, fontWeight: 600 }}>Deposit</button>
          {/* Bell */}
          <button style={{ width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#8892a4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </button>
          {/* Avatar */}
          <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#3b7bff', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            {user?.name?.[0]?.toUpperCase() || 'T'}
          </div>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* LEFT SIDEBAR — positions */}
        <div style={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#0f1220', borderRight: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            {[['open', `Open (${openPos.length})`], ['closed', `Closed (${closedPos.length})`], ['txns', 'Transactions']].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)} style={{ flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', background: 'transparent', fontSize: 11, fontWeight: 600, color: tab === key ? '#3b7bff' : '#8892a4', borderBottom: tab === key ? '2px solid #3b7bff' : '2px solid transparent', whiteSpace: 'nowrap' }}>
                {key === 'txns' ? 'Txns' : label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
            {tab === 'open' && openPos.length === 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 160, gap: 10, textAlign: 'center' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#515c72' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600 }}>No open positions</p>
                  <p style={{ fontSize: 11, color: '#515c72', marginTop: 4 }}>Your active trades will appear here</p>
                </div>
              </div>
            )}
            {tab === 'open' && openPos.map(p => (
              <div key={p.id} style={{ marginBottom: 8, padding: 10, borderRadius: 10, background: '#141828', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#3b7bff', textTransform: 'capitalize' }}>{p.type}</span>
                  <span style={{ fontSize: 10, color: '#515c72' }}>{p.time}</span>
                </div>
                <div style={{ fontSize: 11, color: '#8892a4' }}>Stake: ${p.stake} → ${p.payout}</div>
                <div style={{ fontSize: 11, color: '#fbbf24', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span className="pulse-dot" style={{ width: 5, height: 5, borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }}></span>Pending…
                </div>
              </div>
            ))}
            {tab === 'closed' && closedPos.map(p => (
              <div key={p.id} style={{ marginBottom: 8, padding: 10, borderRadius: 10, background: '#141828', border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'capitalize', color: p.status === 'won' ? '#00c97b' : '#ff4757' }}>{p.type} — {p.status}</span>
                  <span style={{ fontSize: 10, color: '#515c72' }}>{p.time}</span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 700, color: p.profit > 0 ? '#00c97b' : '#ff4757' }}>{p.profit > 0 ? '+' : ''}{p.profit?.toFixed(2)} USD</div>
              </div>
            ))}
            {tab === 'txns' && <div style={{ textAlign: 'center', color: '#515c72', fontSize: 12, paddingTop: 40 }}>No transactions yet</div>}
          </div>

          <div style={{ padding: '8px 12px', borderTop: '1px solid rgba(255,255,255,0.07)', fontSize: 11, color: '#515c72', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
            {openPos.length} open positions
          </div>
        </div>

        {/* CHART AREA */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Chart toolbar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', height: 44, background: '#0f1220', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
            {/* 1T badge */}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 5, background: '#141828', color: '#8892a4', flexShrink: 0 }}>1T</span>

            {/* Market selector */}
            <div style={{ position: 'relative', flexShrink: 0 }} ref={dropRef}>
              <button onClick={() => setShowDrop(d => !d)} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px', borderRadius: 8, border: 'none', cursor: 'pointer', background: 'transparent', color: '#e2e8f0' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{market.label}</span>
                {displayPrice && <span style={{ fontSize: 12, color: '#8892a4' }}>{displayPrice.toFixed(2)}</span>}
                <span style={{ fontSize: 10, color: connected ? '#00c97b' : '#fbbf24', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: connected ? '#00c97b' : '#fbbf24', display: 'inline-block' }}></span>
                </span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8892a4" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>

              {showDrop && (
                <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 4, width: 260, borderRadius: 12, background: '#141828', border: '1px solid rgba(255,255,255,0.09)', boxShadow: '0 8px 32px rgba(0,0,0,0.6)', zIndex: 100, overflow: 'hidden' }}>
                  {MARKETS.map(m => (
                    <button key={m.sym} onClick={() => { setMarket(m); setShowDrop(false) }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', cursor: 'pointer', background: market.sym === m.sym ? 'rgba(59,123,255,0.12)' : 'transparent', color: market.sym === m.sym ? '#3b7bff' : '#e2e8f0', fontSize: 13, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
                      {m.label}
                      {market.sym === m.sym && <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#00c97b' }}></span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flex: 1 }} />

            {/* Time buttons */}
            <div style={{ display: 'flex', gap: 2 }}>
              {['1m','5m','15m','1h'].map(t => (
                <button key={t} style={{ padding: '3px 8px', borderRadius: 5, border: 'none', cursor: 'pointer', background: 'transparent', color: '#8892a4', fontSize: 11 }}>{t}</button>
              ))}
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 5, background: '#141828', color: '#8892a4' }}>100%</span>
          </div>

          {/* Canvas */}
          <div style={{ flex: 1, overflow: 'hidden', background: '#0b0d14' }}>
            <PriceChart ticks={ticks} mockTicks={mockTicks} />
          </div>

          {/* Digit row */}
          <DigitRow ticks={ticks} mockTicks={mockTicks} />
        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: 256, flexShrink: 0, overflowY: 'auto', background: '#0f1220', borderLeft: '1px solid rgba(255,255,255,0.07)', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Trading mode */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#8892a4' }}>TRADING MODE</span>
                <span style={{ fontSize: 10, color: '#515c72' }}>Bot places trades</span>
              </div>
              <div style={{ display: 'flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                {['AUTO','MANUAL'].map(m => (
                  <button key={m} onClick={() => setAutoMode(m === 'AUTO')} style={{ flex: 1, padding: '8px 0', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700, background: autoMode === (m === 'AUTO') ? '#3b7bff' : '#141828', color: autoMode === (m === 'AUTO') ? '#fff' : '#8892a4' }}>{m}</button>
                ))}
              </div>
            </div>

            {/* Trade type */}
            <div style={{ display: 'flex', gap: 6 }}>
              {[['even-odd','Even / Odd'],['match-differ','Match / Differ'],['over-under','Over / Under']].map(([v, l]) => (
                <button key={v} onClick={() => setTradeMode(v)} style={{ flex: 1, padding: '6px 4px', borderRadius: 8, border: `1px solid ${tradeMode === v ? '#3b7bff' : 'rgba(255,255,255,0.08)'}`, cursor: 'pointer', background: tradeMode === v ? 'rgba(59,123,255,0.18)' : '#141828', color: tradeMode === v ? '#3b7bff' : '#8892a4', fontSize: 10, fontWeight: 600, lineHeight: 1.3, textAlign: 'center' }}>{l}</button>
              ))}
            </div>

            {/* Stake */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, color: '#8892a4' }}>STAKE AMOUNT</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, background: '#3b7bff', color: '#fff', fontWeight: 600 }}>Stake</span>
                  <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 5, color: '#8892a4', fontWeight: 600 }}>Payout</span>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)', background: '#141828', padding: '6px 12px' }}>
                <button onClick={() => setStake(s => Math.max(1, s - 1))} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <div style={{ flex: 1, textAlign: 'center' }}>
                  <span style={{ fontSize: 10, color: '#8892a4', marginRight: 4 }}>$</span>
                  <span style={{ fontSize: 26, fontWeight: 700 }}>{stake}</span>
                </div>
                <button onClick={() => setStake(s => s + 1)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
              <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                {[1,5,10,25,50,100].map(v => (
                  <button key={v} onClick={() => setStake(v)} style={{ flex: 1, padding: '5px 0', borderRadius: 7, border: `1px solid ${stake === v ? '#3b7bff' : 'rgba(255,255,255,0.07)'}`, cursor: 'pointer', background: stake === v ? 'rgba(59,123,255,0.2)' : '#141828', color: stake === v ? '#3b7bff' : '#8892a4', fontSize: 10, fontWeight: 600 }}>${v}</button>
                ))}
              </div>
            </div>

            {/* Payout */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#8892a4' }}>Payout</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{payout} <span style={{ fontSize: 11, color: '#515c72', fontWeight: 400 }}>USD</span></span>
            </div>

            {/* Target / Stop / Multiplier */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <div style={{ padding: '10px 8px', borderRadius: 10, background: '#141828', border: '1px solid rgba(0,201,123,0.3)' }}>
                <div style={{ fontSize: 9, color: '#00c97b', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00c97b', display: 'inline-block' }}></span>TARGET PROFIT
                </div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>↑ 200</div>
              </div>
              <div style={{ padding: '10px 8px', borderRadius: 10, background: '#141828', border: '1px solid rgba(255,71,87,0.3)' }}>
                <div style={{ fontSize: 9, color: '#ff4757', fontWeight: 700, marginBottom: 6 }}>⚠ STOP LOSS</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>↓ 999</div>
              </div>
              <div style={{ padding: '10px 8px', borderRadius: 10, background: '#141828', border: '1px solid rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: 9, color: '#8892a4', fontWeight: 700, marginBottom: 6 }}>× MULTIPLIER</div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>2</div>
              </div>
            </div>

            {/* Trade buttons */}
            {tradeMode === 'even-odd' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                <button onClick={() => placeTrade('even')} style={{ padding: '16px 14px', borderRadius: 16, border: '1px solid rgba(0,201,123,0.35)', cursor: 'pointer', background: 'rgba(0,201,123,0.1)', color: '#00c97b', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>{[...Array(4)].map((_, i) => <span key={i} style={{ width: 5, height: 5, borderRadius: 1, background: '#00c97b', display: 'block' }} />)}</div>
                    Even
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{payout} USD</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>95.22%</div>
                  </div>
                </button>
                <button onClick={() => placeTrade('odd')} style={{ padding: '16px 14px', borderRadius: 16, border: '1px solid rgba(255,71,87,0.3)', cursor: 'pointer', background: 'rgba(255,71,87,0.08)', color: '#ff4757', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                    Odd
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{payout} USD</div>
                    <div style={{ fontSize: 11, opacity: 0.7 }}>95.22%</div>
                  </div>
                </button>
              </div>
            )}

            {tradeMode === 'over-under' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                {[['over','Over 4'],['under','Under 5']].map(([type, label]) => (
                  <button key={type} onClick={() => placeTrade(type)} style={{ padding: '16px 14px', borderRadius: 16, border: '1px solid rgba(59,123,255,0.3)', cursor: 'pointer', background: 'rgba(59,123,255,0.1)', color: '#3b7bff', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 14 }}>
                    <span>{label}</span>
                    <span>{payout} USD</span>
                  </button>
                ))}
              </div>
            )}

            {tradeMode === 'match-differ' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 4 }}>
                {[0,1,2,3,4,5,6,7,8,9].map(d => (
                  <button key={d} onClick={() => placeTrade(`match-${d}`)} style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid rgba(59,123,255,0.25)', cursor: 'pointer', background: 'rgba(59,123,255,0.08)', color: '#3b7bff', display: 'flex', justifyContent: 'space-between', fontWeight: 600, fontSize: 13 }}>
                    <span>Match {d}</span><span>{payout} USD</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
