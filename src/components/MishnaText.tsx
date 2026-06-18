'use client';

import { useState, useEffect } from 'react';
import type { MishnaText as MishnaTextData } from '@/lib/sefaria';

type Lang = 'he' | 'en' | 'both';

interface MishnaTextProps {
  /** Cycle day number — fetches that day's 2 mishnayot. */
  day?: number;
  /** A single mishna (used by the browse view). */
  single?: { tractate: string; chapter: number; mishna: number };
  /** Initial language view (persisted across the site after first change). */
  defaultLang?: Lang;
  /** Tighter padding for inline use in lists. */
  compact?: boolean;
}

const LANG_KEY = 'mishna-text-lang';

function buildQuery(props: MishnaTextProps): string | null {
  if (props.day != null) return `day=${props.day}`;
  if (props.single) {
    const { tractate, chapter, mishna } = props.single;
    return `tractate=${encodeURIComponent(tractate)}&chapter=${chapter}&mishna=${mishna}`;
  }
  return null;
}

export default function MishnaText({ day, single, defaultLang = 'both', compact = false }: MishnaTextProps) {
  const [lang, setLang] = useState<Lang>(defaultLang);
  const [data, setData] = useState<MishnaTextData[] | null>(null);
  const [error, setError] = useState(false);

  const query = buildQuery({ day, single });

  // Restore the reader's language preference.
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LANG_KEY) as Lang | null;
      if (saved === 'he' || saved === 'en' || saved === 'both') setLang(saved);
    } catch { /* ignore */ }
  }, []);

  function chooseLang(next: Lang) {
    setLang(next);
    try { localStorage.setItem(LANG_KEY, next); } catch { /* ignore */ }
  }

  // Fetch the text.
  useEffect(() => {
    if (!query) return;
    let cancelled = false;
    setData(null);
    setError(false);
    fetch(`/api/mishna-text?${query}`)
      .then(r => r.json())
      .then(d => { if (!cancelled) setData(d.mishnayot ?? []); })
      .catch(() => { if (!cancelled) setError(true); });
    return () => { cancelled = true; };
  }, [query]);

  if (!query) return null;

  const pad = compact ? 'p-4' : 'p-6 sm:p-7';
  const enSource = data?.find(m => m.enSource)?.enSource ?? '';

  return (
    <div className="card overflow-hidden" style={{ borderColor: 'var(--border)' }}>
      {/* Header + language toggle */}
      <div className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-4 pb-3 border-b"
        style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, #F8F4EE, #fff)' }}>
        <div className="flex items-center gap-2">
          <span className="text-base leading-none" style={{ fontFamily: 'var(--font-hebrew)', color: 'var(--brass-light)' }}>א</span>
          <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
            The Mishna
          </p>
        </div>
        <div className="flex rounded-lg border overflow-hidden text-xs font-semibold" style={{ borderColor: 'var(--border)' }}>
          {([['he', 'עברית'], ['en', 'English'], ['both', 'Both']] as [Lang, string][]).map(([value, label]) => (
            <button key={value} onClick={() => chooseLang(value)}
              className="px-3 py-1.5 transition-colors cursor-pointer"
              style={lang === value
                ? { background: 'var(--brass)', color: '#fff' }
                : { background: 'transparent', color: 'var(--muted)' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className={pad}>
        {error && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>
            Couldn&apos;t load the text right now — try refreshing.
          </p>
        )}

        {!error && !data && (
          <div className="flex items-center justify-center py-8 gap-2" style={{ color: 'var(--muted)' }}>
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span className="text-sm">Loading the text…</span>
          </div>
        )}

        {!error && data && data.length === 0 && (
          <p className="text-sm text-center py-6" style={{ color: 'var(--muted)' }}>Text unavailable for this lesson.</p>
        )}

        {!error && data && data.map((m, i) => {
          const showHe = lang !== 'en' && m.he;
          const showEn = lang !== 'he' && m.en;
          return (
            <div key={m.ref} className={i > 0 ? 'mt-7 pt-7 border-t' : ''} style={i > 0 ? { borderColor: 'var(--border)' } : undefined}>
              {/* Mishna label medallion */}
              <div className="flex items-center gap-2.5 mb-3">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border flex-shrink-0"
                  style={{ background: 'rgba(160,120,64,0.10)', borderColor: 'rgba(160,120,64,0.3)', color: 'var(--brass-deep)' }}>
                  {m.label.split(':').pop()}
                </span>
                <span className="text-sm font-semibold" style={{ color: 'var(--fg)', fontFamily: 'var(--font-frank)' }}>{m.label}</span>
              </div>

              {showHe && (
                <div dir="rtl" className="leading-loose mb-4"
                  style={{ fontFamily: 'var(--font-hebrew)', color: 'var(--ink)', fontSize: compact ? '1.15rem' : '1.35rem', textAlign: 'justify' }}>
                  {m.he}
                </div>
              )}

              {showEn && (
                <p className="leading-relaxed" style={{ color: lang === 'both' ? 'var(--muted)' : 'var(--fg)', fontSize: '0.95rem', fontFamily: 'var(--font-frank)' }}>
                  {m.en}
                </p>
              )}
            </div>
          );
        })}

        {/* Attribution — required by the source licenses. */}
        {!error && data && data.length > 0 && (
          <p className="mt-6 pt-4 border-t text-[11px] leading-relaxed" style={{ borderColor: 'var(--border)', color: 'var(--muted)' }}>
            Hebrew: Torat Emet (Public Domain).
            {enSource && <> English: {enSource}.</>}{' '}
            Via <a href="https://www.sefaria.org" target="_blank" rel="noopener noreferrer" className="underline" style={{ color: 'var(--brass-deep)' }}>Sefaria</a>.
          </p>
        )}
      </div>
    </div>
  );
}
