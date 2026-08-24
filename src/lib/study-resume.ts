import {
  ALL_MISHNAYOT,
  TOTAL_MISHNAYOT,
  type MishnaReference,
} from './mishna-data';

export const STUDY_RESUME_STORAGE_VERSION = 1 as const;
export const STUDY_RESUME_STORAGE_KEY =
  `mishna-self-study-resume-v${STUDY_RESUME_STORAGE_VERSION}`;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface StudyResumeRecord {
  version: typeof STUDY_RESUME_STORAGE_VERSION;
  globalIndex: number;
  updatedAt: string;
}

export interface ServerSelfStudyRow {
  global_index: number;
  self_studied_at: string | null;
}

export type StudyResumeSource = 'explicit' | 'local' | 'server' | 'fallback';

export interface StudyResumeSelection {
  globalIndex: number;
  updatedAt: string | null;
  source: StudyResumeSource;
}

export interface ResolveStudyResumeOptions {
  explicitGlobalIndex?: number | null;
  localPointer?: StudyResumeRecord | null;
  serverProgress?: readonly ServerSelfStudyRow[] | null;
  fallbackGlobalIndex?: number | null;
}

/**
 * Save the exact Mishnah being viewed. Invalid values and unavailable browser
 * storage fail closed without interrupting the study screen.
 */
export function writeStudyResume(
  storage: StorageLike | null | undefined,
  globalIndex: number,
  updatedAt = new Date().toISOString(),
): StudyResumeRecord | null {
  const record = createRecord(globalIndex, updatedAt);
  if (!record || !storage) return null;

  try {
    storage.setItem(STUDY_RESUME_STORAGE_KEY, JSON.stringify(record));
    return record;
  } catch {
    return null;
  }
}

/** Read and validate the versioned pointer without trusting localStorage data. */
export function readStudyResume(
  storage: StorageLike | null | undefined,
): StudyResumeRecord | null {
  if (!storage) return null;

  let raw: string | null;
  try {
    raw = storage.getItem(STUDY_RESUME_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    return normalizeRecord(JSON.parse(raw));
  } catch {
    return null;
  }
}

/**
 * Find the most recently self-studied Mishnah and point to the next canonical
 * Mishnah. Bulk writes share a timestamp, so their highest index wins the tie.
 */
export function deriveServerStudyResume(
  rows: readonly ServerSelfStudyRow[] | null | undefined,
): StudyResumeSelection | null {
  let newest: { globalIndex: number; updatedAt: string; timestamp: number } | null = null;

  for (const row of rows ?? []) {
    const reference = canonicalReference(row.global_index);
    const timestamp = normalizeTimestamp(row.self_studied_at);
    if (!reference || !timestamp) continue;

    if (
      !newest
      || timestamp.milliseconds > newest.timestamp
      || (
        timestamp.milliseconds === newest.timestamp
        && reference.globalIndex > newest.globalIndex
      )
    ) {
      newest = {
        globalIndex: reference.globalIndex,
        updatedAt: timestamp.iso,
        timestamp: timestamp.milliseconds,
      };
    }
  }

  if (!newest) return null;

  return {
    globalIndex: Math.min(newest.globalIndex + 1, TOTAL_MISHNAYOT),
    updatedAt: newest.updatedAt,
    source: 'server',
  };
}

/**
 * Honor an explicit deep link first. Otherwise choose the freshest valid
 * browser/server pointer, with a deterministic forward-most tie break.
 */
export function resolveStudyResume(
  options: ResolveStudyResumeOptions,
): StudyResumeSelection | null {
  const explicit = canonicalReference(options.explicitGlobalIndex);
  if (explicit) {
    return {
      globalIndex: explicit.globalIndex,
      updatedAt: null,
      source: 'explicit',
    };
  }

  const localRecord = normalizeRecord(options.localPointer);
  const local: StudyResumeSelection | null = localRecord
    ? {
        globalIndex: localRecord.globalIndex,
        updatedAt: localRecord.updatedAt,
        source: 'local',
      }
    : null;
  const server = deriveServerStudyResume(options.serverProgress);

  if (local && server) return fresherSelection(local, server);
  if (local) return local;
  if (server) return server;

  const fallback = canonicalReference(options.fallbackGlobalIndex);
  return fallback
    ? {
        globalIndex: fallback.globalIndex,
        updatedAt: null,
        source: 'fallback',
      }
    : null;
}

/** Build the stable Browse deep link for a canonical Mishnah reference. */
export function buildBrowseHref(target: number | MishnaReference): string {
  const globalIndex = typeof target === 'number' ? target : target.globalIndex;
  const reference = canonicalReference(globalIndex);
  if (!reference) return '/browse';

  return `/browse?seder=${encodeURIComponent(reference.seder)}`
    + `&tractate=${encodeURIComponent(reference.tractate)}`
    + `&chapter=${reference.chapter}`
    + `&mishna=${reference.mishna}`;
}

function canonicalReference(globalIndex: unknown): MishnaReference | null {
  if (
    typeof globalIndex !== 'number'
    || !Number.isInteger(globalIndex)
    || globalIndex < 1
    || globalIndex > TOTAL_MISHNAYOT
  ) {
    return null;
  }

  const reference = ALL_MISHNAYOT[globalIndex - 1];
  return reference?.globalIndex === globalIndex ? reference : null;
}

function createRecord(globalIndex: number, updatedAt: string): StudyResumeRecord | null {
  const reference = canonicalReference(globalIndex);
  const timestamp = normalizeTimestamp(updatedAt);
  if (!reference || !timestamp) return null;

  return {
    version: STUDY_RESUME_STORAGE_VERSION,
    globalIndex: reference.globalIndex,
    updatedAt: timestamp.iso,
  };
}

function normalizeRecord(value: unknown): StudyResumeRecord | null {
  if (!isRecord(value) || value.version !== STUDY_RESUME_STORAGE_VERSION) return null;
  if (typeof value.updatedAt !== 'string') return null;
  return createRecord(value.globalIndex as number, value.updatedAt);
}

function normalizeTimestamp(value: unknown): { iso: string; milliseconds: number } | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const milliseconds = Date.parse(value);
  if (!Number.isFinite(milliseconds)) return null;
  return { iso: new Date(milliseconds).toISOString(), milliseconds };
}

function fresherSelection(
  local: StudyResumeSelection,
  server: StudyResumeSelection,
): StudyResumeSelection {
  const localTime = Date.parse(local.updatedAt ?? '');
  const serverTime = Date.parse(server.updatedAt ?? '');
  if (localTime > serverTime) return local;
  if (serverTime > localTime) return server;
  if (server.globalIndex > local.globalIndex) return server;
  return local;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
