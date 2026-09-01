export const LESSON_RESUME_STORAGE_VERSION = 1 as const;
export const LEGACY_POSITION_KEY_PREFIX = 'mishna-pos-';
export const EPISODE_RESUME_KEY_PREFIX = `mishna-resume-v${LESSON_RESUME_STORAGE_VERSION}-`;
export const LAST_PLACE_STORAGE_KEY = `mishna-last-place-v${LESSON_RESUME_STORAGE_VERSION}`;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface LessonResumeRecord {
  version: typeof LESSON_RESUME_STORAGE_VERSION;
  episodeId: string;
  positionSeconds: number;
  updatedAt: string;
  completed: boolean;
}

export interface LessonResumeWrite {
  episodeId: string;
  positionSeconds: number;
  completed: boolean;
}

export type ResumeCandidateSource = 'local' | 'local-legacy' | 'server';

export interface ResumeCandidate {
  episodeId: string;
  positionSeconds: number;
  updatedAt: string | null;
  completed: boolean;
  source: ResumeCandidateSource;
}

export interface ServerLessonResumeRow {
  episode_id: string;
  position_seconds: number;
  completed: boolean;
  updated_at: string | null;
}

export interface LessonListItem {
  id: string;
}

export type ExplicitDayMatch =
  | string
  | number
  | { episodeId: string }
  | { index: number };

export interface ResolveInitialLessonOptions<T extends LessonListItem> {
  episodes: readonly T[];
  explicitEpisodeId?: string | null;
  explicitDayMatch?: ExplicitDayMatch | null;
  explicitDayRequested?: boolean;
  localLastPlace?: ResumeCandidate | null;
  serverProgress?: readonly ServerLessonResumeRow[] | null;
  fallbackIndex?: number;
}

export type InitialLessonSource =
  | 'explicit-episode'
  | 'explicit-day'
  | 'explicit-day-unavailable'
  | 'local-last-place'
  | 'server-last-place'
  | 'fallback'
  | 'empty';

export interface InitialLessonSelection {
  index: number;
  episodeId: string | null;
  source: InitialLessonSource;
  positionSeconds: number;
  completed: boolean;
  updatedAt: string | null;
  advancedFromCompleted: boolean;
  resumedFromEpisodeId: string | null;
}

export type EpisodePositionSource = ResumeCandidateSource | 'none';

export interface EpisodePositionResolution {
  episodeId: string;
  positionSeconds: number;
  completed: boolean;
  updatedAt: string | null;
  source: EpisodePositionSource;
}

export interface TimerFunctions {
  setTimeout(callback: () => void, delayMs: number): unknown;
  clearTimeout(timer: unknown): void;
}

export interface ThrottledLatestSaver<T> {
  schedule(value: T): void;
  cancel(): void;
  flush(): void;
}

export function legacyPositionKey(episodeId: string): string {
  return `${LEGACY_POSITION_KEY_PREFIX}${episodeId}`;
}

export function episodeResumeKey(episodeId: string): string {
  return `${EPISODE_RESUME_KEY_PREFIX}${episodeId}`;
}

/**
 * Persist all resume formats independently. A failure in one storage write does
 * not stop the legacy or last-place writes from being attempted.
 */
export function writeLessonResume(
  storage: StorageLike | null | undefined,
  value: LessonResumeWrite,
  updatedAt = new Date().toISOString(),
): LessonResumeRecord | null {
  const episodeId = normalizeEpisodeId(value.episodeId);
  const positionSeconds = normalizePositionForWrite(value.positionSeconds);
  const normalizedUpdatedAt = normalizeTimestamp(updatedAt);
  if (!episodeId || positionSeconds === null || !normalizedUpdatedAt || typeof value.completed !== 'boolean') {
    return null;
  }

  const record: LessonResumeRecord = {
    version: LESSON_RESUME_STORAGE_VERSION,
    episodeId,
    positionSeconds,
    updatedAt: normalizedUpdatedAt,
    completed: value.completed,
  };

  const serialized = JSON.stringify(record);
  safeSetItem(storage, legacyPositionKey(episodeId), String(positionSeconds));
  safeSetItem(storage, episodeResumeKey(episodeId), serialized);
  safeSetItem(storage, LAST_PLACE_STORAGE_KEY, serialized);
  return record;
}

/** Read the timestamped per-episode value, falling back to the rollback key. */
export function readEpisodeResume(
  storage: StorageLike | null | undefined,
  episodeId: string,
): ResumeCandidate | null {
  const normalizedEpisodeId = normalizeEpisodeId(episodeId);
  if (!normalizedEpisodeId) return null;

  const versioned = parseStoredRecord(
    safeGetItem(storage, episodeResumeKey(normalizedEpisodeId)),
    normalizedEpisodeId,
  );
  if (versioned) return candidateFromStoredRecord(versioned);

  const legacyPosition = parseLegacyPosition(
    safeGetItem(storage, legacyPositionKey(normalizedEpisodeId)),
  );
  if (legacyPosition === null) return null;

  return {
    episodeId: normalizedEpisodeId,
    positionSeconds: legacyPosition,
    updatedAt: null,
    completed: false,
    source: 'local-legacy',
  };
}

/** Read the timestamped global pointer used to reopen the last active lesson. */
export function readLastPlace(
  storage: StorageLike | null | undefined,
): ResumeCandidate | null {
  const record = parseStoredRecord(safeGetItem(storage, LAST_PLACE_STORAGE_KEY));
  return record ? candidateFromStoredRecord(record) : null;
}

/**
 * Recover the best pre-versioned place when the old app saved only one raw
 * position per episode. Timestamped per-episode records win; otherwise the
 * latest episode in the supplied chronological list is the safest estimate.
 */
export function readBestEpisodePlace(
  storage: StorageLike | null | undefined,
  chronologicalEpisodeIds: Iterable<string>,
): ResumeCandidate | null {
  let best: ResumeCandidate | null = null;

  for (const episodeId of chronologicalEpisodeIds) {
    const candidate = readEpisodeResume(storage, episodeId);
    if (!candidate || (candidate.positionSeconds === 0 && !candidate.completed)) continue;
    if (!best) {
      best = candidate;
      continue;
    }

    const candidateTime = candidateTimestamp(candidate);
    const bestTime = candidateTimestamp(best);
    if (candidateTime > bestTime || candidateTime === bestTime) {
      best = candidate;
    }
  }

  return best;
}

/**
 * Select an explicit episode/day first, then the freshest valid browser/server
 * pointer, and finally the caller's fallback (normally today's lesson).
 */
export function resolveInitialLesson<T extends LessonListItem>(
  options: ResolveInitialLessonOptions<T>,
): InitialLessonSelection {
  const { episodes } = options;
  if (episodes.length === 0) {
    return options.explicitDayRequested
      ? { ...emptyInitialSelection(), source: 'explicit-day-unavailable' }
      : emptyInitialSelection();
  }

  const indexById = new Map<string, number>();
  episodes.forEach((episode, index) => {
    const id = normalizeEpisodeId(episode.id);
    if (id && !indexById.has(id)) indexById.set(id, index);
  });

  const explicitIndex = options.explicitEpisodeId
    ? indexById.get(options.explicitEpisodeId.trim())
    : undefined;
  if (explicitIndex !== undefined) {
    return basicInitialSelection(episodes, explicitIndex, 'explicit-episode');
  }

  const explicitDayIndex = resolveExplicitDayIndex(options.explicitDayMatch, episodes, indexById);
  if (explicitDayIndex !== null) {
    return basicInitialSelection(episodes, explicitDayIndex, 'explicit-day');
  }
  if (options.explicitDayRequested) {
    return {
      ...emptyInitialSelection(),
      source: 'explicit-day-unavailable',
    };
  }

  const candidates: ResumeCandidate[] = [];
  const local = normalizeCandidate(options.localLastPlace);
  if (local && local.source !== 'server' && indexById.has(local.episodeId)) {
    candidates.push(local);
  }

  for (const row of options.serverProgress ?? []) {
    const candidate = serverRowToCandidate(row);
    if (candidate && indexById.has(candidate.episodeId)) candidates.push(candidate);
  }

  const freshest = candidates.reduce<ResumeCandidate | null>((current, candidate) => {
    if (!current) return candidate;
    return compareCandidateFreshness(candidate, current, indexById) > 0 ? candidate : current;
  }, null);

  if (freshest) {
    const candidateIndex = indexById.get(freshest.episodeId)!;
    const canAdvance = freshest.completed && candidateIndex < episodes.length - 1;
    const selectedIndex = canAdvance ? candidateIndex + 1 : candidateIndex;
    return {
      index: selectedIndex,
      episodeId: episodes[selectedIndex]?.id ?? null,
      source: freshest.source === 'server' ? 'server-last-place' : 'local-last-place',
      positionSeconds: canAdvance ? 0 : freshest.positionSeconds,
      completed: canAdvance ? false : freshest.completed,
      updatedAt: canAdvance ? null : freshest.updatedAt,
      advancedFromCompleted: canAdvance,
      resumedFromEpisodeId: freshest.episodeId,
    };
  }

  const fallbackIndex = validEpisodeIndex(options.fallbackIndex, episodes.length) ?? 0;
  return basicInitialSelection(episodes, fallbackIndex, 'fallback');
}

/**
 * Pick one episode's newest browser/server state. Untimestamped legacy data is
 * used only when no newer timestamped value exists; a server tie wins.
 */
export function resolveEpisodePosition(
  episodeId: string,
  localResume: ResumeCandidate | null | undefined,
  serverProgress: ServerLessonResumeRow | null | undefined,
): EpisodePositionResolution {
  const normalizedEpisodeId = normalizeEpisodeId(episodeId) ?? episodeId;
  const candidates: ResumeCandidate[] = [];
  const local = normalizeCandidate(localResume);
  if (local && local.episodeId === normalizedEpisodeId && local.source !== 'server') {
    candidates.push(local);
  }
  const server = serverRowToCandidate(serverProgress);
  if (server && server.episodeId === normalizedEpisodeId) candidates.push(server);

  if (local && server && local.updatedAt === null && server.updatedAt === null) {
    const completed = local.completed || server.completed;
    const positionSeconds = Math.max(local.positionSeconds, server.positionSeconds);
    const source = local.completed !== server.completed
      ? (local.completed ? local.source : server.source)
      : local.positionSeconds > server.positionSeconds
        ? local.source
        : server.source;
    return {
      episodeId: normalizedEpisodeId,
      positionSeconds,
      completed,
      updatedAt: null,
      source,
    };
  }

  const freshest = candidates.reduce<ResumeCandidate | null>((current, candidate) => {
    if (!current) return candidate;
    return compareCandidateFreshness(candidate, current) > 0 ? candidate : current;
  }, null);

  return freshest
    ? {
        episodeId: normalizedEpisodeId,
        positionSeconds: freshest.positionSeconds,
        completed: freshest.completed,
        updatedAt: freshest.updatedAt,
        source: freshest.source,
      }
    : {
        episodeId: normalizedEpisodeId,
        positionSeconds: 0,
        completed: false,
        updatedAt: null,
        source: 'none',
      };
}

/**
 * A trailing throttle: the first call opens a fixed window and later calls
 * replace only the pending value. Continuous updates therefore save once per
 * window instead of postponing the save forever.
 */
export function createThrottledLatestSaver<T>(
  save: (value: T) => void,
  windowMs: number,
  timers: TimerFunctions = defaultTimers,
): ThrottledLatestSaver<T> {
  if (!Number.isFinite(windowMs) || windowMs < 0) {
    throw new RangeError('windowMs must be a non-negative finite number');
  }

  let timer: unknown = null;
  let hasPendingValue = false;
  let latestValue: T;

  const runPending = () => {
    timer = null;
    if (!hasPendingValue) return;
    const value = latestValue;
    hasPendingValue = false;
    save(value);
  };

  return {
    schedule(value: T) {
      latestValue = value;
      hasPendingValue = true;
      if (timer === null) timer = timers.setTimeout(runPending, windowMs);
    },
    cancel() {
      if (timer !== null) timers.clearTimeout(timer);
      timer = null;
      hasPendingValue = false;
    },
    flush() {
      if (timer !== null) timers.clearTimeout(timer);
      timer = null;
      if (!hasPendingValue) return;
      const value = latestValue;
      hasPendingValue = false;
      save(value);
    },
  };
}

/** Match the whole canonical lesson, never a one-unit subset of a two-unit day. */
export function episodeMatchesExactUnits(
  episodeUnits: ReadonlyArray<{ global_index: number }> | null | undefined,
  expectedGlobalIndices: Iterable<number>,
): boolean {
  const actual = (episodeUnits ?? []).map((unit) => unit.global_index);
  const expected = Array.from(expectedGlobalIndices);
  if (actual.length === 0 || actual.length !== expected.length) return false;
  if (!actual.every(isCanonicalIndex) || !expected.every(isCanonicalIndex)) return false;

  actual.sort((left, right) => left - right);
  expected.sort((left, right) => left - right);
  return actual.every((globalIndex, index) => globalIndex === expected[index]);
}

function emptyInitialSelection(): InitialLessonSelection {
  return {
    index: -1,
    episodeId: null,
    source: 'empty',
    positionSeconds: 0,
    completed: false,
    updatedAt: null,
    advancedFromCompleted: false,
    resumedFromEpisodeId: null,
  };
}

function basicInitialSelection<T extends LessonListItem>(
  episodes: readonly T[],
  index: number,
  source: Extract<InitialLessonSource, 'explicit-episode' | 'explicit-day' | 'fallback'>,
): InitialLessonSelection {
  return {
    index,
    episodeId: episodes[index]?.id ?? null,
    source,
    positionSeconds: 0,
    completed: false,
    updatedAt: null,
    advancedFromCompleted: false,
    resumedFromEpisodeId: null,
  };
}

function resolveExplicitDayIndex<T extends LessonListItem>(
  match: ExplicitDayMatch | null | undefined,
  episodes: readonly T[],
  indexById: ReadonlyMap<string, number>,
): number | null {
  if (typeof match === 'string') return indexById.get(match.trim()) ?? null;
  if (typeof match === 'number') return validEpisodeIndex(match, episodes.length);
  if (match && 'episodeId' in match) return indexById.get(match.episodeId.trim()) ?? null;
  if (match && 'index' in match) return validEpisodeIndex(match.index, episodes.length);
  return null;
}

function validEpisodeIndex(value: number | null | undefined, length: number): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < length
    ? value
    : null;
}

function normalizeCandidate(value: ResumeCandidate | null | undefined): ResumeCandidate | null {
  if (!value) return null;
  const episodeId = normalizeEpisodeId(value.episodeId);
  if (!episodeId || !isStoredPosition(value.positionSeconds) || typeof value.completed !== 'boolean') {
    return null;
  }
  if (value.source !== 'local' && value.source !== 'local-legacy' && value.source !== 'server') {
    return null;
  }
  if (value.updatedAt !== null && !normalizeTimestamp(value.updatedAt)) return null;

  return {
    episodeId,
    positionSeconds: value.positionSeconds,
    updatedAt: value.updatedAt === null ? null : normalizeTimestamp(value.updatedAt),
    completed: value.completed,
    source: value.source,
  };
}

function serverRowToCandidate(
  row: ServerLessonResumeRow | null | undefined,
): ResumeCandidate | null {
  if (!row) return null;
  const episodeId = normalizeEpisodeId(row.episode_id);
  if (!episodeId || !isStoredPosition(row.position_seconds) || typeof row.completed !== 'boolean') {
    return null;
  }
  if (row.updated_at !== null && !normalizeTimestamp(row.updated_at)) return null;

  return {
    episodeId,
    positionSeconds: row.position_seconds,
    updatedAt: row.updated_at === null ? null : normalizeTimestamp(row.updated_at),
    completed: row.completed,
    source: 'server',
  };
}

function compareCandidateFreshness(
  left: ResumeCandidate,
  right: ResumeCandidate,
  indexById?: ReadonlyMap<string, number>,
): number {
  const leftTimestamp = candidateTimestamp(left);
  const rightTimestamp = candidateTimestamp(right);
  if (leftTimestamp !== rightTimestamp) return leftTimestamp > rightTimestamp ? 1 : -1;

  if (indexById && leftTimestamp === Number.NEGATIVE_INFINITY) {
    const indexDifference = (indexById.get(left.episodeId) ?? -1) - (indexById.get(right.episodeId) ?? -1);
    if (indexDifference !== 0) return indexDifference;
    if (left.completed !== right.completed) return left.completed ? 1 : -1;
    if (left.positionSeconds !== right.positionSeconds) {
      return left.positionSeconds > right.positionSeconds ? 1 : -1;
    }
  }

  const sourceDifference = sourcePriority(left.source) - sourcePriority(right.source);
  if (sourceDifference !== 0) return sourceDifference;

  if (indexById) {
    const indexDifference = (indexById.get(left.episodeId) ?? -1) - (indexById.get(right.episodeId) ?? -1);
    if (indexDifference !== 0) return indexDifference;
  }
  return left.positionSeconds - right.positionSeconds;
}

function sourcePriority(source: ResumeCandidateSource): number {
  if (source === 'server') return 3;
  if (source === 'local') return 2;
  return 1;
}

function candidateTimestamp(candidate: ResumeCandidate): number {
  if (!candidate.updatedAt) return Number.NEGATIVE_INFINITY;
  return Date.parse(candidate.updatedAt);
}

function candidateFromStoredRecord(record: LessonResumeRecord): ResumeCandidate {
  return {
    episodeId: record.episodeId,
    positionSeconds: record.positionSeconds,
    updatedAt: record.updatedAt,
    completed: record.completed,
    source: 'local',
  };
}

function parseStoredRecord(raw: string | null, expectedEpisodeId?: string): LessonResumeRecord | null {
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!isRecord(value) || value.version !== LESSON_RESUME_STORAGE_VERSION) return null;

    const episodeId = normalizeEpisodeId(value.episodeId);
    const updatedAt = normalizeTimestamp(value.updatedAt);
    if (
      !episodeId
      || (expectedEpisodeId !== undefined && episodeId !== expectedEpisodeId)
      || !isStoredPosition(value.positionSeconds)
      || !updatedAt
      || typeof value.completed !== 'boolean'
    ) {
      return null;
    }

    return {
      version: LESSON_RESUME_STORAGE_VERSION,
      episodeId,
      positionSeconds: value.positionSeconds,
      updatedAt,
      completed: value.completed,
    };
  } catch {
    return null;
  }
}

function parseLegacyPosition(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw.trim())) return null;
  const value = Number(raw.trim());
  return isStoredPosition(value) ? value : null;
}

function normalizeEpisodeId(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizePositionForWrite(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
  const normalized = Math.floor(value);
  return Number.isSafeInteger(normalized) ? normalized : null;
}

function isStoredPosition(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function isCanonicalIndex(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

function normalizeTimestamp(value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeGetItem(storage: StorageLike | null | undefined, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(
  storage: StorageLike | null | undefined,
  key: string,
  value: string,
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

const defaultTimers: TimerFunctions = {
  setTimeout(callback, delayMs) {
    return globalThis.setTimeout(callback, delayMs);
  },
  clearTimeout(timer) {
    globalThis.clearTimeout(timer as ReturnType<typeof setTimeout>);
  },
};
