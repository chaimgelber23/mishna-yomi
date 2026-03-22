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
        <nav className="sticky top-0 z-50 bg-navy-950/90 backdrop-blur-md border-b border-navy-700">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between h-14">
              {/* Logo — flush left */}
              <Link href="/" className="flex items-center gap-2 group">
                <span
                  className="text-gold-400 text-xl font-bold group-hover:text-gold-300 transition-colors"
                  style={{ fontFamily: 'serif', direction: 'rtl' }}
                >
                  משנה יומי
                </span>
                <span className="text-slate-500 text-xs tracking-widest uppercase hidden sm:block">
                  Mishna Yomi
                </span>
              </Link>

              {/* Nav links (center) */}
              <div className="hidden md:flex items-center gap-6">
                <Link href="/learn" className="nav-link">Learn</Link>
                <Link href="/browse" className="nav-link">Browse</Link>
                <Link href="/progress" className="nav-link">Progress</Link>
                <Link href="/calendar" className="nav-link">Calendar</Link>
              </div>

              {/* CTA — flush right */}
              <div className="flex items-center gap-3">
                <Link
                  href="/auth/login"
                  className="text-sm text-slate-400 hover:text-parchment-100 transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/learn"
                  className="btn-gold text-sm px-4 py-2 text-navy-950"
                >
                  Start Learning
                </Link>
              </div>
            </div>
          </div>
        </nav>

        {/* Main */}
        <main className="flex-1">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-navy-800 py-8 px-4 mt-12">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left">
              <span
                className="text-gold-500 text-lg block"
                style={{ fontFamily: 'serif', direction: 'rtl' }}
              >
                משנה יומי
              </span>
              <span className="text-slate-600 text-xs">
                Following R&apos; Shloimie Friedman&apos;s daily podcast
              </span>
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
        </footer>
      </body>
    </html>
  );
}
