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
  openGraph: {
    title: 'Mishna Yomi — Daily Mishnah Learning',
    description: "Follow the official Mishna Yomit calendar with R' Shloimie Friedman. 4,192 Mishnayot, 2 per day.",
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Noto+Serif+Hebrew:wght@400;700&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-parchment-50 text-stone-900 antialiased min-h-screen flex flex-col">

        {/* ── NAV: logo left | links + CTA right ── */}
        <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-200/80"
          style={{ boxShadow: '0 1px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '0 clamp(20px, 4vw, 48px)' }}>
            <div className="flex items-center justify-between h-16">

              {/* Logo — flush left */}
              <Link href="/" className="flex items-center gap-2.5 group flex-shrink-0">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-600 to-gold-500 flex items-center justify-center flex-shrink-0"
                  style={{ boxShadow: '0 2px 8px rgba(180,83,9,0.3)' }}>
                  <span className="text-white text-sm font-bold" style={{ fontFamily: 'serif' }}>מ</span>
                </div>
                <div>
                  <span className="text-gold-700 font-bold text-base leading-none group-hover:text-gold-600 transition-colors"
                    style={{ fontFamily: 'serif', direction: 'rtl' }}>
                    משנה יומי
                  </span>
                  <span className="block text-stone-400 text-[10px] tracking-widest uppercase leading-none mt-0.5 hidden sm:block">
                    Mishna Yomi
                  </span>
                </div>
              </Link>

              {/* Links + CTA — all flush right together */}
              <div className="flex items-center gap-1">
                <div className="hidden md:flex items-center gap-0.5 mr-3">
                  {[
                    { href: '/learn', label: 'Learn' },
                    { href: '/browse', label: 'Browse' },
                    { href: '/progress', label: 'Progress' },
                    { href: '/calendar', label: 'Calendar' },
                  ].map(({ href, label }) => (
                    <Link key={href} href={href}
                      className="px-3.5 py-2 text-sm text-stone-500 hover:text-stone-900 hover:bg-stone-100 rounded-lg transition-all font-medium">
                      {label}
                    </Link>
                  ))}
                </div>
                <Link href="/auth/login"
                  className="text-sm text-stone-500 hover:text-stone-700 transition-colors px-3 py-2 hidden sm:block">
                  Sign In
                </Link>
                <Link href="/learn" className="btn-gold text-sm px-4 py-2 rounded-lg ml-1">
                  Start Learning
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1">{children}</main>

        {/* Footer */}
        <footer className="border-t border-stone-200 bg-white py-10 px-6 mt-16">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-md bg-gradient-to-br from-gold-600 to-gold-500 flex items-center justify-center">
                <span className="text-white text-xs font-bold" style={{ fontFamily: 'serif' }}>מ</span>
              </div>
              <div>
                <span className="text-gold-700 text-sm font-semibold block" style={{ fontFamily: 'serif', direction: 'rtl' }}>משנה יומי</span>
                <span className="text-stone-400 text-xs">R&apos; Shloimie Friedman&apos;s daily podcast</span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-stone-400 text-sm">
              <Link href="/learn" className="hover:text-stone-600 transition-colors">Learn</Link>
              <Link href="/browse" className="hover:text-stone-600 transition-colors">Browse</Link>
              <Link href="/progress" className="hover:text-stone-600 transition-colors">Progress</Link>
              <Link href="/calendar" className="hover:text-stone-600 transition-colors">Calendar</Link>
            </div>
            <p className="text-stone-400 text-xs">4,192 Mishnayot · 63 Tractates · 6 Sedarim</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
