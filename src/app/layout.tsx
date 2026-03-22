import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-playfair', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Mishna Yomi — Daily Mishnah Learning', template: '%s | Mishna Yomi' },
  description: "Listen to Rabbi Shloimie Friedman's Mishna Yomi podcast. Follow the daily learning program, track your progress through all 63 tractates, and receive daily email reminders.",
  keywords: ['mishna yomi', 'mishnah', 'jewish learning', 'torah', 'podcast', 'daily learning'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Hebrew:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ background: 'var(--bg)', color: 'var(--fg)' }} className="antialiased min-h-screen flex flex-col">

        {/* NAV — logo left | links+CTA flush right */}
        <nav className="glass fixed top-0 w-full z-50 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="w-full px-6 lg:px-10">
            <div className="flex items-center justify-between h-20">

              {/* Logo — flush left */}
              <Link href="/" className="flex items-center gap-3 flex-shrink-0 group">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: 'var(--navy)' }}>
                  <span className="text-white text-base font-bold" style={{ fontFamily: 'var(--font-hebrew)', direction: 'rtl' }}>מ</span>
                </div>
                <div>
                  <span className="font-bold text-base leading-none" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--navy)' }}>
                    Mishna Yomi
                  </span>
                  <span className="block text-[10px] tracking-widest uppercase leading-none mt-0.5" style={{ color: 'var(--gold)', fontFamily: 'var(--font-hebrew)', direction: 'rtl' }}>
                    משנה יומי
                  </span>
                </div>
              </Link>

              {/* All right-side items together */}
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1 mr-2">
                  {[
                    { href: '/learn', label: 'Learn' },
                    { href: '/browse', label: 'Browse' },
                    { href: '/progress', label: 'Progress' },
                    { href: '/calendar', label: 'Calendar' },
                  ].map(({ href, label }) => (
                    <Link key={href} href={href}
                      className="px-3 py-2 text-sm font-medium rounded-lg transition-colors"
                      style={{ color: 'var(--muted)' }}
                      onMouseOver={e => (e.currentTarget.style.color = 'var(--fg)')}
                      onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}>
                      {label}
                    </Link>
                  ))}
                </div>
                <Link href="/auth/login"
                  className="hidden sm:block text-sm font-medium px-3 py-2 transition-colors"
                  style={{ color: 'var(--muted)' }}>
                  Sign In
                </Link>
                <Link href="/learn" className="btn-primary">
                  Start Learning
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1 pt-20">{children}</main>

        <footer className="border-t py-10 px-6 lg:px-10" style={{ background: '#fff', borderColor: 'var(--border)' }}>
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--navy)' }}>
                <span className="text-white text-sm font-bold" style={{ fontFamily: 'var(--font-hebrew)', direction: 'rtl' }}>מ</span>
              </div>
              <div>
                <span className="font-bold text-sm" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--navy)' }}>Mishna Yomi</span>
                <span className="block text-xs" style={{ color: 'var(--muted)' }}>R&apos; Shloimie Friedman&apos;s daily podcast</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--muted)' }}>
              {['/learn', '/browse', '/progress', '/calendar'].map(href => (
                <Link key={href} href={href} className="capitalize transition-colors hover:text-[var(--fg)]">
                  {href.slice(1)}
                </Link>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>4,192 Mishnayot · 63 Tractates · 6 Sedarim</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
