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
    <div>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #FDFAF4 0%, #FEF3C7 60%, #FDE68A 100%)' }}>
        {/* Decorative gold arc */}
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }} />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #d97706 0%, transparent 70%)' }} />

        {/* Large watermark letter */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 select-none pointer-events-none hidden lg:block"
          style={{ fontFamily: 'serif', fontSize: '320px', color: 'rgba(180,83,9,0.06)', lineHeight: 1, direction: 'rtl', fontWeight: 700 }}>
          מ
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 sm:py-28">
          <div className="max-w-2xl">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-white/70 border border-gold-300 rounded-full px-4 py-1.5 mb-8 text-xs text-gold-700 font-medium tracking-wide">
              <span className="w-1.5 h-1.5 rounded-full bg-gold-500" />
              Official Mishna Yomit Program
            </div>

            {/* Hebrew headline */}
            <h1 className="font-bold mb-4 leading-none"
              style={{ fontFamily: 'serif', direction: 'rtl', fontSize: 'clamp(56px, 10vw, 96px)', color: '#92400e' }}>
              משנה יומי
            </h1>

            <div className="ornament-divider max-w-xs mb-6">
              <span className="text-gold-500 text-xs tracking-widest">✦ ✦ ✦</span>
            </div>

            <p className="text-2xl sm:text-3xl font-serif text-stone-800 mb-4 leading-snug">
              Daily Mishnah with{' '}
              <span className="gradient-text-gold">R&apos; Shloimie Friedman</span>
            </p>

            <p className="text-stone-500 text-lg mb-10 leading-relaxed max-w-lg">
              Two Mishnayot every day. Follow the official calendar, listen to the podcast, and complete the entire Mishnah.
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/learn" className="btn-gold px-8 py-3.5 rounded-xl text-base text-center">
                Start Learning Today
              </Link>
              <Link href="/browse" className="btn-ghost px-8 py-3.5 rounded-xl text-base text-center">
                Browse Tractates
              </Link>
            </div>

            <div className="flex items-center gap-5 mt-8 text-sm text-stone-400">
              <span>{TOTAL_MISHNAYOT.toLocaleString()} Mishnayot</span>
              <span className="w-1 h-1 rounded-full bg-stone-300" />
              <span>{totalTractates} Tractates</span>
              <span className="w-1 h-1 rounded-full bg-stone-300" />
              <span>{totalSedarim} Sedarim</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TODAY'S LESSON ──────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6 relative z-10 mb-20">
        <div className="card-gold p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
            <div>
              <p className="text-xs text-gold-600 uppercase tracking-widest font-semibold mb-2">Today&apos;s Lesson · Day {today.dayNumber}</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-stone-900 mb-1">{today.label}</h2>
              <p className="text-stone-400 text-sm">{today.dateLabel}</p>
            </div>
            <Link href="/learn"
              className="btn-gold px-7 py-3.5 rounded-xl flex-shrink-0 text-sm flex items-center gap-2">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              Listen Now
            </Link>
          </div>
        </div>
      </section>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 mb-24">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-3">Everything you need to complete the Mishnah</h2>
          <p className="text-stone-400 max-w-lg mx-auto">A thoughtfully designed learning platform built around the Mishna Yomit program.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>,
              title: 'Listen', desc: 'Audio player with position memory, speed control, and skip buttons.', href: '/learn',
            },
            {
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
              title: 'Track Progress', desc: 'Visual breakdown by Seder and Tractate across all 63 tractates.', href: '/progress',
            },
            {
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
              title: 'Follow Calendar', desc: 'Stay on the official Mishna Yomit schedule. Always know today\'s 2 Mishnayot.', href: '/calendar',
            },
            {
              icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
              title: 'Daily Email', desc: 'A daily reminder with today\'s lesson and a direct listen link.', href: '#subscribe',
            },
          ].map(f => (
            <Link key={f.title} href={f.href}
              className="group card p-6 hover:border-gold-300 hover:shadow-md transition-all cursor-pointer">
              <div className="w-10 h-10 rounded-xl bg-gold-50 border border-gold-200 flex items-center justify-center text-gold-600 mb-4 group-hover:bg-gold-100 transition-colors">
                {f.icon}
              </div>
              <h3 className="font-semibold text-stone-900 mb-1.5 group-hover:text-gold-700 transition-colors">{f.title}</h3>
              <p className="text-sm text-stone-400 leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* ── SIX SEDARIM ─────────────────────────────────────── */}
      <section className="border-y border-stone-200 bg-stone-50 py-20 mb-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-serif text-stone-900 mb-2">Six Sedarim. 63 Tractates. One journey.</h2>
            <p className="text-stone-400 text-sm">From Zeraim to Taharot — every mishna in order.</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SEDARIM.map((seder, i) => {
              const colors = [
                { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', sub: 'text-amber-500' },
                { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', sub: 'text-blue-500' },
                { bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', sub: 'text-purple-500' },
                { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', sub: 'text-emerald-500' },
                { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', sub: 'text-rose-500' },
                { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', sub: 'text-cyan-500' },
              ];
              const c = colors[i];
              return (
                <div key={seder.name} className={`${c.bg} border ${c.border} rounded-xl p-4 text-center hover:shadow-sm transition-all`}>
                  <span className={`font-bold ${c.text} block mb-1`}>{seder.name}</span>
                  <span className="text-xs text-stone-400 block mb-2">{seder.tractates.length} tractates</span>
                  <span className={`text-sm font-bold font-mono ${c.sub}`}>{seder.totalMishnayot.toLocaleString()}</span>
                  <span className="text-xs text-stone-400 block">mishnayot</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SUBSCRIBE ───────────────────────────────────────── */}
      <section id="subscribe" className="max-w-2xl mx-auto px-4 sm:px-6 mb-24">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 mb-3">Get your daily reminder</h2>
          <p className="text-stone-400 text-sm max-w-md mx-auto">
            Enter your email and choose a time — we&apos;ll send today&apos;s 2 Mishnayot with a direct listen link.
          </p>
        </div>
        <SubscribeForm />
      </section>

      {/* ── QUOTE ───────────────────────────────────────────── */}
      <section className="py-16 text-center border-t border-stone-200 bg-amber-50/50">
        <div className="max-w-xl mx-auto px-4">
          <p className="text-2xl sm:text-3xl text-gold-700 mb-4 leading-relaxed"
            style={{ fontFamily: 'serif', direction: 'rtl' }}>
            &ldquo;כָּל יִשְׂרָאֵל יֵשׁ לָהֶם חֵלֶק לָעוֹלָם הַבָּא&rdquo;
          </p>
          <p className="text-stone-400 text-sm">All of Israel has a share in the World to Come — Sanhedrin 10:1</p>
        </div>
      </section>

    </div>
  );
}
