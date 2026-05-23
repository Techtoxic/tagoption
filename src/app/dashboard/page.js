'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

const DERIV_WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089'

const MARKETS = [
  { sym: 'R_10_1S', label: 'Volatility 10 (1s) Index' },
  { sym: 'R_10', label: 'Volatility 10 Index' },
  { sym: 'R_15_1S', label: 'Volatility 15 (1s) Index' },
  { sym: 'R_25_1S', label: 'Volatility 25 (1s) Index' },
  { sym: 'R_25', label: 'Volatility 25 Index' },
  { sym: 'R_30_1S', label: 'Volatility 30 (1s) Index' },
  { sym: 'R_50_1S', label: 'Volatility 50 (1s) Index' },
  { sym: 'R_50', label: 'Volatility 50 Index' },
  { sym: 'R_75_1S', label: 'Volatility 75 (1s) Index' },
  { sym: 'R_75', label: 'Volatility 75 Index' },
  { sym: 'R_90_1S', label: 'Volatility 90 (1s) Index' },
  { sym: 'R_100_1S', label: 'Volatility 100 (1s) Index' },
  { sym: 'R_100', label: 'Volatility 100 Index' },
]

function useDerivWS(symbol) {
  const ws = useRef(null)
  const [ticks, setTicks] = useState([])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (ws.current) ws.current.close()
    setTicks([])
    setCurrentPrice(null)
    setConnected(false)

    const socket = new WebSocket(DERIV_WS_URL)
    ws.current = socket

    socket.onopen = () => {
      setConnected(true)
      socket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }))
    }
    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data)
      if (data.msg_type === 'tick') {
        const price = data.tick.quote
        setCurrentPrice(price)
        setTicks(prev => [...prev, { time: Date.now(), price }].slice(-150))
      }
    }
    socket.onclose = () => setConnected(false)
    socket.onerror = () => setConnected(false)
    return () => socket.close()
  }, [symbol])

  return { ticks, currentPrice, connected }
}

function PriceChart({ ticks }) {
  const canvasRef = useRef(null)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || ticks.length < 2) return
    const ctx = canvas.getContext('2d')
    const W = canvas.width, H = canvas.height
    ctx.clearRect(0, 0, W, H)
    const prices = ticks.map(t => t.price)
    const mn = Math.min(...prices), mx = Math.max(...prices)
    const range = mx - mn || 1
    const pad = { t: 20, b: 30, l: 10, r: 90 }
    const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b
    const toX = i => pad.l + (i / (prices.length - 1)) * cW
    const toY = v => pad.t + cH - ((v - mn) / range) * cH

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * cH
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke()
      const val = mx - (i / 4) * range
      ctx.fillStyle = 'rgba(136,146,164,0.7)'; ctx.font = '11px DM Sans, sans-serif'
      ctx.textAlign = 'left'; ctx.fillText(val.toFixed(2), pad.l + cW + 6, y + 4)
    }

    // Fill
    ctx.beginPath()
    prices.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
    ctx.lineTo(toX(prices.length - 1), pad.t + cH); ctx.lineTo(toX(0), pad.t + cH); ctx.closePath()
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
    grad.addColorStop(0, 'rgba(226,232,240,0.1)'); grad.addColorStop(1, 'rgba(226,232,240,0)')
    ctx.fillStyle = grad; ctx.fill()

    // Line
    ctx.beginPath()
    prices.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
    ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.stroke()

    // Dot + label
    const lx = toX(prices.length - 1), ly = toY(prices[prices.length - 1])
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fillStyle = '#e2e8f0'; ctx.fill()
    ctx.fillStyle = 'rgba(59,123,255,0.95)'
    ctx.beginPath(); ctx.roundRect(lx + 8, ly - 11, 80, 22, 4); ctx.fill()
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px DM Sans, sans-serif'
    ctx.fillText(prices[prices.length - 1].toFixed(2), lx + 12, ly + 4)
  }, [ticks])
  return <canvas ref={canvasRef} width={940} height={360} className="w-full h-full" style={{ display: 'block' }} />
}

function MockChart() {
  const canvasRef = useRef(null)
  const animRef = useRef(null)
  const pts = useRef([])
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let base = 9407
    for (let i = 0; i < 120; i++) { base += (Math.random() - 0.48) * 3; pts.current.push(base) }
    function draw() {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)
      const data = pts.current.slice(-120)
      const mn = Math.min(...data), mx = Math.max(...data), range = mx - mn || 1
      const pad = { t: 20, b: 30, l: 10, r: 80 }
      const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b
      const toX = i => pad.l + (i / (data.length - 1)) * cW
      const toY = v => pad.t + cH - ((v - mn) / range) * cH
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + (i / 4) * cH
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke()
        ctx.fillStyle = 'rgba(136,146,164,0.6)'; ctx.font = '11px DM Sans'
        ctx.textAlign = 'left'; ctx.fillText((mx - (i / 4) * range).toFixed(2), pad.l + cW + 6, y + 4)
      }
      ctx.beginPath()
      data.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
      ctx.lineTo(toX(data.length - 1), pad.t + cH); ctx.lineTo(toX(0), pad.t + cH); ctx.closePath()
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
      grad.addColorStop(0, 'rgba(226,232,240,0.12)'); grad.addColorStop(1, 'rgba(226,232,240,0)')
      ctx.fillStyle = grad; ctx.fill()
      ctx.beginPath()
      data.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.stroke()
      const lx = toX(data.length - 1), ly = toY(data[data.length - 1])
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fillStyle = '#e2e8f0'; ctx.fill()
      ctx.fillStyle = 'rgba(59,123,255,0.9)'
      ctx.beginPath(); ctx.roundRect(lx + 8, ly - 11, 76, 22, 4); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px DM Sans'; ctx.fillText(data[data.length-1].toFixed(2), lx + 12, ly + 4)
      base += (Math.random() - 0.48) * 3; pts.current.push(base)
      if (pts.current.length > 300) pts.current.shift()
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])
  return <canvas ref={canvasRef} width={940} height={360} className="w-full h-full" style={{ display: 'block' }} />
}

function DigitRow({ ticks, mock }) {
  const [mockDigits, setMockDigits] = useState([0,1,2,3,4,6,7,8,9,5])
  const mockLabels = ['12.0%','11.4%','7.8%','9.4%','9.4%','11.6%','9.2%','9.4%','8.0%','10.6%']
  useEffect(() => {
    if (!mock) return
    const t = setInterval(() => setMockDigits(d => [...d.slice(1), Math.floor(Math.random() * 10)]), 1000)
    return () => clearInterval(t)
  }, [mock])

  const digits = mock ? mockDigits : ticks.slice(-10).map(t => Math.floor(t.price * 100) % 10)
  const labels = mock ? mockLabels : digits.map(() => '10.0%')

  return (
    <div className="flex justify-center gap-2 py-3 flex-wrap" style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-primary)' }}>
      {digits.map((d, i) => {
        const isCurrent = i === digits.length - 1
        const color = d === 5 ? 'var(--red)' : 'var(--blue)'
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all" style={{
              border: `2px solid ${color}`,
              background: isCurrent ? color + '33' : 'transparent',
              color: isCurrent ? '#fff' : 'var(--text-secondary)'
            }}>{d}</div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{labels[i]}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [selectedMarket, setSelectedMarket] = useState(MARKETS[0])
  const [showMarketDrop, setShowMarketDrop] = useState(false)
  const [stake, setStake] = useState(10)
  const [tradeMode, setTradeMode] = useState('even-odd')
  const [autoMode, setAutoMode] = useState(true)
  const [positions, setPositions] = useState([])
  const [balance, setBalance] = useState(0)
  const [activeTab, setActiveTab] = useState('open')
  const [muted, setMuted] = useState(false)
  const [darkMode] = useState(true)
  const [showNotif, setShowNotif] = useState(false)
  const payout = (stake * 1.952).toFixed(2)
  const dropRef = useRef(null)

  const { ticks, currentPrice, connected } = useDerivWS(selectedMarket.sym)

  useEffect(() => {
    const stored = localStorage.getItem('tagoption_user')
    if (!stored) { router.push('/login'); return }
    setUser(JSON.parse(stored))
  }, [router])

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowMarketDrop(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const placeTrade = (type) => {
    if (stake <= 0) return
    const id = Date.now()
    const entry = currentPrice || 9407.44
    const trade = { id, type, stake, entry, time: new Date().toLocaleTimeString(), status: 'open', payout: parseFloat(payout) }
    setPositions(p => [trade, ...p])
    setTimeout(() => {
      setPositions(p => p.map(t => {
        if (t.id !== id) return t
        const lastDigit = Math.floor((currentPrice || entry) * 100) % 10
        let win = false
        if (type === 'even') win = lastDigit % 2 === 0
        if (type === 'odd') win = lastDigit % 2 !== 0
        if (type.startsWith('match')) win = lastDigit === parseInt(type.split('-')[1])
        if (type === 'over') win = lastDigit > 4
        if (type === 'under') win = lastDigit < 5
        const profit = win ? t.payout - t.stake : -t.stake
        setBalance(b => +(b + profit).toFixed(2))
        return { ...t, status: win ? 'won' : 'lost', profit }
      }))
    }, 5000)
  }

  if (!user) return null

  const openPos = positions.filter(p => p.status === 'open')
  const closedPos = positions.filter(p => p.status !== 'open')
  const useMock = ticks.length < 2

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* TOP NAV */}
      <nav className="flex items-center gap-1 px-3 py-2 shrink-0" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)', minHeight: 48 }}>
        <Link href="/" className="flex items-center gap-1.5 mr-2 shrink-0">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--blue)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
        </Link>

        {/* Nav Links */}
        {[
          { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>, label: "Trader's Hub", href: '/' },
          { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>, label: 'Deposit', href: '#' },
          { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><line x1="12" y1="18" x2="12" y2="6"/></svg>, label: 'Withdraw', href: '#' },
          { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>, label: 'History', href: '#' },
          { icon: <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>, label: 'Chat', href: '#' },
        ].map(item => (
          <a key={item.label} href={item.href} className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:text-white shrink-0" style={{ color: 'var(--text-secondary)' }}>
            {item.icon}<span className="hidden sm:inline">{item.label}</span>
          </a>
        ))}

        {/* Profile dropdown */}
        <div className="flex items-center gap-1.5 ml-1 px-3 py-1.5 rounded-lg cursor-pointer shrink-0" style={{ background: 'var(--blue)', color: '#fff' }}>
          <span className="w-5 h-5 rounded bg-white/20 flex items-center justify-center text-xs font-bold">TO</span>
          <span className="text-xs font-medium hidden sm:inline">TagOption Trader</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* AI */}
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(59,123,255,0.15)', color: 'var(--blue)' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            <span className="hidden sm:inline">AI</span>
          </button>

          {/* Sound */}
          <button onClick={() => setMuted(m => !m)} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
            {muted
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/></svg>
            }
          </button>

          {/* Theme */}
          <button className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          </button>

          {/* Balance */}
          <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <span className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold" style={{ background: 'var(--red)', color: '#fff' }}>R</span>
            <span className="font-semibold">${balance.toFixed(2)}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>

          {/* Deposit */}
          <button className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90" style={{ background: 'var(--blue)', color: '#fff' }}>Deposit</button>

          {/* Bell */}
          <button onClick={() => setShowNotif(n => !n)} className="w-8 h-8 rounded-lg flex items-center justify-center relative transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </button>

          {/* Profile */}
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--blue)', color: '#fff' }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </button>
        </div>
      </nav>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <div className="w-52 shrink-0 flex flex-col" style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
          <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
            {[['open', `Open (${openPos.length})`], ['closed', `Closed (${closedPos.length})`], ['txns', 'Transactions']].map(([key, label]) => (
              <button key={key} onClick={() => setActiveTab(key)} className="flex-1 py-2.5 text-xs font-medium transition-colors" style={{
                color: activeTab === key ? 'var(--blue)' : 'var(--text-secondary)',
                borderBottom: activeTab === key ? '2px solid var(--blue)' : '2px solid transparent'
              }}>
                {key === 'txns' ? 'Txns' : label}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3 scrollbar-hide">
            {activeTab === 'open' && openPos.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ border: '2px solid var(--border)' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                </div>
                <div>
                  <p className="text-xs font-medium">No open positions</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Your active trades will appear here</p>
                </div>
              </div>
            )}
            {activeTab === 'open' && openPos.map(p => (
              <div key={p.id} className="mb-2 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold capitalize" style={{ color: 'var(--blue)' }}>{p.type}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.time}</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Stake: ${p.stake} → ${p.payout}</div>
                <div className="text-xs mt-1 flex items-center gap-1" style={{ color: 'var(--yellow)' }}>
                  <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--yellow)' }}></span>Pending...
                </div>
              </div>
            ))}
            {activeTab === 'closed' && closedPos.map(p => (
              <div key={p.id} className="mb-2 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold capitalize" style={{ color: p.status === 'won' ? 'var(--green)' : 'var(--red)' }}>{p.type} — {p.status}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.time}</span>
                </div>
                <div className="text-xs font-bold" style={{ color: p.profit > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {p.profit > 0 ? '+' : ''}{p.profit?.toFixed(2)} USD
                </div>
              </div>
            ))}
            {activeTab === 'txns' && (
              <div className="flex items-center justify-center h-40 text-xs" style={{ color: 'var(--text-muted)' }}>No transactions yet</div>
            )}
          </div>
          <div className="p-3 text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/></svg>
            {openPos.length} open positions
          </div>
        </div>

        {/* CHART AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Asset header with dropdown */}
          <div className="flex items-center justify-between px-4 py-2.5 shrink-0" style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded font-bold" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>1T</span>
              {/* Market selector */}
              <div className="relative" ref={dropRef}>
                <button
                  onClick={() => setShowMarketDrop(d => !d)}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
                  <span className="font-semibold text-sm">{selectedMarket.label}</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
                </button>
                {showMarketDrop && (
                  <div className="absolute top-full left-0 mt-1 rounded-xl overflow-hidden shadow-2xl z-50 w-64" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                    {MARKETS.map(m => (
                      <button
                        key={m.sym}
                        onClick={() => { setSelectedMarket(m); setShowMarketDrop(false) }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-white/5"
                        style={{ color: selectedMarket.sym === m.sym ? 'var(--blue)' : 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
                        {m.label}
                        {selectedMarket.sym === m.sym && (
                          <span className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--green)' }}></span>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-sm font-mono font-bold">{currentPrice ? currentPrice.toFixed(2) : '—'}</span>
                <span className="text-xs flex items-center gap-1" style={{ color: connected ? 'var(--green)' : 'var(--yellow)' }}>
                  <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: connected ? 'var(--green)' : 'var(--yellow)' }}></span>
                  {connected ? '' : 'Connecting...'}
                </span>
              </div>
            </div>

            {/* Chart controls */}
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {['1m','5m','15m','1h'].map(t => (
                  <button key={t} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--text-secondary)' }}>{t}</button>
                ))}
              </div>
              <span className="text-xs font-medium px-2 py-1 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>100%</span>
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            {!useMock ? <PriceChart ticks={ticks} /> : <MockChart />}
          </div>

          {/* Digit row */}
          <DigitRow ticks={ticks} mock={useMock} />
        </div>

        {/* RIGHT PANEL */}
        <div className="w-64 shrink-0 overflow-y-auto scrollbar-hide" style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)' }}>
          <div className="p-4 space-y-4">
            {/* Trading Mode */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>TRADING MODE</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Bot places trades</span>
              </div>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {['AUTO', 'MANUAL'].map(m => (
                  <button key={m} onClick={() => setAutoMode(m === 'AUTO')} className="flex-1 py-2 text-xs font-semibold transition-all" style={{
                    background: autoMode === (m === 'AUTO') ? 'var(--blue)' : 'var(--bg-card)',
                    color: autoMode === (m === 'AUTO') ? '#fff' : 'var(--text-secondary)'
                  }}>{m}</button>
                ))}
              </div>
            </div>

            {/* Trade type */}
            <div className="flex gap-1.5 flex-wrap">
              {[['even-odd', 'Even / Odd'], ['match-differ', 'Match / Differ'], ['over-under', 'Over / Under']].map(([v, l]) => (
                <button key={v} onClick={() => setTradeMode(v)} className="flex-1 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all" style={{
                  background: tradeMode === v ? 'var(--blue)' : 'var(--bg-card)',
                  color: tradeMode === v ? '#fff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)'
                }}>{l}</button>
              ))}
            </div>

            {/* Stake */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>STAKE AMOUNT</span>
                <div className="flex gap-1">
                  <button className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--blue)', color: '#fff' }}>Stake</button>
                  <button className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--text-secondary)' }}>Payout</button>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <button onClick={() => setStake(s => Math.max(1, s - 1))} className="w-7 h-7 rounded-lg flex items-center justify-center text-lg font-bold transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>−</button>
                <div className="flex-1 flex items-center justify-center gap-1">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>$</span>
                  <span className="text-2xl font-bold">{stake}</span>
                </div>
                <button onClick={() => setStake(s => s + 1)} className="w-7 h-7 rounded-lg flex items-center justify-center text-lg font-bold transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>+</button>
              </div>
              <div className="flex gap-1.5 mt-2">
                {[1, 5, 10, 25, 50, 100].map(v => (
                  <button key={v} onClick={() => setStake(v)} className="flex-1 py-1 text-xs rounded-lg font-medium transition-all" style={{
                    background: stake === v ? 'var(--blue)' : 'var(--bg-card)',
                    color: stake === v ? '#fff' : 'var(--text-secondary)',
                    border: '1px solid var(--border)'
                  }}>${v}</button>
                ))}
              </div>
            </div>

            {/* Payout */}
            <div className="flex justify-between items-center py-1">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Payout</span>
              <span className="text-sm font-bold">{payout} <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>USD</span></span>
            </div>

            {/* Target / Stop / Multiplier */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2.5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--green)' }}>
                <div className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--green)' }}>
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--green)' }}></span>TARGET PROFIT
                </div>
                <div className="text-sm font-bold">↑ 200</div>
              </div>
              <div className="p-2.5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--red)' }}>
                <div className="text-xs mb-1 flex items-center gap-1" style={{ color: 'var(--red)' }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                  STOP LOSS
                </div>
                <div className="text-sm font-bold">↓ 999</div>
              </div>
              <div className="p-2.5 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>× MULTIPLIER</div>
                <div className="text-sm font-bold">2</div>
              </div>
            </div>

            {/* Trade Buttons */}
            {tradeMode === 'even-odd' && (
              <div className="space-y-2">
                <button onClick={() => placeTrade('even')} className="w-full py-4 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] flex items-center justify-between px-4" style={{ background: 'rgba(0,201,123,0.12)', border: '1px solid rgba(0,201,123,0.4)', color: 'var(--green)' }}>
                  <div className="flex items-center gap-2">
                    <div className="grid grid-cols-2 gap-0.5">{[...Array(4)].map((_, i) => <span key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: 'var(--green)' }} />)}</div>
                    <span>Even</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{payout} USD</div>
                    <div className="text-xs opacity-70">95.22%</div>
                  </div>
                </button>
                <button onClick={() => placeTrade('odd')} className="w-full py-4 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 hover:scale-[1.02] flex items-center justify-between px-4" style={{ background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.35)', color: 'var(--red)' }}>
                  <div className="flex items-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/></svg>
                    <span>Odd</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">{payout} USD</div>
                    <div className="text-xs opacity-70">95.22%</div>
                  </div>
                </button>
              </div>
            )}

            {tradeMode === 'match-differ' && (
              <div className="space-y-2">
                {[0,1,2,3,4,5,6,7,8,9].map(d => (
                  <button key={d} onClick={() => placeTrade(`match-${d}`)} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 flex items-center justify-between px-4" style={{ background: 'rgba(59,123,255,0.12)', border: '1px solid rgba(59,123,255,0.3)', color: 'var(--blue)' }}>
                    <span>Match {d}</span>
                    <span>{payout} USD</span>
                  </button>
                ))}
              </div>
            )}

            {tradeMode === 'over-under' && (
              <div className="space-y-2">
                {[['over', 'Over 4'], ['under', 'Under 5']].map(([type, label]) => (
                  <button key={type} onClick={() => placeTrade(type)} className="w-full py-4 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 flex items-center justify-between px-4" style={{ background: 'rgba(59,123,255,0.12)', border: '1px solid rgba(59,123,255,0.3)', color: 'var(--blue)' }}>
                    <span>{label}</span>
                    <span>{payout} USD</span>
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
