import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  episodeSyncReason,
  isPotentialMishnaLesson,
  resolveEpisodeMapping,
  type DesiredEpisodeSyncState,
  type EpisodeSyncReason,
  type StoredEpisodeSyncState,
} from '@/lib/episode-mapping';
import { fetchRSSFeed, type ParsedEpisode } from '@/lib/rss';
import { getDayNumber } from '@/lib/calendar';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';
export const maxDuration = 60;

const EXISTING_PAGE_SIZE = 1000;
const SYNC_CONCURRENCY = 10;
const MAX_SYNC_OPERATIONS = 100;

const EXISTING_EPISODE_SELECT = `
  id,
  guid,
  title,
  description,
  audio_url,
  duration_seconds,
  published_at,
  tractate,
  chapter_from,
  mishna_from,
  chapter_to,
  mishna_to,
  mishna_day_number,
  mishna_episode_units (
    global_index,
    sequence,
    mapping_source
  )
`;

interface SyncCandidate {
  episode: ParsedEpisode;
  desired: DesiredEpisodeSyncState;
  reason: EpisodeSyncReason;
}

interface StoredEpisodeRow extends StoredEpisodeSyncState {
  id: string;
  guid: string;
}

interface SyncFailure {
  guid: string;
  title: string;
  error: string;
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createServiceClient();
    const [episodes, storedEpisodes] = await Promise.all([
      fetchRSSFeed(),
      fetchStoredEpisodes(supabase),
    ]);
    const storedByGuid = new Map(storedEpisodes.map((episode) => [episode.guid, episode]));
    const candidates: SyncCandidate[] = [];
    const unresolved: SyncFailure[] = [];
    const failures: SyncFailure[] = [];
    let skipped = 0;

    for (const episode of episodes) {
      const mapping = resolveEpisodeMapping(episode.title);
      if (!mapping.ok) {
        if (isPotentialMishnaLesson(episode.title)) {
          unresolved.push({
            guid: episode.guid,
            title: episode.title,
            error: mapping.reason,
          });
        } else {
          skipped++;
        }
        continue;
      }

      const first = mapping.units[0];
      const last = mapping.units[mapping.units.length - 1];
      const desired: DesiredEpisodeSyncState = {
        title: episode.title,
        description: episode.description,
        audioUrl: episode.audioUrl,
        durationSeconds: episode.durationSeconds,
        publishedAt: episode.publishedAt.toISOString(),
        tractate: first.tractate,
        chapterFrom: first.chapter,
        mishnaFrom: first.mishna,
        chapterTo: last.chapter,
        mishnaTo: last.mishna,
        mishnaDayNumber: getDayNumber(episode.publishedAt),
        globalIndices: mapping.globalIndices,
      };
      const reason = episodeSyncReason(storedByGuid.get(episode.guid), desired);
      if (reason) candidates.push({ episode, desired, reason });
    }

    candidates.sort((left, right) => {
      const priority = syncPriority(left.reason) - syncPriority(right.reason);
      return priority || right.episode.publishedAt.getTime() - left.episode.publishedAt.getTime();
    });
    const deferred = candidates.slice(MAX_SYNC_OPERATIONS);
    const planned = candidates.slice(0, MAX_SYNC_OPERATIONS);
    const resolvedLessonCount = episodes.length - skipped - unresolved.length;
    const unchanged = resolvedLessonCount - candidates.length;

    let synced = 0;
    let inserted = 0;
    let repaired = 0;
    for (let offset = 0; offset < planned.length; offset += SYNC_CONCURRENCY) {
      const batch = planned.slice(offset, offset + SYNC_CONCURRENCY);
      const results = await Promise.all(
        batch.map(async ({ episode, desired, reason }) => {
          const { error } = await supabase.rpc('sync_mishna_episode', {
            p_guid: episode.guid,
            p_title: desired.title,
            p_description: desired.description,
            p_audio_url: desired.audioUrl,
            p_duration_seconds: desired.durationSeconds,
            p_published_at: desired.publishedAt,
            p_tractate: desired.tractate,
            p_chapter_from: desired.chapterFrom,
            p_mishna_from: desired.mishnaFrom,
            p_chapter_to: desired.chapterTo,
            p_mishna_to: desired.mishnaTo,
            p_mishna_day_number: desired.mishnaDayNumber,
            p_global_indices: desired.globalIndices,
          });

          if (error) {
            return {
              failure: {
                guid: episode.guid,
                title: episode.title,
                error: error.message,
              } satisfies SyncFailure,
              reason,
            };
          }

          return { failure: null, reason };
        })
      );

      for (const result of results) {
        if (result.failure) failures.push(result.failure);
        else {
          synced++;
          if (result.reason === 'missing_episode') inserted++;
          else repaired++;
        }
      }
    }

    // Remove only old non-Mishnah rows. A lesson with an unresolved mapping is
    // never sent to the RPC and therefore can never be accepted as mapped.
    const { error: cleanupError } = await supabase
      .from('mishna_episodes')
      .delete()
      .is('tractate', null);
    if (cleanupError) {
      failures.push({
        guid: 'cleanup:null-tractate',
        title: 'Null-tractate cleanup',
        error: cleanupError.message,
      });
    }

    if (unresolved.length) console.error('Unresolved RSS Mishnah lessons:', unresolved);
    if (failures.length) console.error('RSS sync failures:', failures.slice(0, 25));

    const success = unresolved.length === 0 && failures.length === 0 && deferred.length === 0;
    return NextResponse.json(
      {
        success,
        total: episodes.length,
        resolvedLessons: resolvedLessonCount,
        existingEpisodes: storedEpisodes.length,
        unchanged,
        candidates: candidates.length,
        planned: planned.length,
        deferred: deferred.length,
        synced,
        inserted,
        repaired,
        skipped,
        unresolvedCount: unresolved.length,
        unresolved,
        errors: failures.length,
        errorDetails: failures.slice(0, 50),
      },
      { status: success ? 200 : deferred.length ? 503 : 500 }
    );
  } catch (error) {
    console.error('RSS sync error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}

async function fetchStoredEpisodes(
  supabase: ReturnType<typeof createServiceClient>
): Promise<StoredEpisodeRow[]> {
  const episodes: StoredEpisodeRow[] = [];

  for (let offset = 0; ; offset += EXISTING_PAGE_SIZE) {
    const { data, error } = await supabase
      .from('mishna_episodes')
      .select(EXISTING_EPISODE_SELECT)
      .order('guid', { ascending: true })
      .range(offset, offset + EXISTING_PAGE_SIZE - 1);
    if (error) throw error;

    const page = (data ?? []) as StoredEpisodeRow[];
    episodes.push(
      ...page.map((episode) => ({
        ...episode,
        mishna_episode_units: episode.mishna_episode_units ?? [],
      }))
    );
    if (page.length < EXISTING_PAGE_SIZE) break;
  }

  return episodes;
}

function syncPriority(reason: EpisodeSyncReason): number {
  if (reason === 'missing_episode') return 0;
  if (reason === 'mapping_changed') return 1;
  return 2;
}
