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
      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-navy" />
        <div className="absolute inset-0 bg-gradient-radial from-navy-700/30 via-transparent to-transparent" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(30,68,128,0.4) 0%, transparent 70%)' }} />
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage: 'linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-24 sm:py-32 text-center">
          {/* Hebrew headline */}
          <div className="animate-fade-in mb-6">
            <span
              className="text-6xl sm:text-8xl text-gold-400 block mb-4 animate-glow"
              style={{ fontFamily: 'serif', direction: 'rtl', lineHeight: 1.2 }}
            >
              משנה יומי
            </span>
            <div className="ornament-divider max-w-xs mx-auto">
              <span className="text-gold-600 text-lg">✦</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-serif text-parchment-50 mb-4 animate-slide-up">
            Daily Mishnah Learning with<br />
            <span className="gradient-text-gold">R&apos; Shloimie Friedman</span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto mb-3 leading-relaxed animate-slide-up">
            Follow the official Mishna Yomit calendar. Two Mishnayot every day.
            Listen, track your progress, and complete the entire Mishnah.
          </p>

          {/* Today's learning pill */}
          <div className="inline-flex items-center gap-2 bg-gold-900/30 border border-gold-700/50 rounded-full px-4 py-2 mb-10 text-sm">
            <span className="text-gold-500">📖</span>
            <span className="text-gold-300 font-medium">Today: {today.label}</span>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
            <Link
              href="/learn"
              className="btn-gold px-8 py-4 text-base rounded-xl shadow-gold-lg w-full sm:w-auto text-center"
            >
              Start Learning Today →
            </Link>
            <Link
              href="/learn#resume"
              className="btn-ghost px-8 py-4 text-base rounded-xl w-full sm:w-auto text-center"
            >
              Continue Where You Left Off
            </Link>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-center gap-2 mt-8 text-slate-500 text-sm">
            <span className="text-gold-600">{TOTAL_MISHNAYOT.toLocaleString()} Mishnayot</span>
            <span>·</span>
            <span>{totalTractates} Tractates</span>
            <span>·</span>
            <span>{totalSedarim} Sedarim</span>
          </div>
        </div>
      </section>

      {/* Today's Lesson Card */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 -mt-6 relative z-10">
        <div className="bg-navy-800 border border-gold-700/40 rounded-2xl p-6 sm:p-8 shadow-navy">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <p className="text-xs text-gold-500 uppercase tracking-widest mb-1">Today • Day {today.dayNumber}</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-gold-300 mb-1">{today.label}</h2>
              <p className="text-slate-400 text-sm">{today.dateLabel}</p>
            </div>
            <Link
              href="/learn"
              className="btn-gold px-6 py-3 rounded-xl flex-shrink-0 text-sm"
            >
              ▶ Listen Now
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-serif text-parchment-50 mb-3">
            Everything you need to complete the Mishnah
          </h2>
          <p className="text-slate-500 max-w-xl mx-auto">
            A thoughtfully designed learning platform built around the Mishna Yomit program.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              icon: '🎧',
              title: 'Listen',
              desc: 'Beautiful audio player with position memory, speed control, and skip buttons. Picks up right where you left off.',
              href: '/learn',
            },
            {
              icon: '📊',
              title: 'Track',
              desc: 'Visual progress breakdown by Seder and Tractate. See exactly how far you\'ve come through each of the 63 tractates.',
              href: '/progress',
            },
            {
              icon: '📅',
              title: 'Follow',
              desc: 'Stay synchronized with the official Mishna Yomit calendar. Always know what today\'s 2 Mishnayot are.',
              href: '/calendar',
            },
            {
              icon: '✉️',
              title: 'Daily Email',
              desc: 'Get a beautiful daily reminder at your preferred time with today\'s lesson and a direct listen link.',
              href: '#subscribe',
            },
          ].map(f => (
            <Link key={f.title} href={f.href} className="group card p-6 hover:border-gold-700/40 transition-all hover:shadow-gold">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-lg font-semibold text-parchment-50 mb-2 group-hover:text-gold-300 transition-colors">{f.title}</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{f.desc}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Progress Preview */}
      <section className="bg-navy-900 border-y border-navy-700 py-16">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-serif text-parchment-50 mb-2">Six Sedarim. 63 Tractates. One journey.</h2>
            <p className="text-slate-500 text-sm">From Zeraim to Taharot — every mishna in order.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SEDARIM.map((seder, i) => {
              const colors = ['from-gold-900 to-gold-800', 'from-blue-900 to-blue-800', 'from-purple-900 to-purple-800', 'from-green-900 to-green-800', 'from-red-900 to-red-800', 'from-cyan-900 to-cyan-800'];
              const textColors = ['text-gold-300', 'text-blue-300', 'text-purple-300', 'text-green-300', 'text-red-300', 'text-cyan-300'];
              return (
                <div key={seder.name} className={`bg-gradient-to-b ${colors[i]} border border-white/5 rounded-xl p-4 text-center`}>
                  <span className={`text-lg font-bold ${textColors[i]} block mb-1`}>{seder.name}</span>
                  <span className="text-xs text-white/40 block mb-2">{seder.tractates.length} tractates</span>
                  <span className={`text-sm font-mono ${textColors[i]}`}>{seder.totalMishnayot.toLocaleString()}</span>
                  <span className="text-xs text-white/30 block">mishnayot</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Subscribe section */}
      <section id="subscribe" className="max-w-3xl mx-auto px-4 sm:px-6 py-20">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-3xl font-serif text-parchment-50 mb-3">
            Get your daily reminder
          </h2>
          <p className="text-slate-400 text-sm">
            Enter your email and choose a time — we&apos;ll send you today&apos;s 2 Mishnayot with a direct listen link.
          </p>
        </div>

        <SubscribeForm />
      </section>

      {/* Quote */}
      <section className="py-12 text-center border-t border-navy-800">
        <div className="max-w-2xl mx-auto px-4">
          <p
            className="text-2xl text-gold-400 mb-3"
            style={{ fontFamily: 'serif', direction: 'rtl' }}
          >
            &quot;כָּל יִשְׂרָאֵל יֵשׁ לָהֶם חֵלֶק לָעוֹלָם הַבָּא&quot;
          </p>
          <p className="text-slate-500 text-sm">All of Israel has a share in the World to Come — Sanhedrin 10:1</p>
        </div>
      </section>
    </div>
  );
}

