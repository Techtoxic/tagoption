'use client'
import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

const TICKER_ASSETS = [
  { sym: 'ETH', price: '2,284', change: '+1.87%', up: true },
  { sym: 'AAPL', price: '178.32', change: '-0.45%', up: false },
  { sym: 'XAU', price: '2,024', change: '+0.89%', up: true },
  { sym: 'TSLA', price: '248.90', change: '+3.21%', up: true },
  { sym: 'EUR', price: '1.0892', change: '+0.12%', up: true },
  { sym: 'SOL', price: '98.42', change: '+5.67%', up: true },
  { sym: 'GBP', price: '1.2654', change: '-0.08%', up: false },
  { sym: 'BTC', price: '43,256', change: '+2.34%', up: true },
  { sym: 'AMZN', price: '178.25', change: '+1.12%', up: true },
  { sym: 'OIL', price: '82.41', change: '-0.67%', up: false },
]

function Ticker() {
  const doubled = [...TICKER_ASSETS, ...TICKER_ASSETS]
  return (
    <div className="overflow-hidden border-y" style={{ borderColor: 'var(--border)', background: 'var(--bg-secondary)' }}>
      <div className="ticker-track flex gap-8 py-3 w-max">
        {doubled.map((a, i) => (
          <div key={i} className="flex items-center gap-2 px-2 whitespace-nowrap">
            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'var(--blue)', color: '#fff' }}>{a.sym[0]}</span>
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{a.sym}</span>
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>${a.price}</span>
            <span className="text-xs font-medium" style={{ color: a.up ? 'var(--green)' : 'var(--red)' }}>{a.change}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function LiveChart() {
  const canvasRef = useRef(null)
  const points = useRef([])
  const animRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let base = 43243.90
    for (let i = 0; i < 80; i++) {
      base += (Math.random() - 0.48) * 80
      points.current.push(base)
    }

    function draw() {
      const W = canvas.width, H = canvas.height
      ctx.clearRect(0, 0, W, H)
      const pts = points.current.slice(-80)
      const mn = Math.min(...pts), mx = Math.max(...pts)
      const range = mx - mn || 1
      const toY = v => H - 20 - ((v - mn) / range) * (H - 40)
      const stepX = W / (pts.length - 1)

      ctx.beginPath()
      ctx.moveTo(0, toY(pts[0]))
      pts.forEach((p, i) => ctx.lineTo(i * stepX, toY(p)))
      ctx.strokeStyle = '#ef4444'
      ctx.lineWidth = 2
      ctx.stroke()

      const grad = ctx.createLinearGradient(0, 0, 0, H)
      grad.addColorStop(0, 'rgba(239,68,68,0.25)')
      grad.addColorStop(1, 'rgba(239,68,68,0)')
      ctx.lineTo((pts.length - 1) * stepX, H)
      ctx.lineTo(0, H)
      ctx.closePath()
      ctx.fillStyle = grad
      ctx.fill()

      base += (Math.random() - 0.48) * 80
      points.current.push(base)
      if (points.current.length > 200) points.current.shift()
      animRef.current = requestAnimationFrame(draw)
    }
    draw()
    return () => cancelAnimationFrame(animRef.current)
  }, [])

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{ background: '#f7931a22', color: '#f7931a' }}>B</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm">BTC/USD</span>
              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: '#00c97b22', color: 'var(--green)' }}>
                <span className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: 'var(--green)' }}></span>LIVE
              </span>
            </div>
            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Bitcoin / US Dollar</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold" style={{ color: 'var(--green)' }}>$43,243.90</div>
          <div className="text-xs" style={{ color: 'var(--red)' }}>-0.03%</div>
        </div>
      </div>
      <canvas ref={canvasRef} width={700} height={180} className="w-full" style={{ display: 'block' }} />
      <div className="px-5 py-3 flex gap-4" style={{ borderTop: '1px solid var(--border)' }}>
        {['LIVE TRADES', ''].includes('') || (
          <span className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>LIVE TRADES</span>
        )}
        <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>LIVE TRADES</div>
      </div>
      {[{ name: 'Chris', amt: '$25', dir: 'Lower', t: '22s ago' }, { name: 'Tom', amt: '$200', dir: 'Higher', t: '45s ago' }, { name: 'Sara', amt: '$50', dir: 'Lower', t: '1m ago' }].map((t, i) => (
        <div key={i} className="flex items-center justify-between px-5 py-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: t.dir === 'Lower' ? '#ff475722' : '#00c97b22', color: t.dir === 'Lower' ? 'var(--red)' : 'var(--green)' }}>{t.name[0]}</div>
            <div>
              <div className="text-sm font-medium">{t.name}</div>
              <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{t.t}</div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold">{t.amt}</div>
            <div className="text-xs" style={{ color: t.dir === 'Lower' ? 'var(--red)' : 'var(--green)' }}>{t.dir}</div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default function LandingPage() {
  return (
    <div style={{ background: 'var(--bg-primary)', minHeight: '100vh' }}>
      {/* NAV */}
      <nav className="flex items-center justify-between px-8 py-4 sticky top-0 z-50" style={{ background: 'rgba(11,13,20,0.92)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <span className="font-bold text-lg">TagOption</span>
        </div>
        <div className="hidden md:flex items-center gap-8">
          {['Features', 'How It Works', 'Reviews'].map(item => (
            <a key={item} href={`#${item.toLowerCase().replace(/ /g, '-')}`} className="text-sm transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>{item}</a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-lg transition-colors hover:text-white" style={{ color: 'var(--text-secondary)' }}>Log In</Link>
          <Link href="/register" className="text-sm font-semibold px-5 py-2 rounded-xl transition-all hover:opacity-90" style={{ background: 'var(--blue)', color: '#fff' }}>Get Started</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative px-6 pt-20 pb-16 text-center overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(59,123,255,0.15), transparent)' }} />
        <div className="max-w-4xl mx-auto relative">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm mb-8" style={{ background: 'rgba(59,123,255,0.12)', border: '1px solid rgba(59,123,255,0.25)', color: 'var(--blue)' }}>
            <span>👍</span> Over 1 million traders and counting
          </div>
          <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6" style={{ fontFamily: 'Space Grotesk' }}>
            Trading Made Easy,{' '}
            <span style={{ background: 'linear-gradient(135deg, #3b7bff, #00c97b)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Trade Smart</span>
          </h1>
          <p className="text-lg mb-10 max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Trade 100+ assets worldwide with lightning execution and up to 95% returns. Start with as little as $10.
          </p>
          <div className="flex items-center justify-center gap-4 mb-12 flex-wrap">
            <Link href="/register" className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold transition-all hover:opacity-90 hover:scale-105" style={{ background: 'var(--blue)', color: '#fff' }}>
              Get Started — It&#39;s Free →
            </Link>
            <Link href="/dashboard" className="flex items-center gap-2 px-7 py-3.5 rounded-xl font-semibold transition-all hover:bg-white/10" style={{ border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
              ▶ Try Demo
            </Link>
          </div>
          <div className="flex items-center justify-center gap-6 flex-wrap">
            {[['⚡', '<1s execution'], ['💰', 'Up to 95% payout'], ['🛡', 'Bank-level security'], ['✦', 'Zero fees']].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-2 text-sm px-4 py-2 rounded-full" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <span>{icon}</span><span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TICKER */}
      <Ticker />

      {/* CHART PREVIEW */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <LiveChart />
      </section>

      {/* FEATURES */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-14">
          <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Everything you need to trade</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Professional-grade tools for every trader level</p>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {[
            { icon: '📊', title: 'Real-Time Markets', desc: 'Live price feeds from global exchanges with sub-second execution speed.' },
            { icon: '🤖', title: 'AI Trading Assistant', desc: 'Smart AI-powered signals and insights to boost your win rate.' },
            { icon: '🎯', title: 'Even / Odd Trading', desc: 'Predict digit outcomes on volatility indices for fast, exciting trades.' },
            { icon: '🔐', title: 'Bank-Level Security', desc: 'Your funds and data are protected with military-grade encryption.' },
            { icon: '💸', title: 'Instant Payouts', desc: 'Withdraw your winnings instantly — no waiting, no hidden fees.' },
            { icon: '📱', title: 'Trade Anywhere', desc: 'Full trading experience on any device, any browser, any time.' },
          ].map(f => (
            <div key={f.title} className="p-6 rounded-2xl transition-all hover:scale-105" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="text-3xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-16" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk' }}>How It Works</h2>
            <p style={{ color: 'var(--text-secondary)' }}>Start trading in 3 simple steps</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { n: '01', title: 'Create Account', desc: 'Sign up free in under 60 seconds. No credit card needed.' },
              { n: '02', title: 'Deposit Funds', desc: 'Fund your account from $10 using multiple payment methods.' },
              { n: '03', title: 'Start Trading', desc: 'Pick an asset, set your stake, and trade with up to 95% payout.' },
            ].map(s => (
              <div key={s.n} className="text-center">
                <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-bold mx-auto mb-5" style={{ background: 'rgba(59,123,255,0.15)', color: 'var(--blue)', border: '1px solid rgba(59,123,255,0.3)' }}>{s.n}</div>
                <h3 className="font-semibold text-lg mb-2">{s.title}</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="grid grid-cols-3 gap-6">
            {[['1M+', 'Active Traders'], ['100+', 'Assets Available'], ['95%', 'Max Payout']].map(([v, l]) => (
              <div key={l} className="text-center py-10 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="text-4xl font-bold mb-2" style={{ color: 'var(--blue)', fontFamily: 'Space Grotesk' }}>{v}</div>
                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section id="reviews" className="py-16" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Loved by Traders</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: 'Marcus T.', role: 'Day Trader', text: 'TagOption changed how I trade. The even/odd feature is addictive and the payouts are consistently 95%.' },
              { name: 'Aisha K.', role: 'Forex Trader', text: 'The AI assistant is genuinely helpful. Best platform I\'ve used in 5 years of trading.' },
              { name: 'David M.', role: 'Crypto Enthusiast', text: 'Instant withdrawals, zero fees, and an interface that actually makes sense. Couldn\'t ask for more.' },
            ].map(r => (
              <div key={r.name} className="p-6 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="flex gap-1 mb-4">{[...Array(5)].map((_, i) => <span key={i} style={{ color: 'var(--yellow)' }}>★</span>)}</div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>&#34;{r.text}&#34;</p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--blue)', color: '#fff' }}>{r.name[0]}</div>
                  <div>
                    <div className="text-sm font-semibold">{r.name}</div>
                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{r.role}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 text-center">
        <div className="max-w-2xl mx-auto px-6">
          <h2 className="text-4xl font-bold mb-4" style={{ fontFamily: 'Space Grotesk' }}>Ready to start trading?</h2>
          <p className="mb-8" style={{ color: 'var(--text-secondary)' }}>Join over 1 million traders. No experience required.</p>
          <Link href="/register" className="inline-flex items-center gap-2 px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:opacity-90 hover:scale-105" style={{ background: 'var(--blue)', color: '#fff' }}>
            Create Free Account →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-8 text-center text-sm" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        © 2025 TagOption. All rights reserved. Trading involves risk.
      </footer>
    </div>
  )
}
