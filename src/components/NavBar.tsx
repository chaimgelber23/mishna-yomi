'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const NAV_LINKS = [
  { href: '/learn', label: 'Learn' },
  { href: '/cycles', label: 'My Cycle' },
  { href: '/browse', label: 'Browse' },
  { href: '/progress', label: 'Progress' },
  { href: '/calendar', label: 'Calendar' },
];

export default function NavBar() {
  const [scrolled, setScrolled]   = useState(false);
  const [signedIn, setSignedIn]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createClient } = require('@/lib/supabase/client');
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }: { data: { session: unknown } }) => {
      setSignedIn(!!session);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: unknown) => setSignedIn(!!session)
    );
    return () => subscription.unsubscribe();
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="fixed top-0 w-full z-50 border-b transition-all duration-300"
      style={{
        background: scrolled || menuOpen ? 'rgba(251,246,236,0.97)' : 'rgba(251,246,236,0.62)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: scrolled ? 'var(--border)' : 'rgba(160,120,64,0.18)',
        boxShadow: scrolled ? '0 1px 24px rgba(34,26,16,0.07)' : 'none',
      }}>
      <div className="w-full px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">

          {/* Logo — flush left */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105 sefer-frame"
              style={{ background: 'linear-gradient(135deg, var(--ink-grad-a), var(--ink-grad-b))' }}>
              <span className="text-lg" style={{ fontFamily: 'var(--font-frank)', color: 'var(--brass-light)', lineHeight: 1 }}>מ</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-base leading-none block" style={{ fontFamily: 'var(--font-frank)', color: 'var(--ink)' }}>
                Mishna Yomi
              </span>
              <span className="text-[10px] tracking-[0.18em] uppercase leading-none mt-1 block" style={{ color: 'var(--brass-deep)' }}>
                Daily Learning
              </span>
            </div>
          </Link>

          {/* All right-side items together */}
          <div className="flex items-center gap-1">
            <div className="hidden md:flex items-center gap-0.5 mr-3">
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href}
                  className="px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 cursor-pointer"
                  style={{ color: 'var(--muted)' }}
                  onMouseOver={e => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.background = 'rgba(160,120,64,0.08)'; }}
                  onMouseOut={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent'; }}>
                  {label}
                </Link>
              ))}
            </div>
            <Link href={signedIn ? '/settings' : '/auth/login'}
              className="hidden sm:block text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer"
              style={{ color: 'var(--muted)' }}
              onMouseOver={e => { e.currentTarget.style.color = 'var(--ink)'; }}
              onMouseOut={e => { e.currentTarget.style.color = 'var(--muted)'; }}>
              {signedIn ? 'Settings' : 'Sign In'}
            </Link>
            <Link href="/learn"
              className="btn-primary ml-1 hidden sm:inline-block"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}>
              Start Learning
            </Link>

            {/* Mobile menu toggle */}
            <button
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg transition-colors cursor-pointer"
              style={{ color: 'var(--navy)' }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen
                  ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h16" />}
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="md:hidden overflow-hidden border-t"
            style={{ borderColor: 'var(--border)' }}>
            <div className="px-6 py-4 flex flex-col gap-1">
              {NAV_LINKS.map(({ href, label }) => (
                <Link key={href} href={href} onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 text-sm font-medium rounded-lg"
                  style={{ color: 'var(--fg)' }}>
                  {label}
                </Link>
              ))}
              <Link href={signedIn ? '/settings' : '/auth/login'} onClick={() => setMenuOpen(false)}
                className="px-4 py-3 text-sm font-medium rounded-lg"
                style={{ color: 'var(--fg)' }}>
                {signedIn ? 'Settings' : 'Sign In'}
              </Link>
              <Link href="/learn" onClick={() => setMenuOpen(false)}
                className="btn-primary text-center mt-2"
                style={{ fontSize: '0.875rem', padding: '0.75rem 1.25rem' }}>
                Start Learning
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
