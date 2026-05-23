'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// ─── DERIV WS HOOK ─────────────────────────────────────────────────────────────
const DERIV_WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089'

function useDerivWS(apiToken) {
  const ws = useRef(null)
  const [ticks, setTicks] = useState([])
  const [currentPrice, setCurrentPrice] = useState(null)
  const [connected, setConnected] = useState(false)
  const symbol = 'R_10' // Volatility 10 (1s) Index

  useEffect(() => {
    const socket = new WebSocket(DERIV_WS_URL)
    ws.current = socket

    socket.onopen = () => {
      setConnected(true)
      // Authorize if token provided
      if (apiToken) {
        socket.send(JSON.stringify({ authorize: apiToken }))
      } else {
        // Subscribe to ticks without auth (public endpoint)
        socket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }))
      }
    }

    socket.onmessage = (msg) => {
      const data = JSON.parse(msg.data)
      if (data.msg_type === 'authorize') {
        socket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }))
      }
      if (data.msg_type === 'tick') {
        const price = data.tick.quote
        setCurrentPrice(price)
        setTicks(prev => {
          const next = [...prev, { time: Date.now(), price }]
          return next.slice(-120)
        })
      }
    }

    socket.onclose = () => setConnected(false)
    socket.onerror = () => setConnected(false)

    return () => {
      socket.close()
    }
  }, [apiToken])

  return { ticks, currentPrice, connected, ws: ws.current }
}

// ─── CHART COMPONENT ────────────────────────────────────────────────────────────
function PriceChart({ ticks, currentPrice }) {
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

    // Grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.t + (i / 4) * cH
      ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke()
      const val = mx - (i / 4) * range
      ctx.fillStyle = 'rgba(136,146,164,0.7)'
      ctx.font = '11px DM Sans, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(val.toFixed(2), pad.l + cW + 6, y + 4)
    }

    // Price line
    ctx.beginPath()
    prices.forEach((p, i) => {
      const x = toX(i), y = toY(p)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 1.5
    ctx.stroke()

    // Fill
    ctx.lineTo(toX(prices.length - 1), pad.t + cH)
    ctx.lineTo(toX(0), pad.t + cH)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
    grad.addColorStop(0, 'rgba(226,232,240,0.12)')
    grad.addColorStop(1, 'rgba(226,232,240,0)')
    ctx.fillStyle = grad
    ctx.fill()

    // Current price dot
    if (prices.length > 0) {
      const lx = toX(prices.length - 1), ly = toY(prices[prices.length - 1])
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#e2e8f0'; ctx.fill()

      // Price label
      ctx.fillStyle = 'rgba(59,123,255,0.9)'
      const lw = 80
      ctx.beginPath()
      ctx.roundRect(lx + 8, ly - 10, lw, 20, 4)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 11px DM Sans, sans-serif'
      ctx.fillText((prices[prices.length - 1]).toFixed(2), lx + 12, ly + 4)
    }
  }, [ticks])

  return <canvas ref={canvasRef} width={940} height={360} className="w-full" style={{ display: 'block' }} />
}

// ─── DIGIT DISPLAY ──────────────────────────────────────────────────────────────
function DigitRow({ ticks }) {
  const recent = ticks.slice(-10)
  return (
    <div className="flex justify-center gap-2 py-3" style={{ borderTop: '1px solid var(--border)' }}>
      {recent.map((t, i) => {
        const digit = Math.floor(t.price * 100) % 10
        const isCurrent = i === recent.length - 1
        const COLORS = ['#3b7bff','#3b7bff','#3b7bff','#3b7bff','#3b7bff','#3b7bff','#ff4757','#3b7bff','#3b7bff','#3b7bff']
        return (
          <div key={i} className="flex flex-col items-center gap-1">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all" style={{ border: `2px solid ${COLORS[digit]}`, background: isCurrent ? COLORS[digit] + '33' : 'transparent', color: isCurrent ? '#fff' : 'var(--text-secondary)' }}>
              {digit}
            </div>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>10.0%</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── MAIN DASHBOARD ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [apiToken] = useState(process.env.NEXT_PUBLIC_DERIV_TOKEN || '')
  const { ticks, currentPrice, connected } = useDerivWS(apiToken)
  const [stake, setStake] = useState(10)
  const [tradeMode, setTradeMode] = useState('even-odd') // even-odd | match-differ | over-under
  const [autoMode, setAutoMode] = useState(true)
  const [positions, setPositions] = useState([])
  const [balance, setBalance] = useState(0)
  const [activeTab, setActiveTab] = useState('open')
  const [targetProfit] = useState(200)
  const [stopLoss] = useState(999)
  const payout = (stake * 1.952).toFixed(2)

  useEffect(() => {
    const stored = localStorage.getItem('tagoption_user')
    if (!stored) { router.push('/login'); return }
    setUser(JSON.parse(stored))
  }, [router])

  const placeTrade = (type) => {
    if (stake <= 0) return
    const id = Date.now()
    const entry = currentPrice || 9407.44
    const trade = { id, type, stake, entry, time: new Date().toLocaleTimeString(), status: 'open', payout: parseFloat(payout) }
    setPositions(p => [trade, ...p])
    // Simulate resolution after 5s
    setTimeout(() => {
      setPositions(p => p.map(t => {
        if (t.id !== id) return t
        const lastDigit = Math.floor(currentPrice * 100) % 10
        let win = false
        if (type === 'even') win = lastDigit % 2 === 0
        if (type === 'odd') win = lastDigit % 2 !== 0
        const profit = win ? t.payout - t.stake : -t.stake
        setBalance(b => +(b + profit).toFixed(2))
        return { ...t, status: win ? 'won' : 'lost', profit }
      }))
    }, 5000)
  }

  if (!user) return null

  const openPos = positions.filter(p => p.status === 'open')
  const closedPos = positions.filter(p => p.status !== 'open')

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
      {/* TOP NAV */}
      <nav className="flex items-center gap-4 px-4 py-2.5 shrink-0" style={{ background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-1.5 mr-2">
          <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--blue)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
        </div>
        {[
          { icon: '🏠', label: "Trader's Hub", href: '/' },
          { icon: '💳', label: 'Deposit', href: '#' },
          { icon: '↑', label: 'Withdraw', href: '#' },
          { icon: '📋', label: 'History', href: '#' },
          { icon: '💬', label: 'Chat', href: '#' },
        ].map(item => (
          <a key={item.label} href={item.href} className="flex items-center gap-1.5 text-xs px-2 py-1.5 rounded-lg transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>
            <span>{item.icon}</span><span>{item.label}</span>
          </a>
        ))}
        <div className="flex items-center gap-1.5 ml-1 px-3 py-1.5 rounded-lg cursor-pointer" style={{ background: 'var(--blue)', color: '#fff' }}>
          <span className="w-5 h-5 rounded bg-white/20 flex items-center justify-center text-xs font-bold">TO</span>
          <span className="text-xs font-medium">TagOption Trader</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg" style={{ background: 'rgba(59,123,255,0.15)', color: 'var(--blue)' }}>
            ✦ AI
          </button>
          <div className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
            <span className="w-5 h-5 rounded bg-red-500 flex items-center justify-center text-xs text-white font-bold">R</span>
            <span className="font-semibold">${balance.toFixed(2)}</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <button className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all hover:opacity-90" style={{ background: 'var(--blue)', color: '#fff' }}>Deposit</button>
        </div>
      </nav>

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR */}
        <div className="w-56 shrink-0 flex flex-col" style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
          <div className="flex" style={{ borderBottom: '1px solid var(--border)' }}>
            {['Open', 'Closed', 'Txns'].map((t, i) => (
              <button key={t} onClick={() => setActiveTab(t.toLowerCase())} className="flex-1 py-2.5 text-xs font-medium transition-colors" style={{ color: activeTab === t.toLowerCase() ? 'var(--blue)' : 'var(--text-secondary)', borderBottom: activeTab === t.toLowerCase() ? '2px solid var(--blue)' : '2px solid transparent' }}>
                {t} {i === 0 ? `(${openPos.length})` : i === 1 ? `(${closedPos.length})` : ''}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {activeTab === 'open' && openPos.length === 0 && (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <div className="w-10 h-10 rounded-full border-2 flex items-center justify-center mb-3" style={{ borderColor: 'var(--border)' }}>⊙</div>
                <p className="text-xs font-medium">No open positions</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Your active trades will appear here</p>
              </div>
            )}
            {activeTab === 'open' && openPos.map(p => (
              <div key={p.id} className="mb-2 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold capitalize" style={{ color: 'var(--blue)' }}>{p.type}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.time}</span>
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Stake: ${p.stake} → ${p.payout}</div>
                <div className="text-xs mt-1" style={{ color: 'var(--yellow)' }}>⏳ Pending...</div>
              </div>
            ))}
            {activeTab === 'closed' && closedPos.map(p => (
              <div key={p.id} className="mb-2 p-3 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex justify-between mb-1">
                  <span className="text-xs font-semibold capitalize" style={{ color: p.status === 'won' ? 'var(--green)' : 'var(--red)' }}>{p.type} — {p.status}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.time}</span>
                </div>
                <div className="text-xs" style={{ color: p.profit > 0 ? 'var(--green)' : 'var(--red)' }}>
                  {p.profit > 0 ? '+' : ''}{p.profit?.toFixed(2)} USD
                </div>
              </div>
            ))}
          </div>
          <div className="p-3 text-xs" style={{ color: 'var(--text-muted)', borderTop: '1px solid var(--border)' }}>
            {openPos.length} open positions
          </div>
        </div>

        {/* CHART AREA */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Asset header */}
          <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)' }}>
            <div className="flex items-center gap-3">
              <span className="text-xs px-2 py-1 rounded font-bold" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>1T</span>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm">Volatility 10 (1s) Index</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono font-bold">{currentPrice ? currentPrice.toFixed(2) : '9407.44'}</span>
                <span className="text-xs flex items-center gap-1" style={{ color: connected ? 'var(--green)' : 'var(--red)' }}>
                  <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: connected ? 'var(--green)' : 'var(--red)' }}></span>
                  {connected ? 'LIVE' : 'Connecting...'}
                </span>
              </div>
            </div>
            <div className="text-xs font-medium px-3 py-1 rounded" style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)' }}>100%</div>
          </div>

          {/* Chart */}
          <div className="flex-1 relative overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
            {ticks.length > 2 ? (
              <PriceChart ticks={ticks} currentPrice={currentPrice} />
            ) : (
              <MockChart />
            )}
          </div>

          {/* Digit row */}
          {ticks.length >= 10 && <DigitRow ticks={ticks} />}
          {ticks.length < 10 && <MockDigitRow />}
        </div>

        {/* RIGHT PANEL */}
        <div className="w-64 shrink-0 overflow-y-auto" style={{ background: 'var(--bg-secondary)', borderLeft: '1px solid var(--border)' }}>
          <div className="p-4 space-y-4">
            {/* Trading Mode */}
            <div>
              <div className="text-xs font-semibold mb-2 flex justify-between" style={{ color: 'var(--text-secondary)' }}>
                <span>TRADING MODE</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Bot places trades · Start/pause · enable</span>
              </div>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                {['AUTO', 'MANUAL'].map(m => (
                  <button key={m} onClick={() => setAutoMode(m === 'AUTO')} className="flex-1 py-2 text-xs font-semibold transition-all" style={{ background: autoMode === (m === 'AUTO') ? 'var(--blue)' : 'var(--bg-card)', color: autoMode === (m === 'AUTO') ? '#fff' : 'var(--text-secondary)' }}>{m}</button>
                ))}
              </div>
            </div>

            {/* Trade Type */}
            <div className="flex gap-1.5 flex-wrap">
              {[['even-odd', 'Even / Odd'], ['match-differ', 'Match / Differ'], ['over-under', 'Over / Under']].map(([v, l]) => (
                <button key={v} onClick={() => setTradeMode(v)} className="flex-1 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all" style={{ background: tradeMode === v ? 'var(--blue)' : 'var(--bg-card)', color: tradeMode === v ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>{l}</button>
              ))}
            </div>

            {/* Stake */}
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>STAKE AMOUNT</span>
                <div className="flex gap-2">
                  <button className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--blue)', color: '#fff' }}>Stake</button>
                  <button className="text-xs px-2 py-0.5 rounded" style={{ color: 'var(--text-secondary)' }}>Payout</button>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl px-3 py-2" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                <button onClick={() => setStake(s => Math.max(1, s - 1))} className="w-6 h-6 rounded flex items-center justify-center text-lg font-bold transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>−</button>
                <div className="flex-1 flex items-center justify-center gap-1">
                  <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>$</span>
                  <span className="text-2xl font-bold">{stake}</span>
                </div>
                <button onClick={() => setStake(s => s + 1)} className="w-6 h-6 rounded flex items-center justify-center text-lg font-bold transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>+</button>
              </div>
              <div className="flex gap-2 mt-2">
                {[1, 5, 10, 25, 50, 100].map(v => (
                  <button key={v} onClick={() => setStake(v)} className="flex-1 py-1 text-xs rounded-lg font-medium transition-all" style={{ background: stake === v ? 'var(--blue)' : 'var(--bg-card)', color: stake === v ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>${v}</button>
                ))}
              </div>
            </div>

            {/* Payout */}
            <div className="flex justify-between items-center">
              <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Payout</span>
              <span className="text-sm font-bold">{payout} <span className="text-xs" style={{ color: 'var(--text-muted)' }}>USD</span></span>
            </div>

            {/* Target / Stop / Multiplier */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--green)' }}>
                <div className="flex items-center gap-1 mb-1"><span className="w-2 h-2 rounded-full" style={{ background: 'var(--green)' }}></span><span className="text-xs" style={{ color: 'var(--green)' }}>TARGET</span></div>
                <div className="text-sm font-bold">↑ {targetProfit}</div>
              </div>
              <div className="p-2 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--red)' }}>
                <div className="flex items-center gap-1 mb-1"><span className="text-xs" style={{ color: 'var(--red)' }}>⚠ STOP</span></div>
                <div className="text-sm font-bold">↓ {stopLoss}</div>
              </div>
              <div className="p-2 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>× MULT</div>
                <div className="text-sm font-bold">2</div>
              </div>
            </div>

            {/* Trade buttons */}
            {tradeMode === 'even-odd' && (
              <div className="space-y-2">
                <button onClick={() => placeTrade('even')} className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 hover:scale-105 flex items-center justify-between px-4" style={{ background: 'rgba(0,201,123,0.15)', border: '1px solid rgba(0,201,123,0.4)', color: 'var(--green)' }}>
                  <div className="flex items-center gap-2"><span className="grid grid-cols-2 gap-0.5">{[...Array(4)].map((_, i) => <span key={i} className="w-1.5 h-1.5 rounded-sm" style={{ background: 'var(--green)' }} />)}</span><span>Even</span></div>
                  <div className="text-right"><div className="font-bold">{payout} USD</div><div className="text-xs opacity-70">95.22%</div></div>
                </button>
                <button onClick={() => placeTrade('odd')} className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all hover:opacity-90 hover:scale-105 flex items-center justify-between px-4" style={{ background: 'rgba(255,71,87,0.12)', border: '1px solid rgba(255,71,87,0.35)', color: 'var(--red)' }}>
                  <div className="flex items-center gap-2"><span>⚠</span><span>Odd</span></div>
                  <div className="text-right"><div className="font-bold">{payout} USD</div><div className="text-xs opacity-70">95.22%</div></div>
                </button>
              </div>
            )}

            {tradeMode === 'match-differ' && (
              <div className="space-y-2">
                {[0,1,2,3,4,5,6,7,8,9].slice(0,5).map(d => (
                  <button key={d} onClick={() => placeTrade(`match-${d}`)} className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90" style={{ background: 'rgba(59,123,255,0.15)', border: '1px solid rgba(59,123,255,0.3)', color: 'var(--blue)' }}>
                    Match {d} → {payout} USD
                  </button>
                ))}
              </div>
            )}

            {tradeMode === 'over-under' && (
              <div className="space-y-2">
                {['Over 4', 'Under 5'].map(t => (
                  <button key={t} onClick={() => placeTrade(t.toLowerCase())} className="w-full py-3.5 rounded-2xl font-semibold text-sm transition-all hover:opacity-90" style={{ background: 'rgba(59,123,255,0.15)', border: '1px solid rgba(59,123,255,0.3)', color: 'var(--blue)' }}>
                    {t} → {payout} USD
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

// ─── MOCK COMPONENTS (used before WS connects) ──────────────────────────────────
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
      const mn = Math.min(...data), mx = Math.max(...data)
      const range = mx - mn || 1
      const pad = { t: 20, b: 30, l: 10, r: 80 }
      const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b
      const toX = i => pad.l + (i / (data.length - 1)) * cW
      const toY = v => pad.t + cH - ((v - mn) / range) * cH

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + (i / 4) * cH
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke()
        const val = mx - (i / 4) * range
        ctx.fillStyle = 'rgba(136,146,164,0.6)'; ctx.font = '11px DM Sans'
        ctx.textAlign = 'left'; ctx.fillText(val.toFixed(2), pad.l + cW + 6, y + 4)
      }

      // Line
      ctx.beginPath()
      data.forEach((p, i) => { const x = toX(i), y = toY(p); i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y) })
      ctx.strokeStyle = '#e2e8f0'; ctx.lineWidth = 1.5; ctx.stroke()

      // Fill
      ctx.lineTo(toX(data.length - 1), pad.t + cH); ctx.lineTo(toX(0), pad.t + cH); ctx.closePath()
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
      grad.addColorStop(0, 'rgba(226,232,240,0.12)'); grad.addColorStop(1, 'rgba(226,232,240,0)')
      ctx.fillStyle = grad; ctx.fill()

      // Current label
      const lx = toX(data.length - 1), ly = toY(data[data.length - 1])
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.fillStyle = '#e2e8f0'; ctx.fill()
      ctx.fillStyle = 'rgba(59,123,255,0.9)'
      ctx.beginPath(); ctx.roundRect(lx + 8, ly - 10, 72, 20, 4); ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px DM Sans'; ctx.fillText(data[data.length - 1].toFixed(2), lx + 12, ly + 4)

      base += (Math.random() - 0.48) * 3; pts.current.push(base)
      if (pts.current.length > 300) pts.current.shift()
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return <canvas ref={canvasRef} width={940} height={360} className="w-full h-full" style={{ display: 'block' }} />
}

function MockDigitRow() {
  const [digits, setDigits] = useState([0,1,2,3,4,6,7,8,9,5])
  useEffect(() => {
    const t = setInterval(() => setDigits(d => { const n = [...d.slice(1), Math.floor(Math.random() * 10)]; return n }), 1000)
    return () => clearInterval(t)
  }, [])
  const labels = ['12.0%','10.0%','9.6%','11.0%','10.0%','9.2%','8.2%','9.6%','10.0%','10.4%']
  return (
    <div className="flex justify-center gap-2 py-3" style={{ borderTop: '1px solid var(--border)' }}>
      {digits.map((d, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold" style={{ border: `2px solid ${d === 6 ? 'var(--red)' : 'var(--blue)'}`, background: i === digits.length - 1 ? 'rgba(59,123,255,0.2)' : 'transparent', color: i === digits.length - 1 ? '#fff' : 'var(--text-secondary)' }}>{d}</div>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{labels[i]}</span>
        </div>
      ))}
    </div>
  )
}
