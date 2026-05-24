'use client'
import { useEffect, useRef, useState } from 'react'
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
const TRADE_TYPES = ['Matches/Differs','Even/Odd','Over/Under']

/* ── Deriv WebSocket ── */
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
    ws.onopen  = () => { setConnected(true); ws.send(JSON.stringify({ ticks: symbol, subscribe: 1 })) }
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
    return () => { ws.close() }
  }, [symbol])
  return { ticks, price, connected }
}

/* ── Price Chart ── */
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
      const times  = data.map(d => d.time)
      const mn = Math.min(...prices), mx = Math.max(...prices)
      const range = mx - mn || 1
      const pad = { t: 8, b: 22, l: 6, r: 58 }
      const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b
      const toX = i => pad.l + (i / (prices.length - 1)) * cW
      const toY = v => pad.t + cH - ((v - mn) / range) * cH
      ctx.clearRect(0, 0, W, H)
      // grid
      ctx.strokeStyle = 'rgba(255,255,255,0.05)'; ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = pad.t + (i / 4) * cH
        ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(pad.l + cW, y); ctx.stroke()
        ctx.fillStyle = 'rgba(136,146,164,0.7)'; ctx.font = '8px DM Sans,sans-serif'; ctx.textAlign = 'left'
        ctx.fillText((mx - (i / 4) * range).toFixed(2), pad.l + cW + 3, y + 3)
      }
      // time labels
      const lc = Math.min(4, prices.length)
      ctx.fillStyle = 'rgba(136,146,164,0.6)'; ctx.font = '7.5px DM Sans,sans-serif'; ctx.textAlign = 'center'
      for (let i = 0; i < lc; i++) {
        const idx = Math.floor((i / (lc - 1)) * (prices.length - 1))
        const t = new Date(times[idx])
        const hh = t.getHours().toString().padStart(2,'0')
        const mm = t.getMinutes().toString().padStart(2,'0')
        const ss = t.getSeconds().toString().padStart(2,'0')
        ctx.fillText(`${hh}:${mm}:${ss}`, toX(idx), H - 3)
      }
      // fill
      ctx.beginPath()
      prices.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
      ctx.lineTo(toX(prices.length - 1), pad.t + cH)
      ctx.lineTo(toX(0), pad.t + cH); ctx.closePath()
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
      grad.addColorStop(0, 'rgba(255,255,255,0.06)'); grad.addColorStop(1, 'rgba(255,255,255,0)')
      ctx.fillStyle = grad; ctx.fill()
      // line
      ctx.beginPath()
      prices.forEach((p, i) => i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)))
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()
      // live dot + label
      const lx = toX(prices.length - 1), ly = toY(prices[prices.length - 1])
      ctx.beginPath(); ctx.arc(lx, ly, 3, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill()
      ctx.fillStyle = '#3b7bff'
      if (ctx.roundRect) ctx.roundRect(lx + 3, ly - 9, 60, 18, 3)
      else ctx.rect(lx + 3, ly - 9, 60, 18)
      ctx.fill()
      ctx.fillStyle = '#fff'; ctx.font = 'bold 8.5px DM Sans,sans-serif'; ctx.textAlign = 'left'
      ctx.fillText(prices[prices.length - 1].toFixed(2), lx + 6, ly + 3)
    }
    draw()
    rafRef.current = requestAnimationFrame(function loop() { draw(); rafRef.current = requestAnimationFrame(loop) })
    return () => cancelAnimationFrame(rafRef.current)
  }, [data])

  return <canvas ref={canvasRef} style={{ display:'block', width:'100%', height:'100%' }} />
}

/* ── Digit Ring SVG arc ── */
function DigitCircle({ digit, pct, isActive, prevDigit }) {
  const size = 38
  const r = 16
  const cx = size / 2, cy = size / 2
  const circ = 2 * Math.PI * r
  const filled = (parseFloat(pct) / 100) * circ
  // color: red if digit==5, green otherwise, dim if not active
  const arcColor = digit === 5 ? '#ff4757' : '#00c97b'
  const activeBorder = isActive ? (digit === 5 ? '#ff4757' : '#3b7bff') : 'transparent'

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:0, flexShrink:0, position:'relative' }}>
      <div style={{ position:'relative', width:size, height:size }}>
        <svg width={size} height={size} style={{ position:'absolute', top:0, left:0 }}>
          {/* bg ring */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5"/>
          {/* colored arc */}
          <circle cx={cx} cy={cy} r={r} fill="none"
            stroke={arcColor}
            strokeWidth="2.5"
            strokeDasharray={`${filled} ${circ - filled}`}
            strokeDashoffset={circ * 0.25}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.4s ease' }}
          />
        </svg>
        {/* inner content */}
        <div style={{
          position:'absolute', inset:0,
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          borderRadius:'50%',
          background: isActive ? (digit===5 ? 'rgba(255,71,87,0.18)' : 'rgba(59,123,255,0.18)') : 'transparent'
        }}>
          <span style={{ fontSize:12, fontWeight:700, color: isActive ? '#fff' : 'rgba(226,232,240,0.6)', lineHeight:1 }}>{digit}</span>
          <span style={{ fontSize:6.5, color:'rgba(136,146,164,0.9)', lineHeight:1, marginTop:1 }}>{pct}%</span>
        </div>
      </div>
      {/* active tick marker */}
      {isActive && (
        <div style={{ width:0, height:0, borderLeft:'4px solid transparent', borderRight:'4px solid transparent', borderTop:`5px solid ${digit===5?'#ff4757':'#3b7bff'}`, marginTop:2 }}/>
      )}
    </div>
  )
}

/* ── Digit Row ── */
function DigitRow({ ticks, mockTicks }) {
  const src = ticks.length >= 10 ? ticks : mockTicks
  const counts = Array(10).fill(0)
  const sample = src.slice(-100)
  sample.forEach(t => {
    const s = t.price.toFixed(2).replace('.','')
    counts[parseInt(s[s.length-1])]++
  })
  const tot = sample.length || 1
  const pcts = counts.map(c => ((c/tot)*100).toFixed(1))
  const lastTick = src.at(-1)
  const lastDigit = lastTick ? parseInt(lastTick.price.toFixed(2).replace('.','').slice(-1)) : -1

  return (
    <div style={{
      display:'flex', alignItems:'flex-start', justifyContent:'space-between',
      padding:'7px 6px 4px', background:'#0b0d14',
      borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0
    }}>
      {Array.from({ length:10 }, (_, d) => (
        <DigitCircle key={d} digit={d} pct={pcts[d]} isActive={d === lastDigit} />
      ))}
    </div>
  )
}

/* ── Main ── */
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
  const [bottomTab, setBottomTab] = useState('trade')
  const [showBanner, setShowBanner] = useState(true)
  const [muted, setMuted] = useState(false)
  const mockRef = useRef([])
  const [mockTicks, setMockTicks] = useState([])
  const marketDropRef = useRef(null)

  useEffect(() => {
    let base = 9500
    const arr = []
    for (let i = 0; i < 150; i++) {
      base += (Math.random() - 0.48) * 2.5
      arr.push({ price: base, time: Date.now() - (150 - i) * 1000 })
    }
    mockRef.current = arr; setMockTicks([...arr])
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

  useEffect(() => {
    const h = e => { if (marketDropRef.current && !marketDropRef.current.contains(e.target)) setShowMarketDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const displayPrice = price ?? mockTicks.at(-1)?.price ?? 9500
  const payout = (stake * 1.9522).toFixed(2)
  const openPos = positions.filter(p => p.status === 'open')
  const closedPos = positions.filter(p => p.status !== 'open')

  const priceChange = ticks.length >= 2
    ? ((ticks.at(-1).price - ticks[0].price) / ticks[0].price * 100).toFixed(2)
    : '+0.02'
  const priceChangePos = parseFloat(priceChange) >= 0

  const placeTrade = type => {
    const id = Date.now()
    const entry = price || mockTicks.at(-1)?.price || 9500
    setPositions(prev => [{ id, type, stake, entry, time: new Date().toLocaleTimeString(), status:'open', payout: parseFloat(payout) }, ...prev])
    setTimeout(() => {
      setPositions(prev => prev.map(t => {
        if (t.id !== id) return t
        const cur = price || mockTicks.at(-1)?.price || entry
        const ld = Math.floor(cur * 100) % 10
        let win = false
        if (type==='even') win = ld%2===0
        if (type==='odd')  win = ld%2!==0
        if (type==='over') win = ld>4
        if (type==='under') win = ld<5
        const profit = win ? +(t.payout - t.stake).toFixed(2) : -t.stake
        setBalance(b => +(b + profit).toFixed(2))
        return { ...t, status: win?'won':'lost', profit }
      }))
    }, 5000)
  }

  if (!user) return <div style={{ background:'#0b0d14', minHeight:'100vh' }} />

  return (
    <>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        body{overflow:hidden}
        .ns::-webkit-scrollbar{display:none}
        .ns{-ms-overflow-style:none;scrollbar-width:none}
        .tab-row{display:flex;overflow-x:auto;background:#0b0d14;border-bottom:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .tab-row::-webkit-scrollbar{display:none}
        .tab-btn{flex-shrink:0;padding:9px 13px;font-size:12px;font-weight:600;color:#8892a4;border:none;background:transparent;cursor:pointer;border-bottom:2px solid transparent;display:flex;align-items:center;gap:5px;white-space:nowrap}
        .tab-btn.active{color:#3b7bff;border-bottom-color:#3b7bff}
        .stkbtn{flex:1;padding:5px 0;border-radius:6px;border:1px solid rgba(255,255,255,0.08);background:#141828;color:#8892a4;font-size:11px;font-weight:600;cursor:pointer}
        .stkbtn.active{border-color:#3b7bff;background:rgba(59,123,255,0.18);color:#3b7bff}
        .mkt-drop{position:absolute;top:calc(100% + 3px);left:0;width:200px;background:#141828;border:1px solid rgba(255,255,255,0.1);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.8);z-index:500;overflow:hidden;max-height:240px;overflow-y:auto}
        .mkt-opt{width:100%;padding:8px 12px;border:none;background:transparent;color:#e2e8f0;font-size:12px;text-align:left;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.04);display:flex;align-items:center;gap:6px}
        .mkt-opt:hover{background:rgba(59,123,255,0.1)}
        .mkt-opt.sel{background:rgba(59,123,255,0.15);color:#3b7bff}
        .bnav{display:flex;background:#0f1220;border-top:1px solid rgba(255,255,255,0.07);flex-shrink:0}
        .bnav-btn{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:8px 0;border:none;background:transparent;cursor:pointer;color:#8892a4;font-size:10px;font-weight:500}
        .bnav-btn.active{color:#3b7bff}
      `}</style>

      <div style={{ display:'flex', flexDirection:'column', height:'100dvh', background:'#0b0d14', color:'#e2e8f0', fontFamily:"'DM Sans',sans-serif", overflow:'hidden' }}>

        {/* BANNER */}
        {showBanner && (
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 12px', background:'#1a1f35', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'#3b7bff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:11, fontWeight:700 }}>Get the TagOption App</div>
              <div style={{ fontSize:10, color:'#8892a4' }}>Get a better trading experience</div>
            </div>
            <button style={{ padding:'5px 11px', borderRadius:7, border:'1px solid rgba(255,255,255,0.2)', background:'transparent', color:'#fff', fontSize:11, fontWeight:600, cursor:'pointer', flexShrink:0 }}>Download</button>
            <button onClick={() => setShowBanner(false)} style={{ width:20, height:20, borderRadius:5, border:'none', background:'rgba(255,255,255,0.08)', color:'#8892a4', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        )}

        {/* TOP NAV */}
        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0 10px', height:44, background:'#0f1220', borderBottom:'1px solid rgba(255,255,255,0.07)', flexShrink:0 }}>
          <button style={{ background:'transparent', border:'none', cursor:'pointer', color:'#8892a4', padding:3 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div style={{ width:27, height:27, borderRadius:'50%', background:'#3b7bff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', flexShrink:0 }}>
            {user?.name?.[0]?.toUpperCase()||'T'}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:4, padding:'4px 7px', borderRadius:7, border:'1px solid rgba(255,255,255,0.1)', background:'#141828' }}>
            <span style={{ width:16, height:16, borderRadius:4, background:'#ff4757', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, flexShrink:0 }}>R</span>
            <span style={{ fontSize:12, fontWeight:700 }}>$ {balance.toFixed(2)}</span>
            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#8892a4" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
          <div style={{ flex:1 }}/>
          <button onClick={() => setMuted(m=>!m)} style={{ background:'transparent', border:'none', cursor:'pointer', color:'#8892a4', padding:3 }}>
            {muted
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 010 7.07"/></svg>
            }
          </button>
          <button style={{ padding:'5px 12px', borderRadius:7, border:'none', background:'#3b7bff', color:'#fff', fontSize:12, fontWeight:700, cursor:'pointer' }}>Deposit</button>
          <button style={{ background:'transparent', border:'none', cursor:'pointer', color:'#8892a4', padding:3 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
          </button>
        </div>

        {/* TRADE TYPE TABS */}
        <div className="tab-row">
          {TRADE_TYPES.map(t => (
            <button key={t} className={`tab-btn ${tradeType===t?'active':''}`} onClick={() => setTradeType(t)}>
              {t==='Matches/Differs'&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>}
              {t==='Even/Odd'&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>}
              {t==='Over/Under'&&<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 11 12 6 7 11"/><polyline points="17 18 12 13 7 18"/></svg>}
              {t}
            </button>
          ))}
        </div>

        {/* CHART */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>
          {/* toolbar */}
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'0 8px', height:36, background:'#0b0d14', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#8892a4" strokeWidth="2" style={{ flexShrink:0 }}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
            <div style={{ position:'relative', flexShrink:0 }} ref={marketDropRef}>
              <button onClick={() => setShowMarketDrop(d=>!d)} style={{ display:'flex', alignItems:'center', gap:4, border:'none', background:'transparent', cursor:'pointer', color:'#e2e8f0' }}>
                <span style={{ fontSize:12, fontWeight:700 }}>{market.label}</span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#8892a4" strokeWidth="2.5"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              {showMarketDrop && (
                <div className="mkt-drop ns">
                  {MARKETS.map(m => (
                    <button key={m.sym} className={`mkt-opt ${market.sym===m.sym?'sel':''}`} onClick={() => { setMarket(m); setShowMarketDrop(false) }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
                      {m.label}
                      {market.sym===m.sym&&<span style={{ marginLeft:'auto', width:5, height:5, borderRadius:'50%', background:'#00c97b', display:'inline-block' }}/>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span style={{ fontSize:12, fontWeight:700 }}>{displayPrice.toFixed(2)}</span>
            <span style={{ fontSize:10, fontWeight:600, color: priceChangePos?'#00c97b':'#ff4757' }}>
              {priceChangePos?'+':''}{priceChange}%
            </span>
            <span style={{ width:6, height:6, borderRadius:'50%', background:connected?'#00c97b':'#fbbf24', display:'inline-block', flexShrink:0 }}/>
            <div style={{ flex:1 }}/>
            <span style={{ padding:'2px 7px', borderRadius:4, background:'#141828', color:'#8892a4', fontSize:10, fontWeight:600, flexShrink:0 }}>100%</span>
          </div>

          {/* canvas */}
          <div style={{ flex:1, position:'relative', overflow:'hidden', minHeight:0 }}>
            <div style={{ position:'absolute', left:6, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:3, zIndex:10 }}>
              {['+','−'].map(s => (
                <button key={s} style={{ width:22, height:22, borderRadius:5, border:'1px solid rgba(255,255,255,0.1)', background:'#141828', color:'#e2e8f0', fontSize:s==='+'?15:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1, paddingBottom: s==='−'?2:0 }}>{s}</button>
              ))}
            </div>
            <PriceChart ticks={ticks} mockTicks={mockTicks}/>
          </div>

          {/* digit row */}
          <DigitRow ticks={ticks} mockTicks={mockTicks}/>
        </div>

        {/* TRADE PANEL */}
        {bottomTab === 'trade' && (
          <div className="ns" style={{ background:'#0f1220', flexShrink:0, overflowY:'auto', maxHeight:'46vh', borderTop:'1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ padding:'10px 12px', display:'flex', flexDirection:'column', gap:8 }}>

              {/* AUTO / MANUAL */}
              <div style={{ display:'flex', borderRadius:8, overflow:'hidden', border:'1px solid rgba(255,255,255,0.08)' }}>
                {['AUTO','MANUAL'].map(m => (
                  <button key={m} onClick={() => setAutoMode(m==='AUTO')} style={{ flex:1, padding:'7px 0', border:'none', cursor:'pointer', fontSize:12, fontWeight:700, background:autoMode===(m==='AUTO')?'#3b7bff':'#141828', color:autoMode===(m==='AUTO')?'#fff':'#8892a4' }}>{m}</button>
                ))}
              </div>

              {/* Stake */}
              <div>
                <div style={{ textAlign:'center', fontSize:9, fontWeight:700, letterSpacing:1, color:'#8892a4', marginBottom:5 }}>STAKE</div>
                <div style={{ display:'flex', alignItems:'center', borderRadius:10, border:'1px solid rgba(255,255,255,0.1)', background:'#141828', padding:'5px 8px' }}>
                  <button onClick={() => setStake(s=>Math.max(1,s-1))} style={{ width:28, height:28, borderRadius:7, border:'none', cursor:'pointer', background:'rgba(255,255,255,0.08)', color:'#e2e8f0', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>−</button>
                  <div style={{ flex:1, textAlign:'center' }}>
                    <span style={{ fontSize:11, color:'#8892a4', marginRight:3 }}>$</span>
                    <span style={{ fontSize:24, fontWeight:700 }}>{stake}</span>
                  </div>
                  <button onClick={() => setStake(s=>s+1)} style={{ width:28, height:28, borderRadius:7, border:'none', cursor:'pointer', background:'rgba(255,255,255,0.08)', color:'#e2e8f0', fontSize:18, display:'flex', alignItems:'center', justifyContent:'center' }}>+</button>
                </div>
                <div style={{ display:'flex', gap:4, marginTop:5 }}>
                  {[1,5,10,25,50,100].map(v => (
                    <button key={v} onClick={() => setStake(v)} className={`stkbtn ${stake===v?'active':''}`}>${v}</button>
                  ))}
                </div>
              </div>

              {/* Target / Stop / Multiplier */}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:5 }}>
                <div style={{ padding:'6px 7px', borderRadius:8, background:'#141828', border:'1px solid rgba(0,201,123,0.2)' }}>
                  <div style={{ fontSize:7.5, fontWeight:700, color:'#00c97b', marginBottom:2 }}>TARGET PROFIT</div>
                  <div style={{ fontSize:9, color:'#8892a4' }}>$</div>
                  <div style={{ fontSize:14, fontWeight:700 }}>200</div>
                </div>
                <div style={{ padding:'6px 7px', borderRadius:8, background:'#141828', border:'1px solid rgba(255,71,87,0.2)' }}>
                  <div style={{ fontSize:7.5, fontWeight:700, color:'#ff4757', marginBottom:2 }}>STOP LOSS</div>
                  <div style={{ fontSize:9, color:'#8892a4' }}>$</div>
                  <div style={{ fontSize:14, fontWeight:700 }}>999</div>
                </div>
                <div style={{ padding:'6px 7px', borderRadius:8, background:'#141828', border:'1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ fontSize:7.5, fontWeight:700, color:'#8892a4', marginBottom:2 }}>MULTIPLIER</div>
                  <div style={{ fontSize:9, color:'#8892a4' }}>x</div>
                  <div style={{ fontSize:14, fontWeight:700 }}>2</div>
                </div>
              </div>

              {/* Trade Buttons */}
              {tradeType==='Even/Odd' && (
                <div style={{ display:'flex', gap:6 }}>
                  {[['even','Even','#00c97b'],['odd','Odd','#ff4757']].map(([type,label,color])=>(
                    <button key={type} onClick={() => placeTrade(type)} style={{
                      flex:1, padding:'10px 10px', borderRadius:10, border:'none', cursor:'pointer',
                      background:color, color:'#fff',
                      display:'flex', alignItems:'center', justifyContent:'space-between'
                    }}>
                      <div style={{ textAlign:'left' }}>
                        <div style={{ fontSize:14, fontWeight:800 }}>{label}</div>
                        <div style={{ fontSize:10, opacity:0.85 }}>95.2%</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:14, fontWeight:800 }}>${payout}</div>
                        <div style={{ fontSize:10, opacity:0.85 }}>Payout</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {tradeType==='Over/Under' && (
                <div style={{ display:'flex', gap:6 }}>
                  {[['over','Over 4','#00c97b'],['under','Under 5','#ff4757']].map(([type,label,color])=>(
                    <button key={type} onClick={() => placeTrade(type)} style={{
                      flex:1, padding:'10px 10px', borderRadius:10, border:'none', cursor:'pointer',
                      background:color, color:'#fff',
                      display:'flex', alignItems:'center', justifyContent:'space-between'
                    }}>
                      <div style={{ textAlign:'left' }}>
                        <div style={{ fontSize:14, fontWeight:800 }}>{label}</div>
                        <div style={{ fontSize:10, opacity:0.85 }}>95.2%</div>
                      </div>
                      <div style={{ textAlign:'right' }}>
                        <div style={{ fontSize:14, fontWeight:800 }}>${payout}</div>
                        <div style={{ fontSize:10, opacity:0.85 }}>Payout</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {tradeType==='Matches/Differs' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:5 }}>
                  {[0,1,2,3,4,5,6,7,8,9].map(d => (
                    <button key={d} onClick={() => placeTrade(`match-${d}`)} style={{ padding:'8px 10px', borderRadius:8, border:'1px solid rgba(59,123,255,0.25)', background:'rgba(59,123,255,0.08)', color:'#3b7bff', fontSize:12, fontWeight:600, cursor:'pointer', display:'flex', justifyContent:'space-between' }}>
                      <span>Match {d}</span><span style={{ fontSize:10, opacity:0.8 }}>${payout}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* POSITIONS PANEL */}
        {bottomTab==='positions' && (
          <div className="ns" style={{ background:'#0f1220', flexShrink:0, overflowY:'auto', maxHeight:'46vh', borderTop:'1px solid rgba(255,255,255,0.07)', padding:10 }}>
            {openPos.length===0&&closedPos.length===0&&(
              <div style={{ textAlign:'center', color:'#515c72', fontSize:12, padding:'24px 0' }}>No positions yet. Place a trade to get started.</div>
            )}
            {[...openPos,...closedPos].map(p => (
              <div key={p.id} style={{ marginBottom:6, padding:10, borderRadius:8, background:'#141828', border:'1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
                  <span style={{ fontSize:12, fontWeight:700, textTransform:'capitalize', color:p.status==='open'?'#3b7bff':p.status==='won'?'#00c97b':'#ff4757' }}>
                    {p.type} {p.status!=='open'&&`— ${p.status}`}
                  </span>
                  <span style={{ fontSize:10, color:'#515c72' }}>{p.time}</span>
                </div>
                {p.status==='open'
                  ? <div style={{ fontSize:11, color:'#8892a4' }}>Stake ${p.stake} → ${p.payout} <span style={{ color:'#fbbf24' }}>Pending…</span></div>
                  : <div style={{ fontSize:13, fontWeight:700, color:p.profit>0?'#00c97b':'#ff4757' }}>{p.profit>0?'+':''}{p.profit?.toFixed(2)} USD</div>
                }
              </div>
            ))}
          </div>
        )}

        {/* AI PANEL */}
        {bottomTab==='ai' && (
          <div style={{ background:'#0f1220', flexShrink:0, maxHeight:'46vh', borderTop:'1px solid rgba(255,255,255,0.07)', padding:16, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10 }}>
            <div style={{ width:46, height:46, borderRadius:'50%', background:'linear-gradient(135deg,#7c3aed,#3b7bff)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            <div style={{ textAlign:'center' }}>
              <div style={{ fontSize:14, fontWeight:700, marginBottom:4 }}>TagOption AI</div>
              <div style={{ fontSize:11, color:'#8892a4' }}>AI trading signals & analysis coming soon.</div>
            </div>
          </div>
        )}

        {/* BOTTOM NAV */}
        <div className="bnav">
          <button className={`bnav-btn ${bottomTab==='trade'?'active':''}`} onClick={() => setBottomTab('trade')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>
            Trade
          </button>
          <button className={`bnav-btn ${bottomTab==='ai'?'active':''}`} onClick={() => setBottomTab('ai')}>
            <div style={{ width:26, height:26, borderRadius:'50%', background:bottomTab==='ai'?'linear-gradient(135deg,#7c3aed,#3b7bff)':'linear-gradient(135deg,#7c3aed55,#3b7bff55)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            </div>
            AI
          </button>
          <button className={`bnav-btn ${bottomTab==='positions'?'active':''}`} onClick={() => setBottomTab('positions')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Positions
          </button>
        </div>

      </div>
    </>
  )
}
