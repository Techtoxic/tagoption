'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const TICKER_ASSETS = [
  { sym: 'BTC', price: '43,256', change: '+2.34%', up: true, color: '#f7931a' },
  { sym: 'ETH', price: '2,284', change: '+1.87%', up: true, color: '#627eea' },
  { sym: 'AAPL', price: '178.32', change: '-0.45%', up: false, color: '#555' },
  { sym: 'XAU', price: '2,024', change: '+0.89%', up: true, color: '#ffd700' },
  { sym: 'TSLA', price: '248.90', change: '+3.21%', up: true, color: '#cc0000' },
  { sym: 'EUR', price: '1.0892', change: '+0.12%', up: true, color: '#4a90d9' },
  { sym: 'SOL', price: '98.42', change: '+5.67%', up: true, color: '#9945ff' },
  { sym: 'GBP', price: '1.2654', change: '-0.08%', up: false, color: '#012169' },
]

const COLORS = ['#f7931a','#627eea','#555','#ffd700','#cc0000','#4a90d9','#9945ff','#012169']

function Ticker() {
  const tripled = [...TICKER_ASSETS, ...TICKER_ASSETS, ...TICKER_ASSETS]
  return (
    <div className="overflow-hidden" style={{ borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
      <div className="ticker-track flex gap-8 py-3 w-max">
        {tripled.map((a, i) => (
          <div key={i} className="flex items-center gap-2.5 px-2 whitespace-nowrap">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: COLORS[i % COLORS.length] }}>{a.sym[0]}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{a.sym}</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>${a.price}</span>
            <span className="text-xs font-bold" style={{ color: a.up ? 'var(--green)' : 'var(--red)' }}>{a.change}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

const LIVE_TRADES = [
  { name: 'Tom', dir: 'Lower', amt: '$50', color: 'var(--red)' },
  { name: 'Mike', dir: 'Lower', amt: '$200', color: 'var(--red)' },
  { name: 'Rachel', dir: 'Lower', amt: '$10', color: 'var(--red)' },
  { name: 'Lisa', dir: 'Lower', amt: '$200', color: 'var(--red)' },
  { name: 'Julia', dir: 'Lower', amt: '$25', color: 'var(--red)' },
  { name: 'Nina', dir: 'Higher', amt: '$20', color: 'var(--green)' },
]

function HeroChart() {
  const canvasRef = useRef(null)
  const pts = useRef([])
  const animRef = useRef(null)
  const [price, setPrice] = useState(43450.28)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let base = 43243
    for (let i = 0; i < 100; i++) { base += (Math.random() - 0.48) * 120; pts.current.push(base) }

    function draw() {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)
      const data = pts.current.slice(-100)
      const mn = Math.min(...data), mx = Math.max(...data)
      const range = mx - mn || 1
      const pad = { t: 16, b: 20, l: 8, r: 8 }
      const cW = W - pad.l - pad.r, cH = H - pad.t - pad.b
      const toX = i => pad.l + (i / (data.length - 1)) * cW
      const toY = v => pad.t + cH - ((v - mn) / range) * cH

      // Fill gradient
      ctx.beginPath()
      data.forEach((p, i) => { i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)) })
      ctx.lineTo(toX(data.length - 1), pad.t + cH)
      ctx.lineTo(toX(0), pad.t + cH)
      ctx.closePath()
      const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + cH)
      grad.addColorStop(0, 'rgba(0,201,123,0.2)')
      grad.addColorStop(1, 'rgba(0,201,123,0)')
      ctx.fillStyle = grad
      ctx.fill()

      // Line
      ctx.beginPath()
      data.forEach((p, i) => { i === 0 ? ctx.moveTo(toX(i), toY(p)) : ctx.lineTo(toX(i), toY(p)) })
      ctx.strokeStyle = 'var(--green)'
      ctx.lineWidth = 2
      ctx.stroke()

      // End dot
      const lx = toX(data.length - 1), ly = toY(data[data.length - 1])
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#fff'; ctx.fill()
      ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2)
      ctx.strokeStyle = 'var(--green)'; ctx.lineWidth = 2; ctx.stroke()

      // Current label
      ctx.fillStyle = 'rgba(30,34,53,0.9)'
      ctx.beginPath(); ctx.roundRect(lx - 44, ly - 13, 88, 22, 4); ctx.fill()
      ctx.fillStyle = '#e2e8f0'; ctx.font = 'bold 11px DM Sans, sans-serif'
      ctx.textAlign = 'center'; ctx.fillText('$' + data[data.length-1].toFixed(2), lx, ly + 4)

      base += (Math.random() - 0.48) * 120; pts.current.push(base)
      if (pts.current.length > 300) pts.current.shift()
      setPrice(base)
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div className="rounded-2xl overflow-hidden flex-1" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', minWidth: 0 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold" style={{ background: '#f7931a22', color: '#f7931a' }}>B</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">BTC/USD</span>
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(0,201,123,0.15)', color: 'var(--green)' }}>
                <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--green)' }}></span>LIVE
              </span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Bitcoin / US Dollar</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold" style={{ color: 'var(--green)' }}>${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="text-xs" style={{ color: 'var(--green)' }}>+0.45%</div>
        </div>
      </div>
      <canvas ref={canvasRef} width={600} height={200} className="w-full" style={{ display: 'block' }} />
    </div>
  )
}

function LiveTradesPanel() {
  const [trades, setTrades] = useState(LIVE_TRADES)
  const names = ['Tom','Mike','Rachel','Lisa','Julia','Nina','Sarah','Alex','David','Maria','James','Emma']
  useEffect(() => {
    const interval = setInterval(() => {
      const name = names[Math.floor(Math.random() * names.length)]
      const up = Math.random() > 0.5
      const amounts = ['$10','$25','$50','$100','$200']
      const amt = amounts[Math.floor(Math.random() * amounts.length)]
      setTrades(prev => [{ name, dir: up ? 'Higher' : 'Lower', amt, color: up ? 'var(--green)' : 'var(--red)' }, ...prev.slice(0,5)])
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="rounded-2xl overflow-hidden w-52 shrink-0" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>LIVE TRADES</span>
        <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: 'var(--green)' }}></span>
      </div>
      <div className="overflow-hidden" style={{ maxHeight: 260 }}>
        {trades.map((t, i) => (
          <div key={i} className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid var(--border)', opacity: i === 0 ? 1 : 1 - i * 0.12 }}>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: t.color === 'var(--green)' ? 'rgba(0,201,123,0.15)' : 'rgba(255,71,87,0.15)', color: t.color }}>{t.name[0]}</div>
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>just now</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-bold">{t.amt}</div>
              <div className="text-xs font-medium" style={{ color: t.color }}>{t.dir === 'Higher' ? '↑' : '↓'} {t.dir}</div>
            </div>
          </div>
        ))}
      </div>
      <Link href="/register" className="block text-center py-3 text-sm font-semibold transition-all hover:opacity-80" style={{ color: 'var(--blue)', borderTop: '1px solid var(--border)' }}>
        Start Trading
      </Link>
    </div>
  )
}

const FEATURES = [
  { title: 'Blazing Fast', desc: 'Trades execute in under 1 second. Zero lag, zero requotes.', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
  )},
  { title: 'Fully Secured', desc: '256-bit SSL encryption and segregated client accounts.', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
  )},
  { title: '100+ Markets', desc: 'Forex, crypto, stocks, indices, commodities — all in one place.', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  )},
  { title: 'No Hidden Fees', desc: 'Zero fees on deposits and withdrawals. What you see is what you get.', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>
  )},
  { title: 'Trade Anywhere', desc: 'Responsive web app works perfectly on any device, any screen.', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
  )},
  { title: '24/7 Support', desc: 'Real human support around the clock via live chat and email.', icon: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
  )},
]

const REVIEWS = [
  { name: 'Alex M.', initials: 'AM', loc: 'USA', text: 'Switched from three other platforms. TagOption is the fastest and most reliable by far.' },
  { name: 'Sarah K.', initials: 'SK', loc: 'UK', text: 'From crypto to forex, everything in one place. The interface is buttery smooth.' },
  { name: 'James W.', initials: 'JW', loc: 'Germany', text: '10 years of trading experience and this is the best platform I\'ve ever used.' },
  { name: 'Maria G.', initials: 'MG', loc: 'Brazil', text: 'Started with demo and now trade real money. Withdrawals are super fast!' },
  { name: 'David H.', initials: 'DH', loc: 'Japan', text: 'Sub-second execution. Perfect for my scalping strategy. Highly recommended.' },
  { name: 'Lisa T.', initials: 'LT', loc: 'France', text: 'I trade part-time and the mobile experience is flawless. Love the simplicity.' },
]

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      {/* NAV */}
      <nav className="flex items-center justify-between px-8 py-4 sticky top-0 z-50" style={{ background: 'rgba(11,13,20,0.94)', backdropFilter: 'blur(16px)', borderBottom: '1px solid var(--border)' }}>
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <span className="font-bold text-lg">TagOption</span>
        </Link>
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>Features</a>
          <a href="#steps" className="text-sm transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>How It Works</a>
          <a href="#reviews" className="text-sm transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>Reviews</a>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>Log in</Link>
          <Link href="/register" className="text-sm font-semibold px-5 py-2.5 rounded-xl transition-all hover:opacity-90 hover:scale-105" style={{ background: 'var(--blue)', color: '#fff' }}>Get Started</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative px-6 pt-20 pb-10 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 90% 60% at 50% -5%, rgba(59,123,255,0.12), transparent)' }} />
        <div className="max-w-3xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-8" style={{ background: 'rgba(59,123,255,0.1)', border: '1px solid rgba(59,123,255,0.25)', color: 'var(--blue)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
            Over 1 million traders and counting
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
            Trading Made Easy,{' '}
            <span style={{ background: 'linear-gradient(135deg, #3b7bff, #00c97b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Trade Smart</span>
          </h1>
          <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            Trade 100+ assets worldwide with lightning execution and up to 95% returns. Start with as little as $10.
          </p>
          <div className="flex items-center justify-center gap-4 mb-10 flex-wrap">
            <Link href="/register" className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold transition-all hover:opacity-90 hover:scale-105" style={{ background: 'var(--blue)', color: '#fff' }}>
              Get Started — It&#39;s Free →
            </Link>
            <Link href="/dashboard" className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold transition-all hover:bg-white/5" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              Try Demo
            </Link>
          </div>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            {[
              [<svg key="a" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>, '<1s execution'],
              [<svg key="b" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 100 4h4a2 2 0 110 4H8"/><line x1="12" y1="6" x2="12" y2="18"/></svg>, 'Up to 95% payout'],
              [<svg key="c" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>, 'Bank-level security'],
              [<svg key="d" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, 'Zero fees'],
            ].map(([icon, text], i) => (
              <div key={i} className="flex items-center gap-2 text-sm px-4 py-2 rounded-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TICKER */}
      <Ticker />

      {/* HERO CHART + LIVE TRADES */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="flex gap-5 items-stretch" style={{ minHeight: 320 }}>
          <HeroChart />
          <LiveTradesPanel />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--blue)' }}>Platform</span>
          </div>
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold mb-4">Built for serious traders</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className="p-6 rounded-2xl group transition-all hover:scale-[1.02]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 transition-all" style={{ background: 'rgba(59,123,255,0.12)', color: 'var(--blue)', border: '1px solid rgba(59,123,255,0.2)' }}>
                  {f.icon}
                </div>
                <h3 className="font-semibold text-base mb-2">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link href="/register" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90" style={{ background: 'var(--blue)', color: '#fff' }}>
              Get started
            </Link>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="steps" className="py-20">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-xs font-semibold uppercase tracking-widest mb-3 block" style={{ color: 'var(--blue)' }}>Three steps to your first trade</span>
            <h2 className="text-4xl font-bold"></h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-8 left-[calc(16.67%+1rem)] right-[calc(16.67%+1rem)] h-px" style={{ background: 'var(--border)' }}></div>
            {[
              { n: '1', title: 'Sign Up', desc: 'Create your free account in 30 seconds. No documents needed to start.' },
              { n: '2', title: 'Deposit', desc: 'Fund with M-Pesa, crypto, or cards. Start from just $10.' },
              { n: '3', title: 'Trade & Earn', desc: 'Choose an asset, predict the direction, and earn up to 95% profit.' },
            ].map(s => (
              <div key={s.n} className="text-center relative">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-6 relative z-10" style={{ background: 'var(--bg-card)', border: '2px solid var(--blue)', color: 'var(--blue)' }}>{s.n}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-4xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[['1M+','Active traders'],['$2B+','Total traded'],['150+','Countries'],['4.9/5','User rating']].map(([v, l]) => (
              <div key={l} className="text-center">
                <div className="text-4xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>{v}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-4">
            <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--blue)' }}>Wall of love</span>
          </div>
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold">What traders say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {REVIEWS.map(r => (
              <div key={r.name} className="p-6 rounded-2xl transition-all hover:scale-[1.02]" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex gap-1 mb-4">{[...Array(5)].map((_, i) => <span key={i} style={{ color: '#fbbf24' }}>★</span>)}</div>
                <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--text-secondary)' }}>&quot;{r.text}&quot;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--blue)', color: '#fff' }}>{r.initials}</div>
                  <div>
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20" style={{ background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
        <div className="max-w-2xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-4">Ready to start earning?</h2>
          <p className="mb-10 text-lg" style={{ color: 'var(--text-secondary)' }}>Join a million traders worldwide. Create your free account in under 60 seconds.</p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:opacity-90 hover:scale-105" style={{ background: 'var(--blue)', color: '#fff' }}>
              Create Free Account →
            </Link>
            <Link href="/dashboard" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:bg-white/5" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              Try Demo
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: 'var(--bg-primary)', borderTop: '1px solid var(--border)' }}>
        {/* App download banner */}
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-8 p-8 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: 'var(--blue)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              </div>
              <div>
                <div className="font-bold text-lg">TagOption</div>
                <div className="text-sm font-medium" style={{ color: 'var(--blue)' }}>Android App Available</div>
              </div>
            </div>
            <div>
              <div className="font-bold text-lg mb-1">Trade on the go</div>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Download the TagOption app. Get a better trading experience on your mobile device.</p>
            </div>
            <div className="shrink-0">
              <Link href="#" className="flex items-center gap-3 px-5 py-3 rounded-xl font-semibold text-sm transition-all hover:opacity-90" style={{ background: 'var(--blue)', color: '#fff' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.523 15.34l1.595 2.762a.5.5 0 01-.866.5l-1.613-2.795A9.97 9.97 0 0112 17a9.97 9.97 0 01-4.64-1.193L5.748 18.6a.5.5 0 01-.866-.5l1.595-2.762A9.972 9.972 0 012 8h20a9.972 9.972 0 01-4.477 7.34zM8.5 4.5a1 1 0 11-2 0 1 1 0 012 0zm9 0a1 1 0 11-2 0 1 1 0 012 0z"/></svg>
                Download App
              </Link>
              <div className="text-xs mt-2 text-center" style={{ color: 'var(--text-muted)' }}>Secure · Lightweight · Push Alerts</div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 pb-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4" style={{ borderTop: '1px solid var(--border)', paddingTop: 24 }}>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
              </div>
              <span className="font-bold">TagOption</span>
            </Link>
            <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <a href="#" className="hover:text-white transition-colors">Privacy</a>
              <a href="#" className="hover:text-white transition-colors">Terms</a>
              <a href="#" className="hover:text-white transition-colors">Support</a>
            </div>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>© 2026 TagOption</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
