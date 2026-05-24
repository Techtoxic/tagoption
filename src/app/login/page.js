'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [focusField, setFocusField] = useState('')

  const handleSubmit = async () => {
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return }
    setError(''); setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    const stored = localStorage.getItem('tagoption_user')
    if (!stored) localStorage.setItem('tagoption_user', JSON.stringify({ name: 'Trader', email: form.email }))
    router.push('/dashboard')
  }

  const inputStyle = (name) => ({
    width: '100%',
    padding: '12px 14px 12px 40px',
    borderRadius: 12,
    background: '#141828',
    border: `1.5px solid ${focusField === name ? '#3b7bff' : 'rgba(255,255,255,0.08)'}`,
    color: '#e2e8f0',
    fontSize: 14,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.2s',
  })

  const iconStyle = {
    position: 'absolute',
    left: 13,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#515c72',
    pointerEvents: 'none',
    display: 'flex',
  }

  const labelStyle = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    color: '#8892a4',
    marginBottom: 6,
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0b0d14' }}>

      {/* LEFT — blue panel */}
      <div style={{
        width: '44%',
        minHeight: '100vh',
        background: 'linear-gradient(145deg, #1a4fd6 0%, #3b7bff 55%, #2563eb 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 56px',
        position: 'relative',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        <div style={{ position: 'absolute', top: '15%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', pointerEvents: 'none', filter: 'blur(60px)' }} />

        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', marginBottom: 64 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
          </div>
          <span style={{ fontWeight: 700, fontSize: 18, color: '#fff' }}>TagOption</span>
        </Link>

        <h2 style={{ fontSize: 30, fontWeight: 700, color: '#fff', marginBottom: 14, lineHeight: 1.25 }}>Welcome back,<br />trader</h2>
        <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 40, lineHeight: 1.7 }}>
          Your portfolio is waiting. Log in to check your positions and keep trading.
        </p>

        {[
          'Real-time Deriv market data',
          'Even / Odd, Match / Differ, Over / Under',
          'Auto and manual trading modes',
          'Instant trade execution',
        ].map(item => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)' }}>{item}</span>
          </div>
        ))}
      </div>

      {/* RIGHT — form */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>

          <h1 style={{ fontSize: 26, fontWeight: 700, marginBottom: 6, color: '#e2e8f0' }}>Welcome back</h1>
          <p style={{ fontSize: 14, color: '#8892a4', marginBottom: 28 }}>Sign in to your account to continue trading</p>

          {/* Email */}
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Email</label>
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              </span>
              <input
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                onFocus={() => setFocusField('email')}
                onBlur={() => setFocusField('')}
                style={inputStyle('email')}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
              <a href="#" style={{ fontSize: 12, color: '#3b7bff', textDecoration: 'none' }}>Forgot password?</a>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={iconStyle}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
              </span>
              <input
                type={showPass ? 'text' : 'password'}
                placeholder="Your password"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                onFocus={() => setFocusField('password')}
                onBlur={() => setFocusField('')}
                onKeyDown={e => e.key === 'Enter' && handleSubmit()}
                style={{ ...inputStyle('password'), paddingRight: 44 }}
              />
              <button
                onClick={() => setShowPass(s => !s)}
                style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#515c72', display: 'flex', padding: 0 }}
              >
                {showPass
                  ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                }
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 10, background: 'rgba(255,71,87,0.1)', border: '1px solid rgba(255,71,87,0.25)', color: '#ff4757', fontSize: 13 }}>
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              borderRadius: 12,
              background: '#3b7bff',
              color: '#fff',
              fontWeight: 600,
              fontSize: 15,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.75 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 20,
            }}
          >
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: 14, color: '#8892a4' }}>
            Don&#39;t have an account?{' '}
            <Link href="/register" style={{ color: '#3b7bff', fontWeight: 600, textDecoration: 'none' }}>Create one free</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
