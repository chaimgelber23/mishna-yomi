'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  SEDARIM, SEDER_HEBREW, TRACTATE_HEBREW,
  type SederInfo, type TractateInfo,
} from '@/lib/mishna-data';

type Level = 'seder' | 'tractate' | 'chapter' | 'mishna';

interface Crumb {
  label: string; level: Level;
  seder?: string; tractate?: string; chapter?: number;
}

interface EpisodeStub {
  id: string; audio_url: string; title: string; tractate: string;
  chapter_from: number; mishna_from: number; chapter_to: number; mishna_to: number;
}

const SEDER_PALETTES = [
  { bg: 'rgba(201,169,110,0.07)', border: 'rgba(201,169,110,0.22)', accent: '#7A5C1E', hex: '#C9A96E', light: 'rgba(201,169,110,0.12)' },
  { bg: 'rgba(30,58,95,0.05)',    border: 'rgba(30,58,95,0.16)',    accent: '#1e3a5f', hex: '#2d5a8e', light: 'rgba(30,58,95,0.1)' },
  { bg: 'rgba(109,40,217,0.05)',  border: 'rgba(109,40,217,0.14)', accent: '#5B21B6', hex: '#7C3AED', light: 'rgba(109,40,217,0.1)' },
  { bg: 'rgba(6,95,70,0.05)',     border: 'rgba(6,95,70,0.14)',    accent: '#065F46', hex: '#059669', light: 'rgba(6,95,70,0.1)' },
  { bg: 'rgba(159,18,57,0.05)',   border: 'rgba(159,18,57,0.14)',  accent: '#9F1239', hex: '#E11D48', light: 'rgba(159,18,57,0.1)' },
  { bg: 'rgba(21,94,117,0.05)',   border: 'rgba(21,94,117,0.14)',  accent: '#155E75', hex: '#0891B2', light: 'rgba(21,94,117,0.1)' },
];

const SEDER_ORDER = ['Zeraim','Moed','Nashim','Nezikin','Kodashim','Taharot'];

function getPalette(sederName: string) {
  const idx = SEDER_ORDER.indexOf(sederName);
  return SEDER_PALETTES[idx >= 0 ? idx : 0];
}

export default function BrowsePage() {
  const [level, setLevel]                       = useState<Level>('seder');
  const [selectedSeder, setSelectedSeder]       = useState<SederInfo | null>(null);
  const [selectedTractate, setSelectedTractate] = useState<TractateInfo | null>(null);
  const [selectedChapter, setSelectedChapter]   = useState<number | null>(null);
  const [episodes, setEpisodes]                 = useState<EpisodeStub[]>([]);
  const [progress, setProgress]                 = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!selectedTractate) return;
    fetch(`/api/episodes?tractate=${encodeURIComponent(selectedTractate.tractate)}`)
      .then(r => r.json()).then(d => setEpisodes(d.episodes ?? [])).catch(() => {});
  }, [selectedTractate]);

  useEffect(() => {
    fetch('/api/progress').then(r => r.json()).then(data => {
      if (data.progress) {
        const map: Record<string, boolean> = {};
        for (const p of data.progress) {
          if (p.completed && p.episode) {
            const ep = p.episode as EpisodeStub;
            map[`${ep.tractate}-${ep.chapter_from}-${ep.mishna_from}`] = true;
            if (ep.chapter_from !== ep.chapter_to || ep.mishna_from !== ep.mishna_to)
              map[`${ep.tractate}-${ep.chapter_to}-${ep.mishna_to}`] = true;
          }
        }
        setProgress(map);
      }
    }).catch(() => {});
  }, []);

  const crumbs: Crumb[] = [{ label: 'All Sedarim', level: 'seder' }];
  if (selectedSeder)    crumbs.push({ label: selectedSeder.name,         level: 'tractate' });
  if (selectedTractate) crumbs.push({ label: selectedTractate.tractate,  level: 'chapter' });
  if (selectedChapter !== null) crumbs.push({ label: `Chapter ${selectedChapter}`, level: 'mishna' });

  function navTo(crumb: Crumb) {
    if (crumb.level === 'seder')    { setSelectedSeder(null); setSelectedTractate(null); setSelectedChapter(null); setLevel('seder'); }
    else if (crumb.level === 'tractate') { setSelectedTractate(null); setSelectedChapter(null); setLevel('tractate'); }
    else if (crumb.level === 'chapter')  { setSelectedChapter(null); setLevel('chapter'); }
  }

  function isCompleted(tractate: string, ch: number, m: number) { return !!progress[`${tractate}-${ch}-${m}`]; }

  function tractateCompletedCount(t: TractateInfo) {
    let n = 0;
    for (let ci = 0; ci < t.chapters.length; ci++)
      for (let mi = 1; mi <= t.chapters[ci]; mi++)
        if (isCompleted(t.tractate, ci + 1, mi)) n++;
    return n;
  }

  function episodeForMishna(ch: number, m: number) {
    return episodes.find(ep =>
      (ep.chapter_from === ch && ep.mishna_from === m) ||
      (ep.chapter_to === ch && ep.mishna_to === m)
    );
  }

  const pal = selectedSeder ? getPalette(selectedSeder.name) : SEDER_PALETTES[0];

  // ── Seder grid ──
  function renderSederLevel() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SEDARIM.map((seder, i) => {
          const p = SEDER_PALETTES[i];
          return (
            <button key={seder.name} onClick={() => { setSelectedSeder(seder); setLevel('tractate'); }}
              className="group text-left p-7 rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: p.bg, borderColor: p.border }}>
              <div className="flex items-start justify-between mb-4">
                <div className="text-3xl font-bold leading-none" dir="rtl"
                  style={{ fontFamily: 'var(--font-hebrew)', color: p.accent }}>
                  {SEDER_HEBREW[seder.name]}
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                  style={{ background: p.light }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: p.accent }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className="font-bold text-lg mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                Seder {seder.name}
              </div>
              <div className="flex gap-3 text-xs mb-4" style={{ color: 'var(--muted)' }}>
                <span>{seder.tractates.length} tractates</span>
                <span>·</span>
                <span>{seder.totalMishnayot.toLocaleString()} mishnayot</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {seder.tractates.slice(0, 6).map(t => (
                  <span key={t.tractate} className="text-xs px-2 py-0.5 rounded-full border"
                    style={{ background: 'rgba(255,255,255,0.7)', borderColor: p.border, color: 'var(--muted)' }}>
                    {t.tractate}
                  </span>
                ))}
                {seder.tractates.length > 6 && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'var(--muted)' }}>
                    +{seder.tractates.length - 6}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Tractate grid ──
  function renderTractateLevel() {
    if (!selectedSeder) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedSeder.tractates.map(t => {
          const done = tractateCompletedCount(t);
          const pct  = t.totalMishnayot > 0 ? Math.round((done / t.totalMishnayot) * 100) : 0;
          return (
            <button key={t.tractate}
              onClick={() => { setSelectedTractate(t); setLevel('chapter'); }}
              className="group text-left p-6 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
              style={{ background: pal.bg, borderColor: pal.border }}>
              <div className="flex items-start justify-between mb-3">
                <div dir="rtl" className="text-xl font-bold"
                  style={{ fontFamily: 'var(--font-hebrew)', color: pal.accent }}>
                  {TRACTATE_HEBREW[t.tractate] ?? t.tractate}
                </div>
                {pct === 100 && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#ECFDF5' }}>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#065F46' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="font-semibold mb-1" style={{ color: 'var(--fg)' }}>{t.tractate}</div>
              <div className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                {t.chapters.length} chapters · {t.totalMishnayot} mishnayot
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(0,0,0,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : pal.hex }} />
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{done}/{t.totalMishnayot} complete</div>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Chapter grid ──
  function renderChapterLevel() {
    if (!selectedTractate) return null;
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {selectedTractate.chapters.map((mishnaCount, idx) => {
          const ch = idx + 1;
          let done = 0;
          for (let m = 1; m <= mishnaCount; m++)
            if (isCompleted(selectedTractate.tractate, ch, m)) done++;
          const pct = mishnaCount > 0 ? Math.round((done / mishnaCount) * 100) : 0;
          return (
            <button key={ch}
              onClick={() => { setSelectedChapter(ch); setLevel('mishna'); }}
              className="group text-left p-5 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
              style={{ background: pct === 100 ? 'rgba(6,95,70,0.05)' : pal.bg, borderColor: pct === 100 ? 'rgba(6,95,70,0.2)' : pal.border }}>
              <div className="text-2xl font-bold mb-1" style={{ color: pct === 100 ? '#065F46' : pal.accent }}>
                {ch}
              </div>
              <div className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                {mishnaCount} mishna{mishnaCount !== 1 ? 'yot' : 'h'}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                <div className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : pal.hex }} />
              </div>
              {pct === 100 && (
                <div className="text-xs mt-1.5 font-medium" style={{ color: '#065F46' }}>
                  ✓ Complete
                </div>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // ── Mishna list ──
  function renderMishnaLevel() {
    if (!selectedTractate || selectedChapter === null) return null;
    const mishnaCount = selectedTractate.chapters[selectedChapter - 1];
    return (
      <div className="space-y-2">
        {Array.from({ length: mishnaCount }, (_, i) => i + 1).map(m => {
          const ep   = episodeForMishna(selectedChapter, m);
          const done = isCompleted(selectedTractate.tractate, selectedChapter, m);
          const label = `${selectedTractate.tractate} ${selectedChapter}:${m}`;
          return (
            <div key={m}
              className="flex items-center justify-between p-4 rounded-xl border transition-all duration-200"
              style={{
                background: done ? 'rgba(6,95,70,0.04)' : 'rgba(255,255,255,0.7)',
                borderColor: done ? 'rgba(6,95,70,0.18)' : 'var(--border)',
              }}>
              <div className="flex items-center gap-4">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 border"
                  style={{
                    background: done ? '#ECFDF5' : 'var(--bg)',
                    borderColor: done ? 'rgba(6,95,70,0.25)' : 'var(--border)',
                    color: done ? '#065F46' : 'var(--muted)',
                  }}>
                  {done
                    ? <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                    : m}
                </div>
                <div>
                  <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{label}</div>
                  <div className="text-xs" dir="rtl" style={{ color: 'var(--muted)', fontFamily: 'var(--font-hebrew)' }}>
                    {TRACTATE_HEBREW[selectedTractate.tractate] ?? selectedTractate.tractate} {selectedChapter}:{m}
                  </div>
                </div>
              </div>
              <div>
                {ep ? (
                  <Link href={`/learn?episode=${ep.id}`}
                    className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border transition-all duration-200 cursor-pointer hover:shadow-sm"
                    style={{ background: pal.light, borderColor: pal.border, color: pal.accent }}>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                    Listen
                  </Link>
                ) : (
                  <span className="text-xs px-3 py-1.5 rounded-full border" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
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

  function pageHeading() {
    if (level === 'seder')    return { title: 'Browse Mishnayot', sub: 'Choose a Seder to explore all tractates' };
    if (level === 'tractate') return { title: `Seder ${selectedSeder?.name}`, sub: `${selectedSeder?.tractates.length} tractates · ${selectedSeder?.totalMishnayot?.toLocaleString()} mishnayot` };
    if (level === 'chapter')  return { title: selectedTractate?.tractate ?? '', sub: `${selectedTractate?.chapters.length} chapters · ${selectedTractate?.totalMishnayot} mishnayot` };
    return { title: `${selectedTractate?.tractate} — Chapter ${selectedChapter}`, sub: `${selectedTractate?.chapters[(selectedChapter ?? 1) - 1]} mishnayot` };
  }

  const { title, sub } = pageHeading();

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Page header */}
      <div className="border-b" style={{ background: '#fff', borderColor: 'var(--border)' }}>
        <div className="px-6 lg:px-10 py-8" style={{ maxWidth: '1152px', margin: '0 auto' }}>
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 mb-5 text-sm" style={{ color: 'var(--muted)' }}>
            <Link href="/" className="transition-colors hover:text-[var(--navy)]" style={{ color: 'var(--muted)' }}>Home</Link>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i < crumbs.length - 1 ? (
                  <>
                    <button onClick={() => navTo(crumb)}
                      className="transition-colors hover:text-[var(--navy)] cursor-pointer" style={{ color: 'var(--muted)' }}>
                      {crumb.label}
                    </button>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </>
                ) : (
                  <span className="font-medium" style={{ color: 'var(--navy)' }}>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          {/* Hebrew + title */}
          {level !== 'seder' && selectedSeder && (
            <div className="text-sm font-bold mb-1" dir="rtl"
              style={{ fontFamily: 'var(--font-hebrew)', color: pal.accent }}>
              {SEDER_HEBREW[selectedSeder.name]}
              {selectedTractate && ` · ${TRACTATE_HEBREW[selectedTractate.tractate] ?? selectedTractate.tractate}`}
            </div>
          )}
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
            {title}
          </h1>
          <p style={{ color: 'var(--muted)' }}>{sub}</p>
        </div>
      </div>

      <main className="px-6 lg:px-10 py-8" style={{ maxWidth: '1152px', margin: '0 auto' }}>
        {/* Back button */}
        {level !== 'seder' && (
          <button
            onClick={() => {
              if (level === 'tractate')  { setSelectedSeder(null);    setLevel('seder'); }
              else if (level === 'chapter')   { setSelectedTractate(null); setLevel('tractate'); }
              else if (level === 'mishna')    { setSelectedChapter(null);  setLevel('chapter'); }
            }}
            className="mb-6 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-all cursor-pointer hover:shadow-sm"
            style={{ color: 'var(--muted)', borderColor: 'var(--border)', background: '#fff' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
        )}

        {level === 'seder'    && renderSederLevel()}
        {level === 'tractate' && renderTractateLevel()}
        {level === 'chapter'  && renderChapterLevel()}
        {level === 'mishna'   && renderMishnaLevel()}
      </main>
    </div>
  );
}
