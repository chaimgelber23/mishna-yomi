import { TOTAL_MISHNAYOT } from './mishna-data';

export interface EpisodeMishnaMapping {
  global_index: number;
  sequence: number;
}

export interface EpisodeProgressRow {
  id: string;
  episode_id: string;
  completed: boolean;
  position_seconds: number;
  completed_at: string | null;
  mishna_episodes: {
    id: string;
    title: string;
    tractate: string | null;
    chapter_from: number | null;
    mishna_from: number | null;
    chapter_to: number | null;
    mishna_to: number | null;
    mishna_day_number: number | null;
    audio_url: string;
    duration_seconds: number | null;
    published_at: string;
    mishna_episode_units: EpisodeMishnaMapping[];
  } | null;
}

export interface MishnaProgressRow {
  user_id: string;
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

export interface ProgressResponse {
  episodeProgress: EpisodeProgressRow[];
  mishnaProgress: MishnaProgressRow[];
}

export interface EpisodeProgressMutation {
  episodeId: string;
  hasPosition: boolean;
  positionSeconds?: number;
  hasCompletion: boolean;
  completed?: boolean;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseEpisodeProgressMutation(body: unknown):
  | { value: EpisodeProgressMutation }
  | { error: string } {
  if (!isObject(body)) return { error: 'Request body must be an object' };

  const episodeId = body.episodeId;
  if (typeof episodeId !== 'string' || episodeId.trim() === '') {
    return { error: 'episodeId required' };
  }

  const hasPosition = Object.prototype.hasOwnProperty.call(body, 'positionSeconds');
  const hasCompletedField = Object.prototype.hasOwnProperty.call(body, 'completed');

  if (!hasPosition && !hasCompletedField) {
    return { error: 'positionSeconds or completed required' };
  }

  if (
    hasPosition
    && (
      typeof body.positionSeconds !== 'number'
      || !Number.isInteger(body.positionSeconds)
      || body.positionSeconds < 0
    )
  ) {
    return { error: 'positionSeconds must be a non-negative integer' };
  }

  if (hasCompletedField && typeof body.completed !== 'boolean') {
    return { error: 'completed must be a boolean' };
  }

  // Older clients included completed=false with every position heartbeat.
  // Only a completion-only false request is an explicit remove-listened action.
  const hasCompletion = hasCompletedField && (body.completed === true || !hasPosition);

  return {
    value: {
      episodeId,
      hasPosition,
      positionSeconds: hasPosition ? body.positionSeconds as number : undefined,
      hasCompletion,
      completed: hasCompletion ? body.completed as boolean : undefined,
    },
  };
}

export function parseMishnaProgressMutation(body: unknown):
  | { value: { globalIndex: number; selfStudied: boolean } }
  | { error: string } {
  if (!isObject(body)) return { error: 'Request body must be an object' };

  if (
    typeof body.globalIndex !== 'number'
    || !Number.isInteger(body.globalIndex)
    || body.globalIndex < 1
    || body.globalIndex > TOTAL_MISHNAYOT
  ) {
    return { error: `globalIndex must be an integer from 1 to ${TOTAL_MISHNAYOT}` };
  }

  if (typeof body.selfStudied !== 'boolean') {
    return { error: 'selfStudied must be a boolean' };
  }

  return {
    value: {
      globalIndex: body.globalIndex,
      selfStudied: body.selfStudied,
    },
  };
}

export function sortEpisodeMappings(rows: EpisodeProgressRow[]): EpisodeProgressRow[] {
  return rows.map((row) => ({
    ...row,
    mishna_episodes: row.mishna_episodes
      ? {
          ...row.mishna_episodes,
          mishna_episode_units: [...(row.mishna_episodes.mishna_episode_units ?? [])]
            .sort((a, b) => a.sequence - b.sequence),
        }
      : null,
  }));
}

export function emptyMishnaProgress(globalIndex: number): Omit<MishnaProgressRow, 'user_id'> {
  return {
    global_index: globalIndex,
    listened_at: null,
    self_studied_at: null,
    cycle_completed_at: null,
    learned_at: null,
    learned_by_listening: false,
    learned_by_self_study: false,
    learned_by_cycle: false,
    learned: false,
  };
}

export function postgresMutationStatus(code?: string): number {
  if (code === '28000') return 401;
  if (code === '42501') return 403;
  if (code === '22023' || code === '23503' || code === 'P0001') return 400;
  return 500;
}
