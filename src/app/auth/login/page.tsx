'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  function getSupabase() {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@/lib/supabase/client');
    return createClient();
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const { error } = await getSupabase().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-navy-950">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <span className="font-hebrew text-5xl text-gold-400 block mb-2" style={{ fontFamily: 'serif', direction: 'rtl' }}>
              משנה יומי
            </span>
            <span className="text-slate-400 text-sm tracking-widest uppercase">Mishna Yomi Daily</span>
          </Link>
        </div>

        <div className="bg-navy-800 border border-navy-600 rounded-2xl p-8 shadow-navy">
          {!sent ? (
            <>
              <h1 className="text-2xl font-serif text-parchment-50 mb-2 text-center">Sign In</h1>
              <p className="text-slate-400 text-sm text-center mb-8">
                Enter your email and we'll send you a magic link — no password needed.
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm text-slate-400 mb-2">
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full bg-navy-900 border border-navy-600 rounded-lg px-4 py-3 text-parchment-100 placeholder-slate-600 focus:outline-none focus:border-gold-500 focus:ring-1 focus:ring-gold-500 transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-4 py-3">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || !email}
                  className="w-full bg-gradient-to-r from-gold-700 to-gold-500 text-navy-950 font-bold py-3 rounded-lg text-base hover:from-gold-600 hover:to-gold-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? 'Sending...' : 'Send Magic Link →'}
                </button>
              </form>

              <p className="text-center text-slate-500 text-xs mt-6">
                Signing in lets you track your progress and sync across devices.
              </p>
            </>
          ) : (
            <div className="text-center py-4">
              <div className="text-5xl mb-4">📬</div>
              <h2 className="text-xl font-serif text-parchment-50 mb-3">Check your inbox</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                We sent a magic link to <span className="text-gold-400">{email}</span>.<br />
                Click it to sign in — the link expires in 1 hour.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(''); }}
                className="mt-6 text-slate-500 text-sm hover:text-slate-300 underline"
              >
                Use a different email
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          <Link href="/" className="hover:text-slate-400 transition-colors">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
