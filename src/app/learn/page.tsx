'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import AudioPlayer from '@/components/AudioPlayer';
import EpisodeCard from '@/components/EpisodeCard';
import MishnaText from '@/components/MishnaText';
import { ALL_MISHNAYOT, TOTAL_MISHNAYOT, type MishnaReference } from '@/lib/mishna-data';
import { mishnaRangeLabel } from '@/lib/cycle';
import {
  getMishnayotForDay,
  getTodaySummary,
  TOTAL_CYCLE_DAYS,
} from '@/lib/calendar';
import {
  episodeMatchesExactUnits,
  readBestEpisodePlace,
  readLastPlace,
  resolveInitialLesson,
  type ServerLessonResumeRow,
} from '@/lib/lesson-resume';
import { getEpisodeListWindow } from '@/lib/episode-list';
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
  mishna_episode_units: { global_index: number; sequence: number }[];
}

interface ProgressMap {
  [episodeId: string]: {
    completed: boolean;
    positionSeconds: number;
    updatedAt: string | null;
  };
}

interface MishnaProgressEntry {
  global_index: number;
  listened_at: string | null;
  self_studied_at: string | null;
  cycle_completed_at: string | null;
  learned_at: string | null;
  learned_by_listening: boolean;
  learned_by_self_study: boolean;
  learned_by_cycle: boolean;
  learned: boolean;
}

function episodeUnits(episode: Episode): { global_index: number; sequence: number }[] {
  return [...(episode.mishna_episode_units ?? [])].sort((a, b) => a.sequence - b.sequence);
}

function episodeRefs(episode: Episode): MishnaReference[] {
  return episodeUnits(episode)
    .map(unit => ALL_MISHNAYOT[unit.global_index - 1])
    .filter((ref): ref is MishnaReference => Boolean(ref));
}

function episodeBelongsToLesson(episode: Episode, globalIndices: ReadonlySet<number>): boolean {
  const units = episodeUnits(episode);
  return units.length > 0 && units.every(unit => globalIndices.has(unit.global_index));
}

function findExactEpisodeForLesson(episodes: Episode[], globalIndices: ReadonlySet<number>): number {
  return episodes.findIndex(episode => (
    episodeMatchesExactUnits(episodeUnits(episode), globalIndices)
  ));
}

function findEpisodeForLesson(episodes: Episode[], globalIndices: ReadonlySet<number>): number {
  const exactIndex = findExactEpisodeForLesson(episodes, globalIndices);
  if (exactIndex >= 0) return exactIndex;

  // Preserve the two known split recordings, but prefer a complete two-unit
  // match whenever the feed contains one.
  return episodes.findIndex(episode => episodeBelongsToLesson(episode, globalIndices));
}

function learnedSources(progress: MishnaProgressEntry | undefined): string[] {
  if (!progress) return [];
  const sources: string[] = [];
  if (progress.listened_at) sources.push('Listening');
  if (progress.self_studied_at) sources.push('Self-study');
  if (progress.cycle_completed_at) sources.push('My Cycle');
  return sources;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export default function LearnPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [mishnaProgress, setMishnaProgress] = useState<Record<number, MishnaProgressEntry>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [requestedDayWithoutEpisode, setRequestedDayWithoutEpisode] = useState<number | null>(null);
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
  const todayGlobalIndices = new Set(today.mishnayot.map(ref => ref.globalIndex));

  // Load user + episodes + progress
  useEffect(() => {
    async function load() {
      setLoading(true);

      const supabase = getSupabase();

      // Get user
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      // Get episodes with their exact canonical Mishnah mappings.
      const episodesResponse = await fetch('/api/episodes');
      const episodesPayload = episodesResponse.ok
        ? await episodesResponse.json() as { episodes?: Episode[] }
        : { episodes: [] as Episode[] };
      const eps = episodesPayload.episodes ?? [];
      setEpisodes(eps);

      let episodeProgress: ServerLessonResumeRow[] = [];

      // Get progress if logged in
      if (user) {
        const progressResponse = await fetch('/api/progress');
        if (progressResponse.ok) {
          const payload = await progressResponse.json() as {
            episodeProgress?: ServerLessonResumeRow[];
            mishnaProgress?: MishnaProgressEntry[];
          };
          episodeProgress = payload.episodeProgress ?? [];
          const map: ProgressMap = {};
          for (const p of episodeProgress) {
            map[p.episode_id] = {
              completed: p.completed,
              positionSeconds: p.position_seconds,
              updatedAt: p.updated_at,
            };
          }
          setProgress(map);

          const mishnaMap: Record<number, MishnaProgressEntry> = {};
          for (const p of payload.mishnaProgress ?? []) mishnaMap[p.global_index] = p;
          setMishnaProgress(mishnaMap);
        } else {
          setProgressError('We could not load your saved progress. Please refresh and try again.');
        }
      }

      const searchParams = new URLSearchParams(window.location.search);
      const requestedEpisodeId = searchParams.get('episode');
      const requestedDayValue = searchParams.get('day');
      const requestedDay = requestedDayValue && /^\d+$/.test(requestedDayValue)
        ? Number(requestedDayValue)
        : null;
      const requestedDayIndices = requestedDay !== null
        && requestedDay >= 1
        && requestedDay <= TOTAL_CYCLE_DAYS
        ? new Set(getMishnayotForDay(requestedDay).map(ref => ref.globalIndex))
        : null;
      const requestedDayIdx = requestedDayIndices
        ? findExactEpisodeForLesson(eps, requestedDayIndices)
        : -1;
      const todayIdx = findEpisodeForLesson(eps, todayGlobalIndices);
      const fallbackIdx = todayIdx >= 0 ? todayIdx : Math.max(0, eps.length - 1);
      const storage = getBrowserStorage();
      const localLastPlace = readLastPlace(storage)
        ?? readBestEpisodePlace(storage, eps.map(episode => episode.id));
      const selection = resolveInitialLesson({
        episodes: eps,
        explicitEpisodeId: requestedEpisodeId,
        explicitDayMatch: requestedDayIdx >= 0 ? { index: requestedDayIdx } : null,
        explicitDayRequested: requestedDayIndices !== null,
        localLastPlace,
        serverProgress: episodeProgress,
        fallbackIndex: fallbackIdx,
      });
      setRequestedDayWithoutEpisode(
        selection.source === 'explicit-day-unavailable' ? requestedDay : null,
      );
      setCurrentIdx(selection.index);

      setLoading(false);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function getResumeIdx(): number {
    const serverProgress: ServerLessonResumeRow[] = Object.entries(progress).map(
      ([episodeId, entry]) => ({
        episode_id: episodeId,
        position_seconds: entry.positionSeconds,
        completed: entry.completed,
        updated_at: entry.updatedAt,
      }),
    );
    const storage = getBrowserStorage();
    return resolveInitialLesson({
      episodes,
      localLastPlace: readLastPlace(storage)
        ?? readBestEpisodePlace(storage, episodes.map(episode => episode.id)),
      serverProgress,
      fallbackIndex: currentIdx,
    }).index;
  }

  function resume() {
    const idx = getResumeIdx();
    if (idx < 0) return;
    setRequestedDayWithoutEpisode(null);
    setCurrentIdx(idx);
    document.getElementById('player')?.scrollIntoView({ behavior: 'smooth' });
  }

  const reloadProgress = useCallback(async (): Promise<number> => {
    if (!user) return 0;
    const response = await fetch('/api/progress');
    if (!response.ok) throw new Error('progress_refresh_failed');
    const payload = await response.json() as {
      episodeProgress?: ServerLessonResumeRow[];
      mishnaProgress?: MishnaProgressEntry[];
    };
    const episodeMap: ProgressMap = {};
    for (const row of payload.episodeProgress ?? []) {
      episodeMap[row.episode_id] = {
        completed: row.completed,
        positionSeconds: row.position_seconds,
        updatedAt: row.updated_at,
      };
    }
    setProgress(episodeMap);
    const unitMap: Record<number, MishnaProgressEntry> = {};
    for (const row of payload.mishnaProgress ?? []) unitMap[row.global_index] = row;
    setMishnaProgress(unitMap);
    return Object.keys(unitMap).length;
  }, [user]);

  const writeProgress = useCallback(async (
    episodeId: string,
    body:
      | { positionSeconds: number; completed?: boolean }
      | { completed: boolean; positionSeconds?: number },
  ): Promise<boolean> => {
    if (!user) {
      if ('completed' in body) setProgressError('Sign in to save this lesson as listened.');
      return !('completed' in body);
    }

    const previousWrite = progressWriteQueue.current.get(episodeId) ?? Promise.resolve();
    const write = previousWrite.then(async () => {
      try {
        const response = await fetch('/api/progress', {
          method: 'POST',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ episodeId, ...body }),
        });

        if (!response.ok) {
          setProgressError(response.status === 401
            ? 'Your sign-in expired. Please sign in again to save progress.'
            : 'We could not save your progress. Please try again.');
          return false;
        }

        const payload = await response.json() as {
          progress?: {
            completed: boolean;
            position_seconds: number;
            updated_at: string | null;
          } | null;
        };

        if ('completed' in body) {
          await reloadProgress();
        } else if ('positionSeconds' in body) {
          setProgress(prev => ({
            ...prev,
            [episodeId]: {
              completed: payload.progress?.completed ?? prev[episodeId]?.completed ?? false,
              positionSeconds: payload.progress?.position_seconds ?? body.positionSeconds,
              updatedAt: payload.progress?.updated_at ?? prev[episodeId]?.updatedAt ?? null,
            },
          }));
        }
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
  }, [reloadProgress, user]);

  async function handleComplete(positionSeconds: number): Promise<boolean> {
    const ep = episodes[currentIdx];
    if (!ep) return false;
    const saved = await writeProgress(ep.id, { completed: true, positionSeconds });
    if (!saved) return false;

    const newlyLearned = episodeUnits(ep).filter(unit => !mishnaProgress[unit.global_index]).length;
    if (Object.keys(mishnaProgress).length + newlyLearned >= TOTAL_MISHNAYOT) {
      setCelebrateComplete(true);
    }
    return true;
  }

  async function handleRemoveComplete(): Promise<boolean> {
    const ep = episodes[currentIdx];
    if (!ep) return false;
    return writeProgress(ep.id, { completed: false });
  }

  async function handlePositionChange(seconds: number) {
    const ep = episodes[currentIdx];
    if (!ep) return;
    await writeProgress(ep.id, { positionSeconds: seconds });
  }

  const currentEp = episodes[currentIdx];
  const completedCount = Object.keys(mishnaProgress).length;
  const currentUnits = currentEp ? episodeUnits(currentEp) : [];
  const currentRefs = currentEp ? episodeRefs(currentEp) : [];
  const requestedDayRefs = requestedDayWithoutEpisode !== null
    ? getMishnayotForDay(requestedDayWithoutEpisode)
    : [];

  function learnedCountForEpisode(episode: Episode): number {
    return episodeUnits(episode).filter(unit => Boolean(mishnaProgress[unit.global_index])).length;
  }

  function referenceLabelForEpisode(episode: Episode): string {
    const refs = episodeRefs(episode);
    return refs.length ? mishnaRangeLabel(refs) : episode.title;
  }

  useEffect(() => { setProgressError(null); }, [currentEp?.id]);

  // Filter episodes
  const filteredEpisodes = episodes.filter(ep => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return ep.title.toLowerCase().includes(q) ||
           referenceLabelForEpisode(ep).toLowerCase().includes(q);
  });

  const hasEpisodeSearch = searchQuery.trim().length > 0;
  const displayedEpisodes = getEpisodeListWindow(filteredEpisodes, currentEp, {
    hasSearch: hasEpisodeSearch,
    showAll: showAllEpisodes,
  });
  const episodeListHeading = hasEpisodeSearch
    ? `Search Results (${filteredEpisodes.length})`
    : showAllEpisodes
      ? `All Episodes (${filteredEpisodes.length})`
      : 'This Lesson & Up Next';

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
            All {TOTAL_MISHNAYOT.toLocaleString()} Mishnayot learned
          </p>
          <button
            onClick={() => {
              setCelebrateComplete(false);
              setRequestedDayWithoutEpisode(null);
              setCurrentIdx(0);
            }}
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
                <p className="text-sm font-medium" style={{ color: 'var(--fg)' }}>{completedCount} / {TOTAL_MISHNAYOT} learned</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {((completedCount / TOTAL_MISHNAYOT) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                <div
                  className="h-2 bg-gradient-to-r from-gold-700 to-gold-400 rounded-full transition-all"
                  style={{ width: `${(completedCount / TOTAL_MISHNAYOT) * 100}%` }}
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
                  referenceLabel: referenceLabelForEpisode(currentEp),
                }}
                onComplete={handleComplete}
                onRemoveComplete={handleRemoveComplete}
                onPositionChange={handlePositionChange}
                onPrev={() => setCurrentIdx(i => Math.max(0, i - 1))}
                onNext={() => setCurrentIdx(i => Math.min(episodes.length - 1, i + 1))}
                hasPrev={currentIdx > 0}
                hasNext={currentIdx < episodes.length - 1}
                initialPosition={progress[currentEp.id]?.positionSeconds || 0}
                initialPositionUpdatedAt={progress[currentEp.id]?.updatedAt ?? null}
                hasInitialProgress={Boolean(progress[currentEp.id])}
                initialCompleted={progress[currentEp.id]?.completed || false}
                key={currentEp.id}
              />

              {currentUnits.length > 0 && (
                <section className="card p-4 sm:p-5" aria-labelledby="this-lesson-heading">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 id="this-lesson-heading" className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                      This lesson
                    </h2>
                    <span className="text-xs font-medium" style={{ color: 'var(--muted)' }}>
                      {learnedCountForEpisode(currentEp)}/{currentUnits.length} learned
                    </span>
                  </div>
                  <ul className="space-y-2">
                    {currentUnits.map(unit => {
                      const ref = ALL_MISHNAYOT[unit.global_index - 1];
                      const sources = learnedSources(mishnaProgress[unit.global_index]);
                      if (!ref) return null;
                      return (
                        <li key={unit.global_index} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border px-3 py-2"
                          style={{ borderColor: sources.length ? '#A7F3D0' : 'var(--border)', background: sources.length ? '#F0FDF4' : 'var(--bg)' }}>
                          <span className="text-sm font-semibold" style={{ color: 'var(--fg)' }}>
                            {ref.tractate} {ref.chapter}:{ref.mishna}
                          </span>
                          <span className="text-right text-xs" style={{ color: sources.length ? '#065F46' : 'var(--muted)' }}>
                            {sources.length ? `Learned · ${sources.join(' + ')}` : 'Not learned'}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}

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
              {currentUnits.length > 0 ? <MishnaText indices={currentUnits.map(unit => unit.global_index)} /> : null}

              {/* Episode info */}
              <div className="card p-5">
                <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--fg)' }}>About this lesson</h3>
                <p className="text-xs leading-relaxed" style={{ color: 'var(--muted)' }}>
                  <span className="font-medium" style={{ color: 'var(--gold-dark)' }}>{mishnaRangeLabel(currentRefs)}</span>
                  {currentUnits.length > 0 && ` · ${currentUnits.length} ${currentUnits.length === 1 ? 'Mishnah' : 'Mishnayot'}`}
                </p>
                {currentEp.mishna_day_number && (
                  <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                    Mishna Yomit Day {currentEp.mishna_day_number}
                    {episodeBelongsToLesson(currentEp, todayGlobalIndices) && (
                      <span className="ml-2" style={{ color: 'var(--gold-dark)' }}>· Today&apos;s lesson</span>
                    )}
                  </p>
                )}
              </div>
            </>
          ) : requestedDayWithoutEpisode !== null ? (
            <>
              <div className="card p-6">
                <h2 className="text-lg font-semibold mb-2" style={{ color: 'var(--fg)' }}>
                  Audio recording not available yet
                </h2>
                <p className="text-sm" style={{ color: 'var(--muted)' }}>
                  Cycle Day {requestedDayWithoutEpisode}: {mishnaRangeLabel(requestedDayRefs)}.
                  You can still learn both Mishnayot below.
                </p>
              </div>
              <MishnaText indices={requestedDayRefs.map(ref => ref.globalIndex)} />
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
              {episodeListHeading}
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
                  referenceLabel={referenceLabelForEpisode(ep)}
                  learnedCount={learnedCountForEpisode(ep)}
                  totalMishnayot={episodeUnits(ep).length}
                  isActive={realIdx === currentIdx}
                  isToday={episodeBelongsToLesson(ep, todayGlobalIndices)}
                  onClick={() => {
                    setRequestedDayWithoutEpisode(null);
                    setCurrentIdx(realIdx);
                    setShowAllEpisodes(false);
                  }}
                />
              );
            })}

            {!showAllEpisodes && !hasEpisodeSearch && filteredEpisodes.length > displayedEpisodes.length && (
              <button
                onClick={() => setShowAllEpisodes(true)}
                className="w-full py-3 text-sm border rounded-xl transition-colors cursor-pointer"
                style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}
                onMouseOver={e => { e.currentTarget.style.color = 'var(--navy)'; e.currentTarget.style.borderColor = 'var(--gold)'; }}
                onMouseOut={e => { e.currentTarget.style.color = 'var(--muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                Browse all {filteredEpisodes.length} episodes
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
