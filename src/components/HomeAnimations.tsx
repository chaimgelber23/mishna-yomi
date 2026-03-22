'use client';

import Link from 'next/link';
import { FadeIn, StaggerChildren, StaggerItem, MagneticButton } from './animations';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import SubscribeForm from './SubscribeForm';
import HeroSection from './HeroSection';
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
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Official Calendar', desc: 'Stay on the Mishna Yomit schedule. Always know today\'s 2 Mishnayot at a glance.', href: '/calendar',
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

const SEDER_PALETTES = [
  { bg: 'rgba(201,169,110,0.08)', border: 'rgba(201,169,110,0.25)', text: '#7A5C1E', accent: '#C9A96E' },
  { bg: 'rgba(30,58,95,0.06)', border: 'rgba(30,58,95,0.18)', text: '#1e3a5f', accent: '#2d5a8e' },
  { bg: 'rgba(90,60,120,0.06)', border: 'rgba(90,60,120,0.15)', text: '#5B21B6', accent: '#7C3AED' },
  { bg: 'rgba(6,95,70,0.06)', border: 'rgba(6,95,70,0.15)', text: '#065F46', accent: '#059669' },
  { bg: 'rgba(159,18,57,0.06)', border: 'rgba(159,18,57,0.15)', text: '#9F1239', accent: '#E11D48' },
  { bg: 'rgba(21,94,117,0.06)', border: 'rgba(21,94,117,0.15)', text: '#155E75', accent: '#0891B2' },
];

export default function HomeAnimations({ today, totalMishnayot, totalTractates, totalSedarim, sedarim }: HomeAnimationsProps) {
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
      <section className="py-20" style={{ background: '#fff' }}>
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
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-5 transition-all duration-300 group-hover:scale-110"
                    style={{ background: 'rgba(30,58,95,0.07)', color: 'var(--navy)' }}>
                    {f.icon}
                  </div>
                  <h3 className="font-bold mb-2 text-base" style={{ color: 'var(--fg)' }}>{f.title}</h3>
                  <p className="text-sm leading-relaxed flex-1" style={{ color: 'var(--muted)', lineHeight: 1.65 }}>{f.desc}</p>
                  <div className="mt-4 flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--navy)' }}>
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
                  <div className="rounded-2xl p-5 text-center border transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 cursor-default"
                    style={{ background: p.bg, borderColor: p.border }}>
                    <span className="font-bold block mb-1.5 text-sm" style={{ color: p.text }}>{seder.name}</span>
                    <span className="text-xs block mb-3" style={{ color: 'var(--muted)' }}>{seder.tractates.length} tractates</span>
                    <div className="h-px my-2" style={{ background: p.border }} />
                    <span className="text-lg font-bold block mt-2" style={{ color: p.accent }}>{seder.totalMishnayot.toLocaleString()}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>mishnayot</span>
                  </div>
                </StaggerItem>
              );
            })}
          </StaggerChildren>
        </div>
      </section>

      {/* ── SUBSCRIBE ── */}
      <section id="subscribe" className="py-20" style={{ background: '#fff' }}>
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

            {/* Gold ornament */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, transparent, var(--gold))' }} />
              <span style={{ color: 'var(--gold)', fontSize: '18px' }}>✦</span>
              <div className="h-px flex-1" style={{ background: 'linear-gradient(90deg, var(--gold), transparent)' }} />
            </div>

            <p className="text-2xl sm:text-3xl mb-5 leading-relaxed"
              style={{ fontFamily: 'var(--font-hebrew)', direction: 'rtl', color: 'var(--navy)', fontWeight: 600 }}>
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
