'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  function getSupabase() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@/lib/supabase/client');
    return createClient();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) { setError(error.message); setLoading(false); }
    else        { setSent(true); setLoading(false); }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-20"
      style={{ background: 'linear-gradient(160deg, #FAFAF8 0%, #F5EFE3 50%, #EAE0CC 100%)' }}>

      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,169,110,0.18) 0%, transparent 65%)' }} />
        <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '500px', height: '500px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(30,58,95,0.07) 0%, transparent 65%)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.21, 0.47, 0.32, 0.98] }}
        className="relative w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1 transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--navy), #2d5a8e)', boxShadow: '0 8px 24px rgba(30,58,95,0.25)' }}>
              <span className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--font-hebrew)' }}>מ</span>
            </div>
            <span className="font-bold text-xl" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--navy)' }}>
              Mishna Yomi
            </span>
            <span className="text-xs tracking-widest uppercase" style={{ color: 'var(--gold)' }}>
              Daily Learning
            </span>
          </Link>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-8 border"
          style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'var(--border)', boxShadow: '0 8px 40px rgba(30,58,95,0.08), 0 1px 2px rgba(0,0,0,0.04)' }}>

          {!sent ? (
            <>
              <h1 className="text-2xl font-bold text-center mb-2"
                style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                Sign in
              </h1>
              <p className="text-sm text-center mb-8" style={{ color: 'var(--muted)' }}>
                Enter your email — we&apos;ll send a magic link. No password needed.
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium mb-2" style={{ color: 'var(--fg)' }}>
                    Email address
                  </label>
                  <input
                    id="email" type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    required placeholder="you@example.com"
                    className="w-full rounded-xl px-4 py-3 text-sm border transition-all outline-none"
                    style={{
                      background: 'var(--bg)', borderColor: 'var(--border)', color: 'var(--fg)',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(201,169,110,0.15)'; }}
                    onBlur={e  => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>

                {error && (
                  <div className="text-sm px-4 py-3 rounded-xl border" style={{ background: 'rgba(239,68,68,0.06)', borderColor: 'rgba(239,68,68,0.2)', color: '#DC2626' }}>
                    {error}
                  </div>
                )}

                <button type="submit" disabled={loading || !email}
                  className="w-full py-3.5 rounded-full font-bold text-white text-sm transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: loading ? 'var(--navy)' : 'linear-gradient(135deg, var(--navy), #2d5a8e)', boxShadow: '0 4px 16px rgba(30,58,95,0.3)' }}
                  onMouseOver={e => { if (!loading && email) e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseOut={e => { e.currentTarget.style.transform = 'none'; }}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Sending...
                    </span>
                  ) : 'Send Magic Link →'}
                </button>
              </form>

              <p className="text-center text-xs mt-6" style={{ color: 'var(--muted)' }}>
                Signing in lets you track your progress across devices.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              {/* Animated check */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(201,169,110,0.12)', border: '2px solid rgba(201,169,110,0.3)' }}>
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold-dark)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                </svg>
              </motion.div>
              <h2 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                Check your inbox
              </h2>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted)' }}>
                We sent a magic link to{' '}
                <span className="font-medium" style={{ color: 'var(--navy)' }}>{email}</span>
                .<br />Click it to sign in — expires in 1 hour.
              </p>
              <button onClick={() => { setSent(false); setEmail(''); }}
                className="text-sm font-medium transition-colors cursor-pointer"
                style={{ color: 'var(--muted)' }}
                onMouseOver={e => e.currentTarget.style.color = 'var(--navy)'}
                onMouseOut={e => e.currentTarget.style.color = 'var(--muted)'}>
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-xs mt-6">
          <Link href="/" className="footer-link">← Back to home</Link>
        </p>
      </motion.div>
    </div>
  );
}
