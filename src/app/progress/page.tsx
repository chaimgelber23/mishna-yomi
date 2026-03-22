'use client';

import { useState, useEffect, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import ProgressBar from '@/components/ProgressBar';
import TractateCard from '@/components/TractateCard';
import { SEDARIM, MISHNA_STRUCTURE, TOTAL_MISHNAYOT, SEDER_HEBREW } from '@/lib/mishna-data';
import { projectCompletionDate, formatDate } from '@/lib/calendar';
import Link from 'next/link';

interface ProgressData {
  episode_id: string;
  completed: boolean;
  mishna_episodes: {
    tractate: string | null;
    chapter_from: number | null;
    mishna_from: number | null;
    mishna_day_number: number | null;
  } | null;
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

export default function ProgressPage() {
  const [user, setUser] = useState<{ id: string } | null>(null);
  const [tractateProgress, setTractateProgress] = useState<TractateProgress>({});
  const [completedCount, setCompletedCount] = useState(0);
  const [currentTractate, setCurrentTractate] = useState('');
  const [loading, setLoading] = useState(true);
  const [expandedSeders, setExpandedSeders] = useState<Set<string>>(new Set(['Zeraim', 'Moed']));

  const supabaseRef = useRef<SupabaseClient | null>(null);
  function getSupabase(): SupabaseClient {
    if (!supabaseRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createClient } = require('@/lib/supabase/client');
      supabaseRef.current = createClient();
    }
    return supabaseRef.current!;
  }

  useEffect(() => {
    async function load() {
      const supabase = getSupabase();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (!user) {
        setTractateProgress(SAMPLE_PROGRESS);
        setCompletedCount(Object.values(SAMPLE_PROGRESS).reduce((sum, v) => sum + v.completed, 0));
        setLoading(false);
        return;
      }

      // Load progress
      const { data } = await supabase
        .from('mishna_progress')
        .select(`
          episode_id, completed,
          mishna_episodes ( tractate, chapter_from, mishna_from, mishna_day_number )
        `)
        .eq('user_id', user.id);

      if (data) {
        const map: TractateProgress = {};
        let total = 0;
        let latestDayNumber = 0;
        let latestTractate = '';
        let latestChapter = 0;
        let latestMishna = 0;

        for (const row of (data as unknown as ProgressData[])) {
          const ep = row.mishna_episodes;
          if (!ep?.tractate) continue;

          const t = ep.tractate;
          if (!map[t]) map[t] = { completed: 0, inProgress: false };

          if (row.completed) {
            map[t].completed++;
            total++;
            if ((ep.mishna_day_number || 0) > latestDayNumber) {
              latestDayNumber = ep.mishna_day_number || 0;
              latestTractate = t;
              latestChapter = ep.chapter_from || 0;
              latestMishna = ep.mishna_from || 0;
            }
          } else if ((ep.mishna_day_number || 0) > 0) {
            map[t].inProgress = true;
          }
        }

        setTractateProgress(map);
        setCompletedCount(total);
        setCurrentTractate(latestTractate);
        if (latestTractate) {
          map[latestTractate] = {
            ...(map[latestTractate] || { completed: 0, inProgress: false }),
            inProgress: true,
            currentChapter: latestChapter,
            currentMishna: latestMishna,
          };
        }
      }

      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const overallPct = TOTAL_MISHNAYOT > 0 ? (completedCount / TOTAL_MISHNAYOT) * 100 : 0;
  const projectedDate = projectCompletionDate(completedCount);

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
          <div className="text-4xl mb-4 animate-pulse">📊</div>
          <p className="text-slate-500">Loading your progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-serif text-parchment-50 mb-1">Your Progress</h1>
        {!user && (
          <p className="text-slate-500 text-sm">
            Showing a sample progress sheet.{' '}
            <Link href="/auth/login" className="text-gold-400 hover:underline">Sign in</Link> to track your real progress.
          </p>
        )}
      </div>

      {/* Overall progress card */}
      <div className="card-gold p-6 sm:p-8 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-6">
          <div>
            <p className="text-xs text-gold-500 uppercase tracking-widest mb-2">Overall Progress</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold gradient-text-gold">{overallPct.toFixed(1)}%</span>
              <span className="text-slate-400 text-sm">complete</span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              <span className="text-gold-300 font-semibold">{completedCount.toLocaleString()}</span> of{' '}
              <span className="text-parchment-100">{TOTAL_MISHNAYOT.toLocaleString()}</span> Mishnayot
            </p>
          </div>

          <div className="space-y-1 text-right">
            {currentTractate && (
              <p className="text-sm text-slate-400">
                Currently in:{' '}
                <span className="text-gold-400 font-medium">{currentTractate}</span>
              </p>
            )}
            {projectedDate && (
              <p className="text-sm text-slate-500">
                Projected finish: <span className="text-parchment-100">{formatDate(projectedDate)}</span>
              </p>
            )}
            <Link href="/learn" className="text-xs text-gold-500 hover:underline block">
              Continue learning →
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
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-navy-600">
          {[
            { label: 'Tractates Started', value: Object.keys(tractateProgress).length },
            { label: 'Tractates Complete', value: MISHNA_STRUCTURE.filter(t => (tractateProgress[t.tractate]?.completed || 0) >= t.totalMishnayot).length },
            { label: 'Remaining', value: (TOTAL_MISHNAYOT - completedCount).toLocaleString() },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-gold-400">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
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
                className="w-full flex items-center justify-between p-5 hover:bg-navy-700/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <h2 className="text-lg font-semibold text-parchment-50">Seder {seder.name}</h2>
                      <span
                        className="text-sm text-gold-400"
                        style={{ fontFamily: 'serif', direction: 'rtl' }}
                      >
                        {SEDER_HEBREW[seder.name]}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {seder.tractates.length} tractates · {seder.totalMishnayot.toLocaleString()} mishnayot
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gold-400">{sederPct.toFixed(1)}%</p>
                    <p className="text-xs text-slate-500">{sederCompleted}/{seder.totalMishnayot}</p>
                  </div>
                  <div className="w-24 hidden sm:block">
                    <ProgressBar value={sederPct} height="sm" />
                  </div>
                  <span className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>

              {/* Tractate grid */}
              {isExpanded && (
                <div className="border-t border-navy-700 p-4">
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
                          isCurrentTractate={t.tractate === currentTractate}
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
      <div className="text-center mt-12 py-8 border-t border-navy-800">
        <Link href="/learn" className="btn-gold px-8 py-4 rounded-xl text-base inline-block">
          Continue Learning →
        </Link>
      </div>
    </div>
  );
}
