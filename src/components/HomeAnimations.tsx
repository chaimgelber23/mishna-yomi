'use client';

import Link from 'next/link';
import { FadeIn, StaggerChildren, StaggerItem, MagneticButton } from './animations';
import SubscribeForm from './SubscribeForm';
import HeroSection from './HeroSection';
import { Ornament } from './Ornament';
import type { SederInfo } from '@/lib/mishna-data';

interface HomeAnimationsProps {
  today: { dayNumber: number; label: string; dateLabel: string };
  totalMishnayot: number;
  totalTractates: number;
  totalSedarim: number;
  sedarim: SederInfo[];
}

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    ),
    title: 'Daily Audio', desc: 'High-quality shiurim with smart position memory, variable speed, and skip controls.', href: '/learn',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Track Progress', desc: 'Visual breakdown by Seder and Tractate. See exactly how far you\'ve come across all 63 tractates.', href: '/progress',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
    title: 'Your Own Cycle', desc: 'Start from any tractate, set your pace, or pick your siyum date — we\'ll build your daily schedule.', href: '/cycles',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Daily Email', desc: 'Your daily lesson delivered to your inbox with a one-click listen link.', href: '#subscribe',
  },
];

/* Six sedarim — muted earth tones that sit on parchment like ink stamps */
const SEDER_PALETTES = [
  { bg: 'rgba(160,120,64,0.09)',  border: 'rgba(160,120,64,0.28)', text: '#856230', accent: '#A07840' }, // brass
  { bg: 'rgba(74,58,36,0.07)',    border: 'rgba(74,58,36,0.20)',   text: '#4A3A24', accent: '#3D2E1A' }, // espresso
  { bg: 'rgba(107,76,42,0.07)',   border: 'rgba(107,76,42,0.18)',  text: '#6B4C2A', accent: '#8A5A2B' }, // umber
  { bg: 'rgba(74,86,52,0.07)',    border: 'rgba(74,86,52,0.18)',   text: '#4A5634', accent: '#5E6B3A' }, // olive
  { bg: 'rgba(122,52,46,0.07)',   border: 'rgba(122,52,46,0.18)',  text: '#7A342E', accent: '#94413A' }, // terracotta
  { bg: 'rgba(61,73,84,0.07)',    border: 'rgba(61,73,84,0.18)',   text: '#3D4954', accent: '#516170' }, // slate
];

export default function HomeAnimations({ today, totalMishnayot: _totalMishnayot, totalTractates: _totalTractates, totalSedarim: _totalSedarim, sedarim }: HomeAnimationsProps) {
  return (
    <>
      <HeroSection />

      {/* ── TODAY'S LESSON ── */}
      <section style={{ background: 'var(--bg)' }} className="py-20">
        <div className="px-6 lg:px-10" style={{ maxWidth: '1152px', margin: '0 auto' }}>
          <FadeIn direction="up" delay={0}>
            <div className="card-gold p-8 sm:p-10">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--gold)' }}>
                    Today&apos;s Lesson · Day {today.dayNumber}
                  </p>
                  <h2 className="text-3xl sm:text-4xl font-bold mb-2" style={{ color: 'var(--fg)', fontFamily: 'var(--font-playfair)' }}>
                    {today.label}
                  </h2>
                  <p className="text-sm" style={{ color: 'var(--muted)' }}>{today.dateLabel}</p>
                </div>
                <MagneticButton>
                  <Link href="/learn" className="btn-primary flex-shrink-0"
                    style={{ fontSize: '0.9375rem', padding: '0.75rem 1.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Listen Now
                  </Link>
                </MagneticButton>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20" style={{ background: 'var(--surface)' }}>
        <div className="px-6 lg:px-10" style={{ maxWidth: '1152px', margin: '0 auto' }}>
          <FadeIn direction="up" delay={0}>
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--gold)' }}>
                Built for daily learners
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                Everything you need to complete the Mishnah
              </h2>
              <p style={{ color: 'var(--muted)', maxWidth: '480px', margin: '0 auto' }}>
                Built around the official Mishna Yomit calendar.
              </p>
            </div>
          </FadeIn>

          <StaggerChildren staggerDelay={0.1} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map(f => (
              <StaggerItem key={f.title}>
                <Link href={f.href}
                  className="card group p-7 h-full flex flex-col hover:shadow-lg transition-all duration-300 cursor-pointer"
                  style={{ borderColor: 'var(--border)' }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                    style={{ background: 'rgba(160,120,64,0.10)', color: 'var(--brass-deep)', border: '1px solid rgba(160,120,64,0.2)' }}>
                    {f.icon}
                  </div>
                  <h3 className="font-bold mb-2 text-base" style={{ color: 'var(--fg)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>{f.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--brass-deep)' }}>
                    <span>Explore</span>
                    <svg className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      {/* ── SIX SEDARIM ── */}
      <section className="py-20" style={{ background: 'var(--bg)' }}>
        <div className="px-6 lg:px-10" style={{ maxWidth: '1152px', margin: '0 auto' }}>
          <FadeIn direction="up" delay={0}>
            <div className="text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--gold)' }}>
                Complete Mishnah
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                Six Sedarim. 63 Tractates. One journey.
              </h2>
              <p style={{ color: 'var(--muted)' }}>From Zeraim to Taharot — every mishna in order.</p>
            </div>
          </FadeIn>

          <StaggerChildren staggerDelay={0.07} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {sedarim.map((seder, i) => {
              const p = SEDER_PALETTES[i];
              return (
                <StaggerItem key={seder.name}>
                  <Link href={`/browse?seder=${encodeURIComponent(seder.name)}`}
                    className="block rounded-2xl p-5 text-center border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
                    style={{ background: p.bg, borderColor: p.border }}>
                    <span className="font-bold block mb-1.5 text-sm" style={{ color: p.text }}>{seder.name}</span>
                    <span className="text-xs block mb-3" style={{ color: 'var(--muted)' }}>{seder.tractates.length} tractates</span>
                    <div className="h-px my-2" style={{ background: p.border }} />
                    <span className="text-lg font-bold block mt-2" style={{ color: p.accent }}>{seder.totalMishnayot.toLocaleString()}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>mishnayot</span>
                  </Link>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        </div>
      </section>

      {/* ── SUBSCRIBE ── */}
      <section id="subscribe" className="py-20" style={{ background: 'var(--surface)' }}>
        <FadeIn direction="up" delay={0}>
          <div className="px-6 lg:px-10 text-center" style={{ maxWidth: '640px', margin: '0 auto' }}>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--gold)' }}>
              Daily Reminder
            </p>
            <h2 className="text-3xl sm:text-4xl font-bold mb-4" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
              Never miss a day
            </h2>
            <p className="mb-10 leading-relaxed" style={{ color: 'var(--muted)', fontSize: '1.0625rem' }}>
              Enter your email — we&apos;ll send today&apos;s 2 Mishnayot with a direct listen link every morning.
            </p>
            <SubscribeForm />
          </div>
        </FadeIn>
      </section>

      {/* ── QUOTE ── */}
      <section className="py-20 border-t" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <FadeIn direction="up" delay={0}>
          <div className="px-6 text-center" style={{ maxWidth: '600px', margin: '0 auto' }}>

            {/* Brass ornament */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, var(--brass))' }} />
              <Ornament size={16} />
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--brass), transparent)' }} />
            </div>

            <p className="text-2xl sm:text-3xl mb-5 leading-relaxed"
              style={{ fontFamily: 'var(--font-hebrew)', direction: 'rtl', color: 'var(--ink)', fontWeight: 700 }}>
              &ldquo;כָּל יִשְׂרָאֵל יֵשׁ לָהֶם חֵלֶק לָעוֹלָם הַבָּא&rdquo;
            </p>
            <p className="text-sm mb-8" style={{ color: 'var(--muted)' }}>
              All of Israel has a share in the World to Come — Sanhedrin 10:1
            </p>

            {/* Dedication */}
            <div className="flex items-center justify-center gap-3 mt-2">
              <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, transparent, rgba(201,169,110,0.4))' }} />
              <p className="text-xs italic" style={{ color: 'var(--gold-dark)' }}>
                L&apos;ilui Nishmas Etta Ahuva bas Yaakov
              </p>
              <div className="h-px w-12" style={{ background: 'linear-gradient(90deg, rgba(201,169,110,0.4), transparent)' }} />
            </div>
          </div>
        </FadeIn>
      </section>
    </>
  );
}
