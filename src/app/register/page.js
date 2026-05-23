'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [agreed, setAgreed] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.password) { setError('Please fill in all fields.'); return }
    if (form.password !== form.confirm) { setError('Passwords do not match.'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters.'); return }
    if (!agreed) { setError('Please agree to the Terms of Service.'); return }
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 900))
    localStorage.setItem('tagoption_user', JSON.stringify({ name: form.name, email: form.email }))
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      {/* Left panel */}
      <div className="hidden md:flex flex-col justify-center px-12 py-16 w-[46%] relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a4fd6 0%, #3b7bff 60%, #2563eb 100%)' }}>
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse 70% 60% at 30% 40%, rgba(255,255,255,0.08), transparent)' }} />
        <Link href="/" className="flex items-center gap-2.5 mb-16 relative">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <span className="font-bold text-xl text-white">TagOption</span>
        </Link>
        <div className="relative">
          <h2 className="text-3xl font-bold text-white mb-4">Start your trading<br />journey today</h2>
          <p className="text-blue-100 mb-10 leading-relaxed">Join over a million traders worldwide. Get access to powerful tools, real-time data, and instant payouts.</p>
          <div className="space-y-3.5">
            {[
              'Free demo with $10,000 virtual funds',
              'Trade 100+ assets — crypto, forex, stocks',
              'Up to 95% profit on winning trades',
              'Instant deposits, fast withdrawals',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(255,255,255,0.2)' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <span className="text-sm text-blue-100">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <Link href="/" className="flex md:hidden items-center gap-2 mb-8 justify-center">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--blue)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </div>
            <span className="font-bold text-lg">TagOption</span>
          </Link>

          <h1 className="text-2xl font-bold mb-1">Create account</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--text-secondary)' }}>Fill in your details to get started</p>

          <div className="space-y-4">
            {/* Name */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Full Name</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="John Doe" type="text"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder="you@example.com" type="email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Min 6 characters" type={showPass ? 'text' : 'password'}
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
                <button onClick={() => setShowPass(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                  {showPass
                    ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  }
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Confirm Password</label>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                <input value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                  placeholder="Repeat your password" type="password"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onFocus={e => e.target.style.borderColor = 'var(--blue)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
            </div>

            {/* Terms */}
            <div className="flex items-start gap-3">
              <input type="checkbox" id="terms" checked={agreed} onChange={e => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded cursor-pointer" style={{ accentColor: 'var(--blue)' }}
              />
              <label htmlFor="terms" className="text-sm cursor-pointer" style={{ color: 'var(--text-secondary)' }}>
                I agree to the{' '}
                <a href="#" className="hover:underline" style={{ color: 'var(--blue)' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="#" className="hover:underline" style={{ color: 'var(--blue)' }}>Privacy Policy</a>
              </label>
            </div>

            {error && <div className="text-sm px-3 py-2 rounded-lg" style={{ background: 'rgba(255,71,87,0.12)', color: 'var(--red)', border: '1px solid rgba(255,71,87,0.25)' }}>{error}</div>}

            <button onClick={handleSubmit} disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2"
              style={{ background: 'var(--blue)', color: '#fff', opacity: loading ? 0.7 : 1 }}>
              {loading ? (
                <><svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeOpacity="0.25"/><path d="M21 12a9 9 0 00-9-9"/></svg>Creating account...</>
              ) : 'Create Account →'}
            </button>

            <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
              Already have an account?{' '}
              <Link href="/login" className="font-semibold hover:underline" style={{ color: 'var(--blue)' }}>Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
