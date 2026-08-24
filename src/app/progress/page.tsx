'use client';

import { useState, useEffect } from 'react';
import ProgressBar from '@/components/ProgressBar';
import TractateCard from '@/components/TractateCard';
import { ALL_MISHNAYOT, SEDARIM, MISHNA_STRUCTURE, TOTAL_MISHNAYOT, SEDER_HEBREW, type MishnaReference } from '@/lib/mishna-data';
import {
  buildBrowseHref,
  readStudyResume,
  resolveStudyResume,
} from '@/lib/study-resume';
import Link from 'next/link';

interface MishnaProgressData {
  global_index: number;
  listened_at: string | null;
  self_studied_at: string | null;
  cycle_completed_at: string | null;
  learned_at: string | null;
}

// Map tractate → completed count
type TractateProgress = Record<string, { completed: number; inProgress: boolean; currentChapter?: number; currentMishna?: number }>;

// Sample progress for non-logged-in users
const SAMPLE_PROGRESS: TractateProgress = {
  'Berakhot':  { completed: 57,  inProgress: false },
  "Pe'ah":     { completed: 43,  inProgress: true, currentChapter: 5, currentMishna: 2 },
  'Demai':     { completed: 10,  inProgress: true, currentChapter: 2, currentMishna: 3 },
  'Shabbat':   { completed: 0,   inProgress: false },
  'Eruvin':    { completed: 0,   inProgress: false },
};

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function ProgressPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [tractateProgress, setTractateProgress] = useState<TractateProgress>({});
  const [completedCount, setCompletedCount] = useState(0);
  const [nextMishna, setNextMishna] = useState<MishnaReference | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSeders, setExpandedSeders] = useState<Set<string>>(new Set(['Zeraim', 'Moed']));

  useEffect(() => {
    async function load() {
      const response = await fetch('/api/progress');
      if (response.status === 401) {
        setUser(null);
        setTractateProgress(SAMPLE_PROGRESS);
        setCompletedCount(Object.values(SAMPLE_PROGRESS).reduce((sum, v) => sum + v.completed, 0));
        setLoading(false);
        return;
      }

      if (response.ok) {
        const data = await response.json() as { mishnaProgress?: MishnaProgressData[] };
        const progressRows = data.mishnaProgress ?? [];
        setUser({ id: 'signed-in' });
        const map: TractateProgress = {};
        const learnedIndices = new Set<number>();

        for (const row of progressRows) {
          const ref = ALL_MISHNAYOT[row.global_index - 1];
          if (!ref) continue;
          learnedIndices.add(row.global_index);
          const t = ref.tractate;
          if (!map[t]) map[t] = { completed: 0, inProgress: false };
          map[t].completed++;
          map[t].inProgress = true;
        }

        const firstUnlearned = ALL_MISHNAYOT.find(
          ref => !learnedIndices.has(ref.globalIndex),
        ) ?? null;
        const resume = resolveStudyResume({
          localPointer: readStudyResume(getBrowserStorage()),
          serverProgress: progressRows,
          fallbackGlobalIndex: firstUnlearned?.globalIndex,
        });
        const next = resume
          ? ALL_MISHNAYOT[resume.globalIndex - 1] ?? null
          : null;
        if (next) {
          map[next.tractate] = {
            ...(map[next.tractate] || { completed: 0, inProgress: false }),
            inProgress: true,
            currentChapter: next.chapter,
            currentMishna: next.mishna,
          };
        }
        setTractateProgress(map);
        setCompletedCount(learnedIndices.size);
        setNextMishna(next);
      } else {
        setUser({ id: 'signed-in' });
        setTractateProgress({});
        setCompletedCount(0);
      }

      setLoading(false);
    }
    load().catch(() => {
      setUser(null);
      setTractateProgress(SAMPLE_PROGRESS);
      setCompletedCount(Object.values(SAMPLE_PROGRESS).reduce((sum, value) => sum + value.completed, 0));
      setLoading(false);
    });
  }, []);

  const overallPct = TOTAL_MISHNAYOT > 0 ? (completedCount / TOTAL_MISHNAYOT) * 100 : 0;
  const continueHref = nextMishna ? buildBrowseHref(nextMishna) : '/browse';

  function toggleSeder(name: string) {
    setExpandedSeders(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <svg className="w-8 h-8 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p style={{ color: 'var(--muted)' }}>Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>Your Progress</h1>
      </div>

      {/* Guest banner — make it unmistakable that sign-in is required to track real progress */}
      {!user && (
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-5 py-4 rounded-xl border"
          style={{ background: 'rgba(201,169,110,0.08)', borderColor: 'rgba(201,169,110,0.3)' }}>
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold-dark)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 11c0-1.105.895-2 2-2s2 .895 2 2m-8 0a4 4 0 118 0v0M5 11h14a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2z" />
            </svg>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>You&apos;re not signed in</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                The numbers below are just a sample. Sign in to track and save your real progress across devices.
              </p>
            </div>
          </div>
          <Link href="/auth/login"
            className="btn-gold px-5 py-2.5 rounded-lg text-sm whitespace-nowrap text-center flex-shrink-0">
            Sign in to track progress
          </Link>
        </div>
      )}

      {/* Overall progress card */}
      <div className="card-gold p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: 'var(--gold-dark)' }}>Overall Progress</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold gradient-gold">{overallPct.toFixed(1)}%</span>
              <span className="text-sm" style={{ color: 'var(--muted)' }}>complete</span>
            </div>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              <span className="font-semibold" style={{ color: 'var(--gold-dark)' }}>{completedCount.toLocaleString()}</span> of{' '}
              <span style={{ color: 'var(--fg)' }}>{TOTAL_MISHNAYOT.toLocaleString()}</span> Mishnayot
            </p>
          </div>

          <div className="space-y-1 text-right">
            {nextMishna && (
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Continue self-study:{' '}
                <span className="font-medium" style={{ color: 'var(--gold-dark)' }}>
                  {nextMishna.tractate} {nextMishna.chapter}:{nextMishna.mishna}
                </span>
              </p>
            )}
            <Link href={continueHref} className="text-xs hover:underline block" style={{ color: 'var(--gold-dark)' }}>
              Continue self-study →
            </Link>
          </div>
        </div>

        <ProgressBar
          value={overallPct}
          total={TOTAL_MISHNAYOT}
          completed={completedCount}
          showLabel={false}
          height="lg"
          color="gold"
          animate
        />

        {/* Mini stats row */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t" style={{ borderColor: 'var(--border)' }}>
          {[
            { label: 'Tractates Started', value: Object.keys(tractateProgress).length },
            { label: 'Tractates Complete', value: MISHNA_STRUCTURE.filter(t => (tractateProgress[t.tractate]?.completed || 0) >= t.totalMishnayot).length },
            { label: 'Remaining', value: (TOTAL_MISHNAYOT - completedCount).toLocaleString() },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold" style={{ color: 'var(--gold-dark)' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Seder breakdown */}
      <div className="space-y-4">
        {SEDARIM.map(seder => {
          const sederCompleted = seder.tractates.reduce(
            (sum, t) => sum + (tractateProgress[t.tractate]?.completed || 0), 0
          );
          const sederPct = seder.totalMishnayot > 0 ? (sederCompleted / seder.totalMishnayot) * 100 : 0;
          const isExpanded = expandedSeders.has(seder.name);

          return (
            <div key={seder.name} className="card overflow-hidden">
              {/* Seder header */}
              <button
                onClick={() => toggleSeder(seder.name)}
                className="w-full flex items-center justify-between p-5 hover:bg-black/5 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold" style={{ color: 'var(--fg)' }}>Seder {seder.name}</h2>
                      <span
                        className="text-sm"
                        style={{ fontFamily: 'var(--font-hebrew)', direction: 'rtl', color: 'var(--gold-dark)' }}
                      >
                        {SEDER_HEBREW[seder.name]}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {seder.tractates.length} tractates · {seder.totalMishnayot.toLocaleString()} mishnayot
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold" style={{ color: 'var(--gold-dark)' }}>{sederPct.toFixed(1)}%</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{sederCompleted}/{seder.totalMishnayot}</p>
                  </div>
                  <div className="w-24 hidden sm:block">
                    <ProgressBar value={sederPct} height="sm" />
                  </div>
                  <span className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} style={{ color: 'var(--muted)' }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                  </span>
                </div>
              </button>

              {/* Tractate grid */}
              {isExpanded && (
                <div className="border-t p-4" style={{ borderColor: 'var(--border)' }}>
                  {/* Mobile progress bar */}
                  <div className="sm:hidden mb-4">
                    <ProgressBar value={sederPct} height="sm" showLabel total={seder.totalMishnayot} completed={sederCompleted} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {seder.tractates.map(t => {
                      const prog = tractateProgress[t.tractate] || { completed: 0, inProgress: false };
                      return (
                        <TractateCard
                          key={t.tractate}
                          tractate={t}
                          completedCount={prog.completed}
                          isCurrentTractate={t.tractate === nextMishna?.tractate}
                          currentChapter={prog.currentChapter}
                          currentMishna={prog.currentMishna}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA */}
      <div className="text-center mt-12 py-8 border-t" style={{ borderColor: 'var(--border)' }}>
        <Link href={continueHref} className="btn-gold px-8 py-4 rounded-xl text-base inline-block">
          Continue Self-Study →
        </Link>
      </div>
    </div>
  );
}
