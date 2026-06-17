import type { Metadata } from 'next';
import { Inter, Frank_Ruhl_Libre } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import NavBar from '@/components/NavBar';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const frank = Frank_Ruhl_Libre({
  subsets: ['latin', 'hebrew'],
  weight: ['400', '500', '700', '900'],
  variable: '--font-frank',
  display: 'swap',
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://mishna-yomi.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: 'Mishna Yomi — Daily Mishnah Learning', template: '%s | Mishna Yomi' },
  description:
    "Learn the daily Mishnah with Rabbi Shloimie Friedman. Follow the worldwide Mishna Yomit cycle or build your own — start from any tractate, set your pace, even pick your siyum date. Track progress through all 63 tractates and get a daily email.",
  keywords: ['mishna yomi', 'mishnah', 'jewish learning', 'torah', 'daf yomi', 'daily learning', 'shas'],
  openGraph: {
    title: 'Mishna Yomi — Daily Mishnah Learning',
    description: 'Follow the worldwide Mishna Yomit cycle or build your own path through all of Shas.',
    type: 'website',
    siteName: 'Mishna Yomi',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${frank.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">

        <NavBar />

        <main className="flex-1 pt-20">{children}</main>

        <footer className="border-t py-12 px-6 lg:px-10" style={{ background: 'var(--parchment)', borderColor: 'var(--rule)' }}>
          <div style={{ maxWidth: '1152px', margin: '0 auto' }}
            className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-8">

            {/* Left — logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center sefer-frame"
                style={{ background: 'linear-gradient(135deg, var(--ink-grad-a), var(--ink-grad-b))' }}>
                <span style={{ fontFamily: 'var(--font-frank)', color: 'var(--brass-light)', fontSize: '20px', lineHeight: 1 }}>מ</span>
              </div>
              <div>
                <span className="font-bold text-sm block" style={{ fontFamily: 'var(--font-frank)', color: 'var(--ink)' }}>
                  Mishna Yomi
                </span>
                <span className="text-xs block" style={{ color: 'var(--muted)' }}>
                  R&apos; Shloimie Friedman&apos;s daily learning
                </span>
              </div>
            </div>

            {/* Right — nav links + stats */}
            <div className="flex flex-col items-center sm:items-end gap-3">
              <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-6 gap-y-2 text-sm" style={{ color: 'var(--muted)' }}>
                {[
                  { href: '/learn', label: 'Learn' },
                  { href: '/cycles', label: 'My Cycle' },
                  { href: '/browse', label: 'Browse' },
                  { href: '/progress', label: 'Progress' },
                  { href: '/calendar', label: 'Calendar' },
                ].map(({ href, label }) => (
                  <Link key={href} href={href} className="footer-link">
                    {label}
                  </Link>
                ))}
              </div>
              <p className="text-xs text-center sm:text-right" style={{ color: 'var(--muted)' }}>
                4,192 Mishnayot · 63 Tractates · 6 Sedarim
                <span className="block mt-1 italic" style={{ color: 'var(--brass-deep)', fontSize: '11px' }}>
                  L&apos;ilui Nishmas Etta Ahuva bas Yaakov
                </span>
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
