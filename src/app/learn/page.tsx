'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import AudioPlayer from '@/components/AudioPlayer';
import EpisodeCard from '@/components/EpisodeCard';
import { getTodaySummary, getMishnaPairLabel } from '@/lib/calendar';
import Link from 'next/link';

interface Episode {
  id: string;
  title: string;
  audio_url: string;
  duration_seconds: number | null;
  published_at: string;
  tractate: string | null;
  chapter_from: number | null;
  mishna_from: number | null;
  chapter_to: number | null;
  mishna_to: number | null;
  mishna_day_number: number | null;
}

interface ProgressMap {
  [episodeId: string]: {
    completed: boolean;
    positionSeconds: number;
  };
}

export default function LearnPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [celebrateComplete, setCelebrateComplete] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Lazy-initialize supabase client only on the browser
  const supabaseRef = useRef<SupabaseClient | null>(null);
  function getSupabase() {
    if (!supabaseRef.current) {
      const { createClient } = require('@/lib/supabase/client');
      supabaseRef.current = createClient();
    }
    return supabaseRef.current!;
  }

  const today = getTodaySummary();

  // Load user + episodes + progress
  useEffect(() => {
    async function load() {
      setLoading(true);

      const supabase = getSupabase();

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Get episodes
      const { data: eps } = await supabase
        .from('mishna_episodes')
        .select('*')
        .order('published_at', { ascending: true });

      if (eps) {
        setEpisodes(eps);

        // Find today's episode
        const todayIdx = eps.findIndex(e => e.mishna_day_number === today.dayNumber);
        if (todayIdx >= 0) {
          setCurrentIdx(todayIdx);
        }
      }

      // Get progress if logged in
      if (user) {
        const { data: prog } = await getSupabase()
          .from('mishna_progress')
          .select('episode_id, completed, position_seconds')
          .eq('user_id', user.id);

        if (prog) {
          const map: ProgressMap = {};
          for (const p of prog) {
            map[p.episode_id] = { completed: p.completed, positionSeconds: p.position_seconds };
          }
          setProgress(map);
        }
      }

      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Find first uncompleted episode (for resume)
  function getResumeIdx(): number {
    for (let i = 0; i < episodes.length; i++) {
      const p = progress[episodes[i].id];
      if (!p?.completed) return i;
    }
    return 0;
  }

  function resume() {
    const idx = getResumeIdx();
    setCurrentIdx(idx);
    document.getElementById('player')?.scrollIntoView({ behavior: 'smooth' });
  }

  const saveProgress = useCallback(async (episodeId: string, completed: boolean, positionSeconds: number) => {
    if (!user) return;

    await fetch('/api/progress', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episodeId, completed, positionSeconds }),
    });

    setProgress(prev => ({
      ...prev,
      [episodeId]: { completed, positionSeconds },
    }));
  }, [user]);

  async function handleComplete() {
    const ep = episodes[currentIdx];
    if (!ep) return;
    await saveProgress(ep.id, true, ep.duration_seconds || 0);

    // Check if all done
    const completedIds = new Set(Object.entries(progress).filter(([, v]) => v.completed).map(([k]) => k));
    completedIds.add(ep.id);
    if (completedIds.size >= episodes.length && episodes.length > 0) {
      setCelebrateComplete(true);
    }
  }

  async function handlePositionChange(seconds: number) {
    const ep = episodes[currentIdx];
    if (!ep) return;
    // Debounced save
    await saveProgress(ep.id, progress[ep.id]?.completed || false, seconds);
  }

  const currentEp = episodes[currentIdx];
  const completedCount = Object.values(progress).filter(p => p.completed).length;
  const totalEpisodes = episodes.length;

  // Filter episodes
  const filteredEpisodes = episodes.filter(ep => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ep.title.toLowerCase().includes(q) ||
           (ep.tractate || '').toLowerCase().includes(q);
  });

  const displayedEpisodes = showAllEpisodes ? filteredEpisodes : filteredEpisodes.slice(0, 20);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-pulse">📖</div>
          <p className="text-slate-500">Loading lessons...</p>
        </div>
      </div>
    );
  }

  // Completion celebration screen
  if (celebrateComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <div className="text-8xl mb-6">🎉</div>
          <h1 className="text-4xl font-serif text-gold-400 mb-4 text-glow-gold">
            Mazal Tov!
          </h1>
          <p
            className="text-3xl text-gold-300 mb-4"
            style={{ fontFamily: 'serif', direction: 'rtl' }}
          >
            סיים את כל הש&quot;ס
          </p>
          <p className="text-lg text-slate-300 mb-3">
            You have completed the entire Mishnah!
          </p>
          <p className="text-slate-500 mb-8">
            All {totalEpisodes.toLocaleString()} lessons · {completedCount.toLocaleString()} Mishnayot complete
          </p>
          <button
            onClick={() => { setCelebrateComplete(false); setCurrentIdx(0); }}
            className="btn-gold px-8 py-4 rounded-xl text-base"
          >
            Start Again from the Beginning
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-serif text-parchment-50 mb-1">Learn</h1>
            <p className="text-slate-500 text-sm">
              Today: <span className="text-gold-400">{today.label}</span>
              <span className="text-slate-600 mx-2">·</span>
              Day {today.dayNumber}
            </p>
          </div>

          {/* Progress summary */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm text-parchment-100 font-medium">{completedCount} / {totalEpisodes} complete</p>
                <p className="text-xs text-slate-500">
                  {totalEpisodes > 0 ? ((completedCount / totalEpisodes) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
              <div className="w-24 h-2 bg-navy-700 rounded-full overflow-hidden">
                <div
                  className="h-2 bg-gradient-to-r from-gold-700 to-gold-400 rounded-full transition-all"
                  style={{ width: `${totalEpisodes > 0 ? (completedCount / totalEpisodes) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Resume + Today buttons */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            id="resume"
            onClick={resume}
            className="btn-gold px-5 py-2.5 rounded-lg text-sm"
          >
            ↩ Pick Up Where I Left Off
          </button>
          <button
            onClick={() => {
              const idx = episodes.findIndex(e => e.mishna_day_number === today.dayNumber);
              if (idx >= 0) setCurrentIdx(idx);
            }}
            className="btn-ghost px-5 py-2.5 rounded-lg text-sm"
          >
            📅 Jump to Today
          </button>
          {!user && (
            <Link
              href="/auth/login"
              className="btn-ghost px-5 py-2.5 rounded-lg text-sm"
            >
              Sign In to Track Progress
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Player — left 3/5 */}
        <div className="lg:col-span-3 space-y-4" id="player">
          {currentEp ? (
            <>
              <AudioPlayer
                episode={{
                  id: currentEp.id,
                  title: currentEp.title,
                  audioUrl: currentEp.audio_url,
                  durationSeconds: currentEp.duration_seconds,
                  tractate: currentEp.tractate,
                  chapterFrom: currentEp.chapter_from,
                  mishnaFrom: currentEp.mishna_from,
                  chapterTo: currentEp.chapter_to,
                  mishnaTo: currentEp.mishna_to,
                }}
                onComplete={handleComplete}
                onPositionChange={handlePositionChange}
                onPrev={() => setCurrentIdx(i => Math.max(0, i - 1))}
                onNext={() => setCurrentIdx(i => Math.min(episodes.length - 1, i + 1))}
                hasPrev={currentIdx > 0}
                hasNext={currentIdx < episodes.length - 1}
                initialPosition={progress[currentEp.id]?.positionSeconds || 0}
                key={currentEp.id}
              />

              {/* No auth notice */}
              {!user && (
                <div className="bg-navy-800/60 border border-navy-600 rounded-xl p-4 text-sm text-slate-400">
                  <Link href="/auth/login" className="text-gold-400 hover:underline">Sign in</Link> to save your progress and sync across devices.
                </div>
              )}

              {/* Episode info */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold text-parchment-100 mb-2">About this lesson</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {currentEp.tractate && (
                    <>
                      <span className="text-gold-400 font-medium">Tractate {currentEp.tractate}</span>
                      {currentEp.chapter_from && ` · Chapter ${currentEp.chapter_from}`}
                      {currentEp.mishna_from && `, Mishna ${currentEp.mishna_from}`}
                      {currentEp.mishna_to && currentEp.mishna_to !== currentEp.mishna_from && ` – ${currentEp.mishna_to}`}
                    </>
                  )}
                </p>
                {currentEp.mishna_day_number && (
                  <p className="text-xs text-slate-600 mt-1">
                    Mishna Yomit Day {currentEp.mishna_day_number}
                    {currentEp.mishna_day_number === today.dayNumber && (
                      <span className="text-gold-500 ml-2">· Today&apos;s lesson</span>
                    )}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="card p-12 text-center">
              <p className="text-slate-400 mb-4">No episodes loaded yet.</p>
              <p className="text-slate-600 text-sm">
                Run <code className="bg-navy-700 px-2 py-0.5 rounded text-xs">/api/sync-rss</code> to sync episodes from the podcast feed.
              </p>
            </div>
          )}
        </div>

        {/* Episode list — right 2/5 */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">
              All Episodes {episodes.length > 0 && `(${episodes.length})`}
            </h3>
            <Link href="/progress" className="text-xs text-gold-500 hover:text-gold-400">
              View Progress →
            </Link>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search tractate or episode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-navy-800 border border-navy-600 rounded-lg px-3 py-2 text-sm text-parchment-100 placeholder-slate-600 focus:outline-none focus:border-gold-500 transition-colors"
          />

          {/* Episode list */}
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {displayedEpisodes.map((ep, idx) => {
              const realIdx = episodes.indexOf(ep);
              return (
                <EpisodeCard
                  key={ep.id}
                  episode={{
                    id: ep.id,
                    title: ep.title,
                    tractate: ep.tractate,
                    chapterFrom: ep.chapter_from,
                    mishnaFrom: ep.mishna_from,
                    chapterTo: ep.chapter_to,
                    mishnaTo: ep.mishna_to,
                    durationSeconds: ep.duration_seconds,
                    publishedAt: ep.published_at,
                    mishnaDayNumber: ep.mishna_day_number,
                  }}
                  isActive={realIdx === currentIdx}
                  isCompleted={progress[ep.id]?.completed || false}
                  isToday={ep.mishna_day_number === today.dayNumber}
                  onClick={() => setCurrentIdx(realIdx)}
                />
              );
            })}

            {!showAllEpisodes && filteredEpisodes.length > 20 && (
              <button
                onClick={() => setShowAllEpisodes(true)}
                className="w-full py-3 text-sm text-slate-500 hover:text-slate-300 border border-navy-700 hover:border-navy-500 rounded-xl transition-colors"
              >
                Show all {filteredEpisodes.length} episodes
              </button>
            )}

            {episodes.length === 0 && (
              <p className="text-slate-500 text-sm text-center py-8">
                No episodes yet. Sync from RSS to get started.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
