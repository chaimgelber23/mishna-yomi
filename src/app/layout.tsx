import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Link from 'next/link';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Mishna Yomi — Daily Mishnah Learning',
    template: '%s | Mishna Yomi',
  },
  description:
    'Listen to Rabbi Shloimie Friedman\'s Mishna Yomi podcast. Follow the daily learning program, track your progress through all 63 tractates, and receive daily email reminders.',
  keywords: ['mishna yomi', 'mishnah', 'jewish learning', 'torah', 'podcast', 'daily learning'],
  openGraph: {
    title: 'Mishna Yomi — Daily Mishnah Learning',
    description: 'Follow the official Mishna Yomit calendar with R\' Shloimie Friedman. 4,192 Mishnayot, 2 per day.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+Hebrew:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-navy-950 text-parchment-100 antialiased min-h-screen flex flex-col">
        {/* Navigation */}
        <nav className="sticky top-0 z-50 bg-navy-950/80 backdrop-blur-xl border-b border-white/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gold-600 to-gold-400 flex items-center justify-center shadow-gold flex-shrink-0">
                  <span className="text-navy-950 text-sm font-bold" style={{ fontFamily: 'serif' }}>מ</span>
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-gold-400 text-base font-bold leading-none group-hover:text-gold-300 transition-colors"
                    style={{ fontFamily: 'serif', direction: 'rtl' }}
                  >
                    משנה יומי
                  </span>
                  <span className="text-slate-600 text-[10px] tracking-widest uppercase leading-none mt-0.5 hidden sm:block">
                    Mishna Yomi
                  </span>
                </div>
              </Link>

              {/* Nav links */}
              <div className="hidden md:flex items-center gap-1">
                {[
                  { href: '/learn', label: 'Learn' },
                  { href: '/browse', label: 'Browse' },
                  { href: '/progress', label: 'Progress' },
                  { href: '/calendar', label: 'Calendar' },
                ].map(({ href, label }) => (
                  <Link
                    key={href}
                    href={href}
                    className="px-4 py-2 text-sm text-slate-400 hover:text-parchment-100 hover:bg-white/5 rounded-lg transition-all"
                  >
                    {label}
                  </Link>
                ))}
              </div>

              {/* Right side */}
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="text-sm text-slate-500 hover:text-slate-300 transition-colors px-3 py-2"
                >
                  Sign In
                </Link>
                <Link
                  href="/learn"
                  className="btn-gold text-sm px-4 py-2 rounded-lg text-navy-950 font-semibold"
                >
                  Start Learning
                </Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 py-10 px-4 mt-16">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-gradient-to-br from-gold-600 to-gold-400 flex items-center justify-center">
                  <span className="text-navy-950 text-xs font-bold" style={{ fontFamily: 'serif' }}>מ</span>
                </div>
                <div>
                  <span className="text-gold-500 text-sm font-medium block" style={{ fontFamily: 'serif', direction: 'rtl' }}>
                    משנה יומי
                  </span>
                  <span className="text-slate-700 text-xs">
                    R&apos; Shloimie Friedman&apos;s daily podcast
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-6 text-slate-600 text-xs">
                <Link href="/learn" className="hover:text-slate-400 transition-colors">Learn</Link>
                <Link href="/browse" className="hover:text-slate-400 transition-colors">Browse</Link>
                <Link href="/progress" className="hover:text-slate-400 transition-colors">Progress</Link>
                <Link href="/calendar" className="hover:text-slate-400 transition-colors">Calendar</Link>
                <Link href="/auth/login" className="hover:text-slate-400 transition-colors">Sign In</Link>
              </div>
              <p className="text-slate-700 text-xs">
                4,192 Mishnayot · 63 Tractates · 6 Sedarim
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
