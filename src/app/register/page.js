'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirm) return alert('Passwords do not match')
    setLoading(true)
    await new Promise(r => setTimeout(r, 800))
    localStorage.setItem('tagoption_user', JSON.stringify({ email: form.email, name: form.name }))
    router.push('/dashboard')
  }

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  return (
    <div className="min-h-screen flex" style={{ background: 'var(--bg-primary)' }}>
      <div className="hidden lg:flex flex-col justify-center px-16 w-[45%] relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #2563eb 0%, #3b7bff 50%, #1d4ed8 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 20% 80%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <div className="relative">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/20">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>
            </div>
            <span className="font-bold text-2xl text-white">TagOption</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-4 leading-tight" style={{ fontFamily: 'Space Grotesk' }}>Join 1 million traders worldwide</h2>
          <p className="text-white/70 text-lg mb-12">Start trading with as little as $10. No experience needed.</p>
          <div className="space-y-4">
            {['✓ Free to create an account', '✓ Up to 95% payout on trades', '✓ Withdraw anytime, zero fees', '✓ AI-powered trading assistant'].map(t => (
              <div key={t} className="text-white/80 text-sm">{t}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-8" style={{ background: 'var(--bg-secondary)' }}>
        <div className="w-full max-w-sm fade-in">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2" style={{ fontFamily: 'Space Grotesk' }}>Create account</h1>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Start your trading journey today</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { key: 'name', label: 'Full Name', type: 'text', placeholder: 'John Doe' },
              { key: 'email', label: 'Email', type: 'email', placeholder: 'you@example.com' },
              { key: 'password', label: 'Password', type: 'password', placeholder: 'Create a password' },
              { key: 'confirm', label: 'Confirm Password', type: 'password', placeholder: 'Repeat password' },
            ].map(({ key, label, type, placeholder }) => (
              <div key={key}>
                <label className="block text-sm font-medium mb-2">{label}</label>
                <input
                  type={type}
                  value={form[key]}
                  onChange={set(key)}
                  placeholder={placeholder}
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  required
                />
              </div>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all hover:opacity-90 flex items-center justify-center gap-2 mt-2"
              style={{ background: 'var(--blue)', color: '#fff' }}
            >
              {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Create Account →'}
            </button>
          </form>

          <p className="text-center text-sm mt-6" style={{ color: 'var(--text-secondary)' }}>
            Already have an account?{' '}
            <Link href="/login" className="font-semibold" style={{ color: 'var(--blue)' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
