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

      {/* ── HERO ── */}
      <section className="relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #FAFAF8 0%, #F5F0E8 50%, #EDE4D0 100%)', minHeight: '88vh', display: 'flex', alignItems: 'center' }}>
        {/* Subtle radial accent */}
        <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(201,169,110,0.12) 0%, transparent 70%)', transform: 'translate(20%, -20%)' }} />

        {/* Hebrew watermark */}
        <div className="absolute right-0 bottom-0 pointer-events-none select-none hidden xl:block"
          style={{ fontFamily: 'var(--font-hebrew)', fontSize: '520px', color: 'rgba(30,58,95,0.04)', lineHeight: 1, direction: 'rtl', fontWeight: 700, transform: 'translateY(10%)' }}>
          מ
        </div>

        <div className="relative w-full px-6 lg:px-10" style={{ maxWidth: '1152px', margin: '0 auto' }}>
          <div className="max-w-2xl py-20 sm:py-28">

            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 mb-8 text-xs font-semibold tracking-wide border"
              style={{ background: 'rgba(201,169,110,0.1)', borderColor: 'rgba(201,169,110,0.3)', color: 'var(--gold-dark)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--gold)' }} />
              Official Mishna Yomit Program
            </div>

            {/* Hebrew */}
            <div className="mb-3 font-bold leading-none"
              style={{ fontFamily: 'var(--font-hebrew)', direction: 'rtl', fontSize: 'clamp(52px, 9vw, 88px)', color: 'var(--navy)' }}>
              משנה יומי
            </div>

            <div className="divider-gold mb-5" style={{ maxWidth: '200px' }}>
              <span style={{ fontSize: '10px', letterSpacing: '0.2em' }}>✦ ✦ ✦</span>
            </div>

            <h1 className="mb-5 leading-tight" style={{ fontFamily: 'var(--font-playfair)', fontSize: 'clamp(26px, 4vw, 40px)', color: 'var(--fg)' }}>
              Daily Mishnah Learning with{' '}
              <span className="gradient-gold">R&apos; Shloimie Friedman</span>
            </h1>

            <p className="mb-10 leading-relaxed" style={{ color: 'var(--muted)', fontSize: '1.0625rem', maxWidth: '520px' }}>
              Two Mishnayot every day. Follow the official Mishna Yomit calendar,
              listen to the podcast, track your progress, and complete the entire Mishnah.
            </p>

            <div className="flex flex-wrap gap-3 mb-10">
              <Link href="/learn" className="btn-primary" style={{ fontSize: '0.9375rem', padding: '0.75rem 1.75rem' }}>
                Start Learning Today
              </Link>
              <Link href="/browse" className="btn-ghost" style={{ fontSize: '0.9375rem', padding: '0.75rem 1.75rem' }}>
                Browse Tractates
              </Link>
            </div>

            <div className="flex items-center gap-5 text-sm" style={{ color: 'var(--muted)' }}>
              <span>{TOTAL_MISHNAYOT.toLocaleString()} Mishnayot</span>
              <span style={{ color: 'var(--border)', fontWeight: 300 }}>|</span>
              <span>{totalTractates} Tractates</span>
              <span style={{ color: 'var(--border)', fontWeight: 300 }}>|</span>
              <span>{totalSedarim} Sedarim</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── TODAY'S LESSON ── */}
      <section style={{ background: 'var(--bg)' }} className="py-16">
        <div className="px-6 lg:px-10" style={{ maxWidth: '1152px', margin: '0 auto' }}>
          <div className="card-gold p-8">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--gold)' }}>
                  Today&apos;s Lesson · Day {today.dayNumber}
                </p>
                <h2 className="text-3xl sm:text-4xl font-bold mb-1" style={{ color: 'var(--fg)', fontFamily: 'var(--font-playfair)' }}>
                  {today.label}
                </h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>{today.dateLabel}</p>
              </div>
              <Link href="/learn" className="btn-primary flex-shrink-0" style={{ fontSize: '0.9375rem', padding: '0.75rem 1.75rem' }}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Listen Now
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-16" style={{ background: '#fff' }}>
        <div className="px-6 lg:px-10" style={{ maxWidth: '1152px', margin: '0 auto' }}>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
              Everything you need to complete the Mishnah
            </h2>
            <p style={{ color: 'var(--muted)' }}>Built around the official Mishna Yomit calendar.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>,
                title: 'Listen', desc: 'Audio player with position memory, speed control, and skip buttons. Picks up right where you left off.', href: '/learn',
              },
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>,
                title: 'Track Progress', desc: 'Visual breakdown by Seder and Tractate. See exactly how far you\'ve come across all 63 tractates.', href: '/progress',
              },
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                title: 'Follow Calendar', desc: 'Stay on the official Mishna Yomit schedule. Always know what today\'s 2 Mishnayot are.', href: '/calendar',
              },
              {
                icon: <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>,
                title: 'Daily Email', desc: 'A daily reminder with today\'s lesson and a direct listen link — delivered at your preferred time.', href: '#subscribe',
              },
            ].map(f => (
              <Link key={f.title} href={f.href}
                className="card group p-6 hover:shadow-md transition-all cursor-pointer"
                style={{ borderColor: 'var(--border)' }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-colors"
                  style={{ background: 'rgba(30,58,95,0.06)', color: 'var(--navy)' }}>
                  {f.icon}
                </div>
                <h3 className="font-semibold mb-1.5 transition-colors" style={{ color: 'var(--fg)' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{f.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── SIX SEDARIM ── */}
      <section className="py-16" style={{ background: 'var(--bg)' }}>
        <div className="px-6 lg:px-10" style={{ maxWidth: '1152px', margin: '0 auto' }}>
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
              Six Sedarim. 63 Tractates. One journey.
            </h2>
            <p style={{ color: 'var(--muted)' }}>From Zeraim to Taharot — every mishna in order.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {SEDARIM.map((seder, i) => {
              const palettes = [
                { bg: '#FFFBEB', border: '#FDE68A', text: '#92400E' },
                { bg: '#EFF6FF', border: '#BFDBFE', text: '#1E40AF' },
                { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6' },
                { bg: '#ECFDF5', border: '#A7F3D0', text: '#065F46' },
                { bg: '#FFF1F2', border: '#FECDD3', text: '#9F1239' },
                { bg: '#ECFEFF', border: '#A5F3FC', text: '#155E75' },
              ];
              const p = palettes[i];
              return (
                <div key={seder.name} className="rounded-2xl p-4 text-center border transition-all hover:shadow-sm"
                  style={{ background: p.bg, borderColor: p.border }}>
                  <span className="font-bold block mb-1 text-sm" style={{ color: p.text }}>{seder.name}</span>
                  <span className="text-xs block mb-2" style={{ color: 'var(--muted)' }}>{seder.tractates.length} tractates</span>
                  <span className="text-sm font-bold font-mono block" style={{ color: p.text }}>{seder.totalMishnayot.toLocaleString()}</span>
                  <span className="text-xs" style={{ color: 'var(--muted)' }}>mishnayot</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SUBSCRIBE ── */}
      <section id="subscribe" className="py-16" style={{ background: '#fff' }}>
        <div className="px-6 lg:px-10 text-center" style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h2 className="text-3xl font-bold mb-3" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
            Get your daily reminder
          </h2>
          <p className="mb-10" style={{ color: 'var(--muted)' }}>
            Enter your email — we&apos;ll send today&apos;s 2 Mishnayot with a direct listen link.
          </p>
          <SubscribeForm />
        </div>
      </section>

      {/* ── QUOTE ── */}
      <section className="py-16 text-center border-t" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="px-6" style={{ maxWidth: '560px', margin: '0 auto' }}>
          <p className="text-2xl sm:text-3xl mb-4 leading-relaxed"
            style={{ fontFamily: 'var(--font-hebrew)', direction: 'rtl', color: 'var(--navy)' }}>
            &ldquo;כָּל יִשְׂרָאֵל יֵשׁ לָהֶם חֵלֶק לָעוֹלָם הַבָּא&rdquo;
          </p>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>All of Israel has a share in the World to Come — Sanhedrin 10:1</p>
        </div>
      </section>

    </div>
  );
}
