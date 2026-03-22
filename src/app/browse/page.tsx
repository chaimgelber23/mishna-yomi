'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SEDARIM,
  SEDER_HEBREW,
  TRACTATE_HEBREW,
  type SederInfo,
  type TractateInfo,
} from '@/lib/mishna-data';

// ─── types ───────────────────────────────────────────────────────────────────

type Level = 'seder' | 'tractate' | 'chapter' | 'mishna';

interface Crumb {
  label: string;
  level: Level;
  seder?: string;
  tractate?: string;
  chapter?: number;
}

// episode stub from DB (loaded on demand)
interface EpisodeStub {
  id: string;
  audio_url: string;
  title: string;
  tractate: string;
  chapter_from: number;
  mishna_from: number;
  chapter_to: number;
  mishna_to: number;
}

// ─── colour map per seder ────────────────────────────────────────────────────
const SEDER_COLORS: Record<string, { bg: string; border: string; accent: string; hex: string }> = {
  Zeraim:   { bg: 'bg-emerald-950/60',  border: 'border-emerald-700/50',  accent: 'text-emerald-400',  hex: '#10b981' },
  Moed:     { bg: 'bg-sky-950/60',      border: 'border-sky-700/50',      accent: 'text-sky-400',      hex: '#38bdf8' },
  Nashim:   { bg: 'bg-rose-950/60',     border: 'border-rose-700/50',     accent: 'text-rose-400',     hex: '#fb7185' },
  Nezikin:  { bg: 'bg-amber-950/60',    border: 'border-amber-700/50',    accent: 'text-amber-400',    hex: '#fbbf24' },
  Kodashim: { bg: 'bg-violet-950/60',   border: 'border-violet-700/50',   accent: 'text-violet-400',   hex: '#a78bfa' },
  Taharot:  { bg: 'bg-cyan-950/60',     border: 'border-cyan-700/50',     accent: 'text-cyan-400',     hex: '#22d3ee' },
};

// ─── component ───────────────────────────────────────────────────────────────

export default function BrowsePage() {
  const [level, setLevel] = useState<Level>('seder');
  const [selectedSeder, setSelectedSeder]     = useState<SederInfo | null>(null);
  const [selectedTractate, setSelectedTractate] = useState<TractateInfo | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<number | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeStub[]>([]);
  const [progress, setProgress] = useState<Record<string, boolean>>({});  // key = "Tractate-ch-m"

  // Load episodes for current tractate whenever tractate changes
  useEffect(() => {
    if (!selectedTractate) return;
    fetch(`/api/episodes?tractate=${encodeURIComponent(selectedTractate.tractate)}`)
      .then(r => r.json())
      .then(data => setEpisodes(data.episodes ?? []))
      .catch(() => {});
  }, [selectedTractate]);

  // Load user progress once
  useEffect(() => {
    fetch('/api/progress')
      .then(r => r.json())
      .then(data => {
        if (data.progress) {
          const map: Record<string, boolean> = {};
          for (const p of data.progress) {
            if (p.completed && p.episode) {
              const ep = p.episode as EpisodeStub;
              // mark every mishna covered by this episode
              const chFrom = ep.chapter_from; const mFrom = ep.mishna_from;
              const chTo   = ep.chapter_to;   const mTo   = ep.mishna_to;
              map[`${ep.tractate}-${chFrom}-${mFrom}`] = true;
              if (chFrom !== chTo || mFrom !== mTo)
                map[`${ep.tractate}-${chTo}-${mTo}`] = true;
            }
          }
          setProgress(map);
        }
      })
      .catch(() => {});
  }, []);

  // ── breadcrumb ──────────────────────────────────────────────────────────────
  const crumbs: Crumb[] = [{ label: 'All Sedarim', level: 'seder' }];
  if (selectedSeder)   crumbs.push({ label: selectedSeder.name,     level: 'tractate', seder: selectedSeder.name });
  if (selectedTractate) crumbs.push({ label: selectedTractate.tractate, level: 'chapter',  seder: selectedSeder?.name, tractate: selectedTractate.tractate });
  if (selectedChapter !== null) crumbs.push({ label: `Chapter ${selectedChapter}`, level: 'mishna', chapter: selectedChapter });

  function navTo(crumb: Crumb) {
    if (crumb.level === 'seder') {
      setSelectedSeder(null); setSelectedTractate(null); setSelectedChapter(null);
      setLevel('seder');
    } else if (crumb.level === 'tractate') {
      setSelectedTractate(null); setSelectedChapter(null);
      setLevel('tractate');
    } else if (crumb.level === 'chapter') {
      setSelectedChapter(null);
      setLevel('chapter');
    }
  }

  // ── helpers ─────────────────────────────────────────────────────────────────
  const colors = selectedSeder ? SEDER_COLORS[selectedSeder.name] : SEDER_COLORS['Zeraim'];

  function episodeForMishna(ch: number, m: number): EpisodeStub | undefined {
    return episodes.find(ep =>
      (ep.chapter_from === ch && ep.mishna_from === m) ||
      (ep.chapter_to   === ch && ep.mishna_to   === m)
    );
  }

  function isCompleted(tractate: string, ch: number, m: number): boolean {
    return !!progress[`${tractate}-${ch}-${m}`];
  }

  // tractate completion count
  function tractateCompletedCount(t: TractateInfo): number {
    let n = 0;
    for (let ci = 0; ci < t.chapters.length; ci++)
      for (let mi = 1; mi <= t.chapters[ci]; mi++)
        if (isCompleted(t.tractate, ci + 1, mi)) n++;
    return n;
  }

  // ── render levels ────────────────────────────────────────────────────────────

  function renderSederLevel() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SEDARIM.map(seder => {
          const c = SEDER_COLORS[seder.name];
          return (
            <button
              key={seder.name}
              onClick={() => { setSelectedSeder(seder); setLevel('tractate'); }}
              className={`group text-left p-6 rounded-2xl border ${c.bg} ${c.border} hover:scale-[1.02] transition-all duration-200`}
            >
              <div className={`text-3xl font-bold mb-1 ${c.accent}`} dir="rtl">
                {SEDER_HEBREW[seder.name]}
              </div>
              <div className="text-white text-xl font-semibold mb-3">Seder {seder.name}</div>
              <div className="flex flex-wrap gap-2 text-sm text-slate-400">
                <span className="bg-white/5 rounded-full px-3 py-0.5">
                  {seder.tractates.length} tractates
                </span>
                <span className="bg-white/5 rounded-full px-3 py-0.5">
                  {seder.totalMishnayot} mishnayot
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {seder.tractates.map(t => (
                  <span key={t.tractate} className="text-xs text-slate-500 hover:text-slate-300 transition-colors">
                    {t.tractate}
                  </span>
                ))}
              </div>
              <div className={`mt-4 text-sm ${c.accent} flex items-center gap-1 group-hover:gap-2 transition-all`}>
                Browse tractates <span>→</span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderTractateLevel() {
    if (!selectedSeder) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedSeder.tractates.map(t => {
          const done  = tractateCompletedCount(t);
          const total = t.totalMishnayot;
          const pct   = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <button
              key={t.tractate}
              onClick={() => { setSelectedTractate(t); setLevel('chapter'); }}
              className={`group text-left p-5 rounded-xl border ${colors.bg} ${colors.border} hover:scale-[1.02] transition-all duration-200`}
            >
              <div className={`text-xl font-semibold ${colors.accent} mb-0.5`} dir="rtl">
                {TRACTATE_HEBREW[t.tractate] ?? t.tractate}
              </div>
              <div className="text-white font-medium mb-3">{t.tractate}</div>
              <div className="text-sm text-slate-400 mb-3">
                {t.chapters.length} chapters · {total} mishnayot
              </div>
              {/* mini progress bar */}
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: colors.hex }}
                />
              </div>
              <div className="text-xs text-slate-500 mt-1">{done}/{total} complete</div>
            </button>
          );
        })}
      </div>
    );
  }

  function renderChapterLevel() {
    if (!selectedTractate) return null;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {selectedTractate.chapters.map((mishnaCount, idx) => {
          const ch = idx + 1;
          let done = 0;
          for (let m = 1; m <= mishnaCount; m++)
            if (isCompleted(selectedTractate.tractate, ch, m)) done++;
          const pct = Math.round((done / mishnaCount) * 100);
          return (
            <button
              key={ch}
              onClick={() => { setSelectedChapter(ch); setLevel('mishna'); }}
              className={`group text-left p-4 rounded-xl border ${colors.bg} ${colors.border} hover:scale-[1.02] transition-all duration-200`}
            >
              <div className={`text-2xl font-bold ${colors.accent} mb-1`}>{ch}</div>
              <div className="text-sm text-slate-400 mb-2">
                {mishnaCount} mishna{mishnaCount !== 1 ? 'yot' : 'h'}
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#22c55e' : colors.hex }}
                />
              </div>
              {pct === 100 && (
                <div className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
                  <span>✓</span> Complete
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  function renderMishnaLevel() {
    if (!selectedTractate || selectedChapter === null) return null;
    const mishnaCount = selectedTractate.chapters[selectedChapter - 1];
    const mishnayot = Array.from({ length: mishnaCount }, (_, i) => i + 1);

    return (
      <div className="space-y-2">
        {mishnayot.map(m => {
          const ep   = episodeForMishna(selectedChapter, m);
          const done = isCompleted(selectedTractate.tractate, selectedChapter, m);
          const label = `${selectedTractate.tractate} ${selectedChapter}:${m}`;
          const hebLabel = `${TRACTATE_HEBREW[selectedTractate.tractate] ?? selectedTractate.tractate} ${selectedChapter}:${m}`;

          return (
            <div
              key={m}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all
                ${done
                  ? 'bg-emerald-950/40 border-emerald-700/40'
                  : `${colors.bg} ${colors.border}`
                }
              `}
            >
              {/* left */}
              <div className="flex items-center gap-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${done ? 'bg-emerald-500 text-white' : 'bg-white/10 text-slate-300'}
                `}>
                  {done ? '✓' : m}
                </div>
                <div>
                  <div className="text-white font-medium">{label}</div>
                  <div className="text-slate-500 text-sm" dir="rtl">{hebLabel}</div>
                </div>
              </div>

              {/* right */}
              <div className="flex items-center gap-2">
                {ep ? (
                  <Link
                    href={`/learn?episode=${ep.id}`}
                    className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-all
                      ${colors.accent} border ${colors.border} hover:bg-white/10`}
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                    </svg>
                    Listen
                  </Link>
                ) : (
                  <span className="text-xs text-slate-600 px-3 py-1.5 rounded-full border border-slate-700">
                    Coming soon
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── page heading per level ───────────────────────────────────────────────────
  function pageHeading() {
    if (level === 'seder') return { title: 'Browse Mishnayot', sub: 'Choose a Seder to explore' };
    if (level === 'tractate') return {
      title: `Seder ${selectedSeder?.name}`,
      sub: `${selectedSeder?.tractates.length} tractates · ${selectedSeder?.totalMishnayot} mishnayot`,
    };
    if (level === 'chapter') return {
      title: selectedTractate?.tractate ?? '',
      sub: `${selectedTractate?.chapters.length} chapters · ${selectedTractate?.totalMishnayot} mishnayot`,
    };
    return {
      title: `${selectedTractate?.tractate} — Chapter ${selectedChapter}`,
      sub: `${selectedTractate?.chapters[(selectedChapter ?? 1) - 1]} mishnayot`,
    };
  }

  const { title, sub } = pageHeading();

  return (
    <div className="min-h-screen bg-navy-950 text-white">
      {/* top nav */}
      <nav className="sticky top-0 z-20 bg-navy-950/80 backdrop-blur border-b border-white/5 px-6 py-3 flex items-center gap-2">
        <Link href="/" className="text-slate-500 hover:text-white text-sm transition-colors">Home</Link>
        <span className="text-slate-700">/</span>
        {crumbs.map((crumb, i) => (
          <span key={i} className="flex items-center gap-2">
            {i < crumbs.length - 1 ? (
              <>
                <button
                  onClick={() => navTo(crumb)}
                  className="text-slate-400 hover:text-white text-sm transition-colors"
                >
                  {crumb.label}
                </button>
                <span className="text-slate-700">/</span>
              </>
            ) : (
              <span className={`text-sm font-medium ${colors.accent}`}>{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* heading */}
        <div className="mb-8">
          {level !== 'seder' && selectedSeder && (
            <div className={`text-sm font-medium mb-1 ${colors.accent}`} dir="rtl">
              {SEDER_HEBREW[selectedSeder.name]}
              {selectedTractate && ` · ${TRACTATE_HEBREW[selectedTractate.tractate] ?? selectedTractate.tractate}`}
            </div>
          )}
          <h1 className="text-3xl font-bold text-white mb-1">{title}</h1>
          <p className="text-slate-400">{sub}</p>
        </div>

        {/* back button (levels > seder) */}
        {level !== 'seder' && (
          <button
            onClick={() => {
              if (level === 'tractate') { setSelectedSeder(null); setLevel('seder'); }
              else if (level === 'chapter') { setSelectedTractate(null); setLevel('tractate'); }
              else if (level === 'mishna') { setSelectedChapter(null); setLevel('chapter'); }
            }}
            className="mb-6 flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors group"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            Back
          </button>
        )}

        {/* level content */}
        {level === 'seder'    && renderSederLevel()}
        {level === 'tractate' && renderTractateLevel()}
        {level === 'chapter'  && renderChapterLevel()}
        {level === 'mishna'   && renderMishnaLevel()}
      </main>
    </div>
  );
}
