'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type Status = 'working' | 'done' | 'error' | 'missing';

function UnsubscribeInner() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<Status>('working');

  useEffect(() => {
    if (!token) {
      setStatus('missing');
      return;
    }
    fetch(`/api/subscribe?token=${encodeURIComponent(token)}`, { method: 'DELETE' })
      .then(res => setStatus(res.ok ? 'done' : 'error'))
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-20"
      style={{ background: 'linear-gradient(160deg, #FBF6EC 0%, #F4EAD6 50%, #EADBBE 100%)' }}
    >
      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex flex-col items-center gap-2 group">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1 transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--navy), #3D2E1A)', boxShadow: '0 8px 24px rgba(34,26,16,0.25)' }}
            >
              <span className="text-white text-2xl font-bold" style={{ fontFamily: 'var(--font-hebrew)' }}>מ</span>
            </div>
            <span className="font-bold text-xl" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--navy)' }}>
              Mishna Yomi
            </span>
          </Link>
        </div>

        <div
          className="rounded-2xl p-8 border text-center"
          style={{ background: 'rgba(255,255,255,0.92)', borderColor: 'var(--border)', boxShadow: '0 8px 40px rgba(34,26,16,0.08), 0 1px 2px rgba(0,0,0,0.04)' }}
        >
          {status === 'working' && (
            <>
              <h1 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                One moment…
              </h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Updating your email preferences.
              </p>
            </>
          )}

          {status === 'done' && (
            <>
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
                style={{ background: 'rgba(201,169,110,0.12)', border: '2px solid rgba(201,169,110,0.3)' }}
              >
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold-dark)' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                You&apos;ve been unsubscribed
              </h1>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted)' }}>
                You won&apos;t receive any more daily reminders. Changed your mind? You can re-subscribe
                from the home page at any time.
              </p>
              <Link
                href="/"
                className="inline-block py-3 px-6 rounded-full font-bold text-white text-sm transition-all"
                style={{ background: 'linear-gradient(135deg, var(--navy), #3D2E1A)', boxShadow: '0 4px 16px rgba(34,26,16,0.3)' }}
              >
                Back to home
              </Link>
            </>
          )}

          {(status === 'error' || status === 'missing') && (
            <>
              <h1 className="text-xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                {status === 'missing' ? 'Missing unsubscribe link' : 'Something went wrong'}
              </h1>
              <p className="text-sm leading-relaxed mb-6" style={{ color: 'var(--muted)' }}>
                {status === 'missing'
                  ? 'This page needs the unsubscribe link from one of our emails. Please click the link at the bottom of any daily reminder.'
                  : 'We couldn’t process your request. Please try the link from your email again, or contact us if it keeps happening.'}
              </p>
              <Link href="/" className="text-sm font-medium" style={{ color: 'var(--navy)' }}>
                ← Back to home
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function UnsubscribePage() {
  return (
    <Suspense>
      <UnsubscribeInner />
    </Suspense>
  );
}
