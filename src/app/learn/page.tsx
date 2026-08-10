'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import AudioPlayer from '@/components/AudioPlayer';
import EpisodeCard from '@/components/EpisodeCard';
import MishnaText from '@/components/MishnaText';
import {
  getTodaySummary,
} from '@/lib/calendar';
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
  const [progressError, setProgressError] = useState<string | null>(null);
  const progressWriteQueue = useRef(new Map<string, Promise<void>>());

  // Lazy-initialize supabase client only on the browser
  const supabaseRef = useRef<SupabaseClient | null>(null);
  function getSupabase() {
    if (!supabaseRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
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

        // A Browse "Listen" link names the exact episode to open. Honor that
        // before falling back to today's lesson or the newest available one.
        const requestedEpisodeId = new URLSearchParams(window.location.search).get('episode');
        const requestedIdx = requestedEpisodeId
          ? eps.findIndex(e => e.id === requestedEpisodeId)
          : -1;
        const todayIdx = eps.findIndex(e => e.mishna_day_number === today.dayNumber);
        const fallbackIdx = todayIdx >= 0 ? todayIdx : Math.max(0, eps.length - 1);
        setCurrentIdx(requestedIdx >= 0 ? requestedIdx : fallbackIdx);
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

  const saveProgress = useCallback(async (episodeId: string, completed: boolean, positionSeconds: number): Promise<boolean> => {
    if (!user) return true;

    const previousWrite = progressWriteQueue.current.get(episodeId) ?? Promise.resolve();
    const write = previousWrite.then(async () => {
      try {
        const response = await fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episodeId, completed, positionSeconds }),
        });

        if (!response.ok) {
          setProgressError(response.status === 401
            ? 'Your sign-in expired. Please sign in again to save progress.'
            : 'We could not save your progress. Please try again.');
          return false;
        }

        setProgress(prev => ({
          ...prev,
          [episodeId]: { completed, positionSeconds },
        }));
        setProgressError(null);
        return true;
      } catch {
        setProgressError('We could not save your progress. Check your connection and try again.');
        return false;
      }
    });

    const queueTail = write.then(() => undefined, () => undefined);
    progressWriteQueue.current.set(episodeId, queueTail);
    void queueTail.then(() => {
      if (progressWriteQueue.current.get(episodeId) === queueTail) {
        progressWriteQueue.current.delete(episodeId);
      }
    });

    return write;
  }, [user]);

  async function handleComplete(positionSeconds: number): Promise<boolean> {
    const ep = episodes[currentIdx];
    if (!ep) return false;
    const saved = await saveProgress(ep.id, true, ep.duration_seconds || positionSeconds);
    if (!saved) return false;

    // Check if all done
    const completedIds = new Set(Object.entries(progress).filter(([, v]) => v.completed).map(([k]) => k));
    completedIds.add(ep.id);
    if (completedIds.size >= episodes.length && episodes.length > 0) {
      setCelebrateComplete(true);
    }
    return true;
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

  useEffect(() => { setProgressError(null); }, [currentEp?.id]);

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
          <svg className="w-8 h-8 animate-spin mx-auto mb-4" fill="none" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p style={{ color: 'var(--muted)' }}>Loading lessons...</p>
        </div>
      </div>
    );
  }

  // Completion celebration screen
  if (celebrateComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-lg">
          <div className="w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ background: 'rgba(201,169,110,0.12)', border: '3px solid rgba(201,169,110,0.4)' }}>
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gold)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h1 className="text-4xl mb-4" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--gold-dark)' }}>
            Mazal Tov!
          </h1>
          <p
            className="text-3xl mb-4"
            style={{ fontFamily: 'var(--font-hebrew)', direction: 'rtl', color: 'var(--gold-dark)' }}
          >
            סיים את כל הש&quot;ס
          </p>
          <p className="text-lg mb-3" style={{ color: 'var(--fg)' }}>
            You have completed the entire Mishnah!
          </p>
          <p className="mb-8" style={{ color: 'var(--muted)' }}>
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
            <h1 className="text-2xl mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>Learn</h1>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Today: <span style={{ color: 'var(--gold-dark)' }}>{today.label}</span>
              <span className="mx-2">·</span>
              Day {today.dayNumber}
            </p>
          </div>

          {/* Progress summary */}
          {user && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{completedCount} / {totalEpisodes} complete</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {totalEpisodes > 0 ? ((completedCount / totalEpisodes) * 100).toFixed(1) : '0.0'}%
                </p>
              </div>
              <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                <div
                  className="h-2 bg-gradient-to-r from-gold-700 to-gold-400 rounded-full transition-all"
                  style={{ width: `${totalEpisodes > 0 ? (completedCount / totalEpisodes) * 100 : 0}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Resume + sign-in actions */}
        <div className="flex flex-wrap gap-3 mt-4">
          <button
            id="resume"
            onClick={resume}
            className="btn-gold px-5 py-2.5 rounded-lg text-sm"
          >
            Pick Up Where I Left Off
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
                initialCompleted={progress[currentEp.id]?.completed || false}
                key={currentEp.id}
              />

              {progressError && (
                <div role="alert" className="rounded-xl border px-4 py-3 text-sm" style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
                  {progressError}
                </div>
              )}

              {/* No auth notice */}
              {!user && (
                <div className="rounded-xl p-4 text-sm border" style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--muted)' }}>
                  <Link href="/auth/login" className="hover:underline font-medium" style={{ color: 'var(--gold-dark)' }}>Sign in</Link> to save your progress and sync across devices.
                </div>
              )}

              {/* Read-along Mishna text (Hebrew + English) for this lesson */}
              {currentEp.mishna_day_number != null ? (
                <MishnaText day={currentEp.mishna_day_number} />
              ) : currentEp.tractate && currentEp.chapter_from != null && currentEp.mishna_from != null ? (
                <MishnaText single={{ tractate: currentEp.tractate, chapter: currentEp.chapter_from, mishna: currentEp.mishna_from }} />
              ) : null}

              {/* Episode info */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--fg)' }}>About this lesson</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                  {currentEp.tractate && (
                    <>
                      <span className="font-medium" style={{ color: 'var(--gold-dark)' }}>Tractate {currentEp.tractate}</span>
                      {currentEp.chapter_from && ` · Chapter ${currentEp.chapter_from}`}
                      {currentEp.mishna_from && `, Mishna ${currentEp.mishna_from}`}
                      {currentEp.mishna_to && currentEp.mishna_to !== currentEp.mishna_from && ` – ${currentEp.mishna_to}`}
                    </>
                  )}
                </p>
                {currentEp.mishna_day_number && (
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    Mishna Yomit Day {currentEp.mishna_day_number}
                    {currentEp.mishna_day_number === today.dayNumber && (
                      <span className="ml-2" style={{ color: 'var(--gold-dark)' }}>· Today&apos;s lesson</span>
                    )}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className="card p-12 text-center">
              <p className="mb-4" style={{ color: 'var(--muted)' }}>No episodes loaded yet.</p>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>
                Run <code className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(0,0,0,0.06)', color: 'var(--fg)' }}>/api/sync-rss</code> to sync episodes from the podcast feed.
              </p>
            </div>
          )}
        </div>

        {/* Episode list — right 2/5 */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              All Episodes {episodes.length > 0 && `(${episodes.length})`}
            </h3>
            <Link href="/progress" className="text-xs hover:underline" style={{ color: 'var(--gold-dark)' }}>
              View Progress →
            </Link>
          </div>

          {/* Search */}
          <input
            type="text"
            placeholder="Search tractate or episode..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg px-3 py-2 text-sm border outline-none transition-colors"
            style={{ background: 'var(--surface)', borderColor: 'var(--border)', color: 'var(--fg)' }}
          />

          {/* Episode list */}
          <div className="space-y-1.5 max-h-[600px] overflow-y-auto pr-1">
            {displayedEpisodes.map((ep, _idx) => {
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
                className="w-full py-3 text-sm border rounded-xl transition-colors cursor-pointer"
                style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}
                onMouseOver={e => { e.currentTarget.style.color = 'var(--navy)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
                onMouseOut={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                Show all {filteredEpisodes.length} episodes
              </button>
            )}

            {episodes.length === 0 && (
              <p className="text-sm text-center py-8" style={{ color: 'var(--muted)' }}>
                No episodes yet. Sync from RSS to get started.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
