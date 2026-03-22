import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import NavBar from '@/components/NavBar';

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

        <NavBar />

        <main className="flex-1 pt-20">{children}</main>

        <footer className="border-t py-12 px-6 lg:px-10" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <div style={{ maxWidth: '1152px', margin: '0 auto' }}
            className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, var(--navy), #2d5a8e)' }}>
                <span className="text-white font-bold" style={{ fontFamily: 'var(--font-hebrew)' }}>מ</span>
              </div>
              <div>
                <span className="font-bold text-sm block" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--navy)' }}>
                  Mishna Yomi
                </span>
                <span className="text-xs block" style={{ color: 'var(--muted)' }}>
                  R&apos; Shloimie Friedman&apos;s daily podcast
                </span>
              </div>
            </div>
            <div className="flex items-center gap-6 text-sm" style={{ color: 'var(--muted)' }}>
              {[
                { href: '/learn', label: 'Learn' },
                { href: '/browse', label: 'Browse' },
                { href: '/progress', label: 'Progress' },
                { href: '/calendar', label: 'Calendar' },
              ].map(({ href, label }) => (
                <Link key={href} href={href} className="footer-link">
                  {label}
                </Link>
              ))}
            </div>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              4,192 Mishnayot · 63 Tractates · 6 Sedarim
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
