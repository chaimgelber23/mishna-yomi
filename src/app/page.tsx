import Link from 'next/link';
import { getTodaySummary } from '@/lib/calendar';
import { TOTAL_MISHNAYOT, MISHNA_STRUCTURE, SEDARIM } from '@/lib/mishna-data';
import SubscribeForm from '@/components/SubscribeForm';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function HomePage() {
  const today = getTodaySummary();
  const totalTractates = MISHNA_STRUCTURE.length;
  const totalSedarim = SEDARIM.length;

  return (
    <div className="min-h-screen">

      {/* ── HERO ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[90vh] flex items-center">

        {/* Deep background layers */}
        <div className="absolute inset-0 bg-[#020810]" />

        {/* Stars */}
        <div className="absolute inset-0 stars-bg opacity-60" />

        {/* Deep radial glow - gold center */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse 80% 60% at 50% 40%, rgba(180,100,10,0.12) 0%, rgba(30,68,128,0.15) 40%, transparent 70%)',
          }}
        />

        {/* Horizon glow */}
        <div
          className="absolute bottom-0 left-0 right-0 h-64"
          style={{
            background: 'linear-gradient(to top, rgba(4,13,26,1) 0%, transparent 100%)',
          }}
        />

        {/* Large decorative Hebrew letter watermark */}
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none pointer-events-none"
          style={{
            fontFamily: 'serif',
            fontSize: 'clamp(300px, 50vw, 600px)',
            color: 'rgba(245,158,11,0.03)',
            lineHeight: 1,
            direction: 'rtl',
            fontWeight: 700,
          }}
        >
          מ
        </div>

        {/* Content */}
        <div className="relative w-full max-w-5xl mx-auto px-4 sm:px-6 py-24 text-center">

          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-gold-900/20 border border-gold-700/30 rounded-full px-4 py-1.5 mb-10 text-xs text-gold-400 tracking-wider uppercase font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
            Daily Mishna Yomit Program
          </div>

          {/* Hebrew title */}
          <div className="mb-8">
            <h1
              className="text-glow-gold block mb-3"
              style={{
                fontFamily: 'serif',
                direction: 'rtl',
                fontSize: 'clamp(64px, 12vw, 120px)',
                lineHeight: 1.1,
                color: '#fbbf24',
              }}
            >
              משנה יומי
            </h1>
            <div className="ornament-divider max-w-sm mx-auto mb-4">
              <span className="text-gold-600 text-xs tracking-widest">✦ ✦ ✦</span>
            </div>
            <p className="text-xl sm:text-2xl font-serif text-parchment-100 mb-3">
              Daily Mishnah with{' '}
              <span className="gradient-text-gold">R&apos; Shloimie Friedman</span>
            </p>
            <p className="text-slate-500 text-base max-w-xl mx-auto leading-relaxed">
              Two Mishnayot every day. Follow the official calendar,
              listen to the podcast, and complete the entire Mishnah.
            </p>
          </div>

          {/* Today chip */}
          <div className="inline-flex items-center gap-3 bg-navy-800/80 border border-gold-700/30 rounded-2xl px-6 py-3 mb-10 backdrop-blur-sm">
            <div className="w-8 h-8 rounded-lg bg-gold-900/40 border border-gold-700/30 flex items-center justify-center">
              <svg className="w-4 h-4 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-xs text-slate-500 uppercase tracking-wider">Today · Day {today.dayNumber}</p>
              <p className="text-gold-300 font-semibold text-sm">{today.label}</p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/learn"
              className="btn-gold px-8 py-3.5 text-sm rounded-xl shadow-gold w-full sm:w-auto text-center font-semibold"
            >
              Start Learning Today
            </Link>
            <Link
              href="/browse"
              className="btn-ghost px-8 py-3.5 text-sm rounded-xl w-full sm:w-auto text-center"
            >
              Browse All Tractates
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-6 mt-12 text-xs text-slate-600">
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-gold-700" />
              {TOTAL_MISHNAYOT.toLocaleString()} Mishnayot
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              {totalTractates} Tractates
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-slate-700" />
              {totalSedarim} Sedarim
            </span>
          </div>
        </div>
      </section>

      {/* ── TODAY'S CARD ──────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-8 relative z-10 mb-24">
        <div
          className="rounded-2xl p-6 sm:p-8 border border-gold-700/25"
          style={{
            background: 'linear-gradient(135deg, rgba(12,26,53,0.95) 0%, rgba(7,15,31,0.98) 100%)',
            boxShadow: '0 0 60px rgba(180,83,9,0.12), 0 4px 40px rgba(0,0,0,0.6)',
          }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <p className="text-xs text-gold-600 uppercase tracking-widest mb-2 font-medium">Today&apos;s Lesson</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-gold-300 mb-1">{today.label}</h2>
              <p className="text-slate-500 text-sm">{today.dateLabel} &nbsp;·&nbsp; Day {today.dayNumber}</p>
            </div>
            <Link
              href="/learn"
              className="btn-gold px-7 py-3.5 rounded-xl flex-shrink-0 text-sm font-semibold flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
              Listen Now
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ──────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-4 mb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-serif text-parchment-50 mb-3">
            Everything you need to complete the Mishnah
          </h2>
          <p className="text-slate-600 max-w-lg mx-auto text-sm">
            A thoughtfully designed learning platform built around the Mishna Yomit calendar.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              ),
              title: 'Listen',
              desc: 'Beautiful audio player with position memory, speed control, and skip buttons.',
              href: '/learn',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              ),
              title: 'Track Progress',
              desc: 'Visual breakdown by Seder and Tractate. See how far you\'ve come through 63 tractates.',
              href: '/progress',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              ),
              title: 'Follow Calendar',
              desc: 'Stay synchronized with the official Mishna Yomit schedule. Always know today\'s 2 Mishnayot.',
              href: '/calendar',
            },
            {
              icon: (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              ),
              title: 'Daily Email',
              desc: 'A beautiful daily reminder with today\'s lesson and a direct listen link.',
              href: '#subscribe',
            },
          ].map(f => (
            <Link
              key={f.title}
              href={f.href}
              className="group relative p-6 rounded-2xl border border-white/5 bg-navy-800/50 hover:border-gold-700/30 hover:bg-navy-800 transition-all cursor-pointer overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-gold-900/0 to-gold-900/0 group-hover:from-gold-900/10 group-hover:to-transparent transition-all" />
              <div className="relative">
                <div className="w-11 h-11 rounded-xl bg-navy-700 border border-white/5 flex items-center justify-center text-gold-500 mb-4 group-hover:border-gold-700/30 group-hover:bg-gold-900/20 transition-all">
                  {f.icon}
                </div>
                <h3 className="text-base font-semibold text-parchment-100 mb-2 group-hover:text-gold-300 transition-colors">{f.title}</h3>
                <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── SIX SEDARIM ───────────────────────────────────────── */}
      <section className="border-y border-white/5 py-20 mb-24" style={{ background: 'rgba(7,15,31,0.8)' }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-serif text-parchment-100 mb-2">Six Sedarim. 63 Tractates. One journey.</h2>
            <p className="text-slate-600 text-sm">From Zeraim to Taharot — every mishna in order.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SEDARIM.map((seder, i) => {
              const configs = [
                { border: 'border-gold-800/30', text: 'text-gold-400', glow: 'rgba(180,83,9,0.08)' },
                { border: 'border-blue-800/30', text: 'text-blue-400', glow: 'rgba(30,64,175,0.08)' },
                { border: 'border-purple-800/30', text: 'text-purple-400', glow: 'rgba(88,28,135,0.08)' },
                { border: 'border-emerald-800/30', text: 'text-emerald-400', glow: 'rgba(6,78,59,0.08)' },
                { border: 'border-rose-800/30', text: 'text-rose-400', glow: 'rgba(136,19,55,0.08)' },
                { border: 'border-cyan-800/30', text: 'text-cyan-400', glow: 'rgba(21,94,117,0.08)' },
              ];
              const c = configs[i];
              return (
                <div
                  key={seder.name}
                  className={`rounded-xl p-4 text-center border ${c.border} transition-all hover:scale-105 cursor-default`}
                  style={{ background: `linear-gradient(135deg, ${c.glow}, rgba(12,26,53,0.6))` }}
                >
                  <span className={`text-base font-bold ${c.text} block mb-1`}>{seder.name}</span>
                  <span className="text-xs text-white/30 block mb-2">{seder.tractates.length} tractates</span>
                  <span className={`text-sm font-mono font-bold ${c.text}`}>{seder.totalMishnayot.toLocaleString()}</span>
                  <span className="text-[10px] text-white/25 block">mishnayot</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SUBSCRIBE ─────────────────────────────────────────── */}
      <section id="subscribe" className="max-w-2xl mx-auto px-4 sm:px-6 py-4 mb-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-serif text-parchment-100 mb-3">
            Get your daily reminder
          </h2>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Enter your email and choose a time — we&apos;ll send you today&apos;s 2 Mishnayot with a direct listen link.
          </p>
        </div>
        <SubscribeForm />
      </section>

      {/* ── QUOTE ─────────────────────────────────────────────── */}
      <section className="py-16 text-center border-t border-white/5">
        <div className="max-w-xl mx-auto px-4">
          <p
            className="text-2xl sm:text-3xl text-gold-400 mb-4 leading-relaxed"
            style={{ fontFamily: 'serif', direction: 'rtl' }}
          >
            &ldquo;כָּל יִשְׂרָאֵל יֵשׁ לָהֶם חֵלֶק לָעוֹלָם הַבָּא&rdquo;
          </p>
          <p className="text-slate-600 text-sm">All of Israel has a share in the World to Come — Sanhedrin 10:1</p>
        </div>
      </section>

    </div>
  );
}
