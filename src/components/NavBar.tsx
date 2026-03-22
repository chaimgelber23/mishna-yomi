'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';

const NAV_LINKS = [
  { href: '/learn', label: 'Learn' },
  { href: '/browse', label: 'Browse' },
  { href: '/progress', label: 'Progress' },
  { href: '/calendar', label: 'Calendar' },
];

export default function NavBar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}
      className="fixed top-0 w-full z-50 border-b transition-all duration-300"
      style={{
        background: scrolled ? 'rgba(250,250,248,0.92)' : 'rgba(250,250,248,0.6)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderColor: scrolled ? 'var(--border)' : 'rgba(201,169,110,0.15)',
        boxShadow: scrolled ? '0 1px 24px rgba(30,58,95,0.07)' : 'none',
      }}>
      <div className="w-full px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">

          {/* Logo — flush left */}
          <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-105"
              style={{ background: 'linear-gradient(135deg, var(--navy), #2d5a8e)' }}>
              <span className="text-white text-lg font-bold" style={{ fontFamily: 'var(--font-hebrew)' }}>מ</span>
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-base leading-none block" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--navy)' }}>
                Mishna Yomi
              </span>
              <span className="text-[10px] tracking-[0.15em] uppercase leading-none mt-0.5 block" style={{ color: 'var(--gold)' }}>
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
                  onMouseOver={e => { e.currentTarget.style.color = 'var(--navy)'; e.currentTarget.style.background = 'rgba(30,58,95,0.06)'; }}
                  onMouseOut={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.background = 'transparent'; }}>
                  {label}
                </Link>
              ))}
            </div>
            <Link href="/auth/login"
              className="hidden sm:block text-sm font-medium px-4 py-2 rounded-lg transition-all duration-200 cursor-pointer"
              style={{ color: 'var(--muted)' }}
              onMouseOver={e => { e.currentTarget.style.color = 'var(--navy)'; }}
              onMouseOut={e => { e.currentTarget.style.color = 'var(--muted)'; }}>
              Sign In
            </Link>
            <Link href="/learn"
              className="btn-primary ml-1"
              style={{ fontSize: '0.875rem', padding: '0.5rem 1.25rem' }}>
              Start Learning
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}
