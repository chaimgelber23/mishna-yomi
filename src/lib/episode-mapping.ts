import { ALL_MISHNAYOT, type MishnaReference } from './mishna-data';

export type MishnaTitleKind =
  | 'cross_tractate'
  | 'cross_chapter'
  | 'same_chapter'
  | 'single'
  | null;

export interface ParsedMishnaTitle {
  tractate: string | null;
  tractateTo: string | null;
  chapterFrom: number | null;
  mishnaFrom: number | null;
  chapterTo: number | null;
  mishnaTo: number | null;
  kind: MishnaTitleKind;
}

export interface EpisodeMappingUnit extends MishnaReference {
  sequence: 1 | 2;
}

export type EpisodeMappingResult =
  | {
      ok: true;
      parsed: ParsedMishnaTitle;
      units: EpisodeMappingUnit[];
      globalIndices: number[];
      mappingSource: `rss_title_${Exclude<MishnaTitleKind, null>}_v1`;
    }
  | {
      ok: false;
      parsed: ParsedMishnaTitle;
      reason: string;
    };

const TRACTATE_ALIASES: Record<string, string> = {
  shabbos: 'Shabbat',
  kesubos: 'Ketubot',
  gitin: 'Gittin',
  kidushin: 'Kiddushin',
  'bava kama': 'Bava Kamma',
  'bava basra': 'Bava Batra',
  makos: 'Makkot',
  shevuos: 'Shevuot',
  eduyos: 'Eduyot',
  avos: 'Avot',
  horayos: 'Horayot',
  menachos: 'Menachot',
  chulin: 'Chullin',
  bechoros: 'Bekhorot',
  erchin: 'Arakhin',
  kerisus: 'Keritot',
  midos: 'Middot',
  kinim: 'Kinnim',
  nida: 'Niddah',
  klim: 'Kelim',
  keilim: 'Kelim',
};

const CANONICAL_TRACTATES = new Map<string, string>();
const REFERENCE_BY_KEY = new Map<string, MishnaReference>();

for (const ref of ALL_MISHNAYOT) {
  CANONICAL_TRACTATES.set(normalizeNameKey(ref.tractate), ref.tractate);
  REFERENCE_BY_KEY.set(referenceKey(ref.tractate, ref.chapter, ref.mishna), ref);
}

function normalizeNameKey(name: string): string {
  return name
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function referenceKey(tractate: string, chapter: number, mishna: number): string {
  return `${tractate}\u0000${chapter}\u0000${mishna}`;
}

function emptyParsedTitle(): ParsedMishnaTitle {
  return {
    tractate: null,
    tractateTo: null,
    chapterFrom: null,
    mishnaFrom: null,
    chapterTo: null,
    mishnaTo: null,
    kind: null,
  };
}

/** Normalize feed spellings to the canonical tractate names in ALL_MISHNAYOT. */
export function normalizeTractate(name: string | null): string | null {
  if (!name) return null;

  const clean = name.replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, ' ').trim();
  const key = normalizeNameKey(clean);
  return TRACTATE_ALIASES[key] ?? CANONICAL_TRACTATES.get(key) ?? clean;
}

/**
 * Parse the complete Mishnah reference at the beginning of a feed title.
 * Cross-tractate titles must be tested before the same-tractate patterns.
 */
export function parseMishnaTitle(title: string): ParsedMishnaTitle {
  const prefix = title.match(/^\s*Mishna\s+Yomi\s*[-:]\s*/i);
  if (!prefix) return emptyParsedTitle();

  const cleaned = title.slice(prefix[0].length).trim();
  const dash = '[-\u2013\u2014]';

  // "Kinim 3:6 -Kelim 1:1"
  const crossTractate = cleaned.match(
    new RegExp(`^(.+?)\\s+(\\d+):(\\d+)\\s*${dash}\\s*(.+?)\\s+(\\d+):(\\d+)(?![\\d:])`, 'i')
  );
  if (crossTractate) {
    return {
      tractate: normalizeTractate(crossTractate[1]),
      tractateTo: normalizeTractate(crossTractate[4]),
      chapterFrom: Number(crossTractate[2]),
      mishnaFrom: Number(crossTractate[3]),
      chapterTo: Number(crossTractate[5]),
      mishnaTo: Number(crossTractate[6]),
      kind: 'cross_tractate',
    };
  }

  // "Kelim 22:10-23:1"
  const crossChapter = cleaned.match(
    new RegExp(`^(.+?)\\s+(\\d+):(\\d+)\\s*${dash}\\s*(\\d+):(\\d+)(?![\\d:])`, 'i')
  );
  if (crossChapter) {
    const tractate = normalizeTractate(crossChapter[1]);
    return {
      tractate,
      tractateTo: tractate,
      chapterFrom: Number(crossChapter[2]),
      mishnaFrom: Number(crossChapter[3]),
      chapterTo: Number(crossChapter[4]),
      mishnaTo: Number(crossChapter[5]),
      kind: 'cross_chapter',
    };
  }

  // "Kelim 24:5-6"
  const sameChapter = cleaned.match(
    new RegExp(`^(.+?)\\s+(\\d+):(\\d+)\\s*${dash}\\s*(\\d+)(?![\\d:])`, 'i')
  );
  if (sameChapter) {
    const tractate = normalizeTractate(sameChapter[1]);
    return {
      tractate,
      tractateTo: tractate,
      chapterFrom: Number(sameChapter[2]),
      mishnaFrom: Number(sameChapter[3]),
      chapterTo: Number(sameChapter[2]),
      mishnaTo: Number(sameChapter[4]),
      kind: 'same_chapter',
    };
  }

  // "Ketubot 13:11"
  const single = cleaned.match(/^(.+?)\s+(\d+):(\d+)(?![\d:])/i);
  if (single) {
    const tractate = normalizeTractate(single[1]);
    return {
      tractate,
      tractateTo: tractate,
      chapterFrom: Number(single[2]),
      mishnaFrom: Number(single[3]),
      chapterTo: Number(single[2]),
      mishnaTo: Number(single[3]),
      kind: 'single',
    };
  }

  return emptyParsedTitle();
}

export function isPotentialMishnaLesson(title: string): boolean {
  return /^\s*Mishna\s+Yomi\s*[-:]/i.test(title) && /\d+:\d+/.test(title);
}

/** Resolve a feed title to one or two exact, consecutive canonical Mishnayot. */
export function resolveEpisodeMapping(title: string): EpisodeMappingResult {
  const parsed = parseMishnaTitle(title);
  if (
    !parsed.kind ||
    !parsed.tractate ||
    !parsed.tractateTo ||
    parsed.chapterFrom === null ||
    parsed.mishnaFrom === null ||
    parsed.chapterTo === null ||
    parsed.mishnaTo === null
  ) {
    return { ok: false, parsed, reason: 'No complete Mishnah reference was found in the title.' };
  }

  const start = REFERENCE_BY_KEY.get(
    referenceKey(parsed.tractate, parsed.chapterFrom, parsed.mishnaFrom)
  );
  const end = REFERENCE_BY_KEY.get(
    referenceKey(parsed.tractateTo, parsed.chapterTo, parsed.mishnaTo)
  );

  if (!start || !end) {
    const missing = !start
      ? `${parsed.tractate} ${parsed.chapterFrom}:${parsed.mishnaFrom}`
      : `${parsed.tractateTo} ${parsed.chapterTo}:${parsed.mishnaTo}`;
    return { ok: false, parsed, reason: `Unknown canonical Mishnah reference: ${missing}.` };
  }

  if (end.globalIndex < start.globalIndex) {
    return { ok: false, parsed, reason: 'The title maps backwards in the canonical Mishnah order.' };
  }

  const refs = ALL_MISHNAYOT.slice(start.globalIndex - 1, end.globalIndex);
  if (refs.length < 1 || refs.length > 2) {
    return {
      ok: false,
      parsed,
      reason: `A Mishnah Yomi lesson must map to one or two Mishnayot, not ${refs.length}.`,
    };
  }

  const units = refs.map((ref, index) => ({
    ...ref,
    sequence: (index + 1) as 1 | 2,
  }));

  return {
    ok: true,
    parsed,
    units,
    globalIndices: units.map((unit) => unit.globalIndex),
    mappingSource: `rss_title_${parsed.kind}_v1`,
  };
}

export interface MappedEpisodeForPreference {
  id: string;
  published_at: string | null;
  mishna_episode_units: ReadonlyArray<{ global_index: number; sequence: number }>;
}

export interface DesiredEpisodeSyncState {
  title: string;
  description: string | null;
  audioUrl: string;
  durationSeconds: number | null;
  publishedAt: string;
  tractate: string;
  chapterFrom: number;
  mishnaFrom: number;
  chapterTo: number;
  mishnaTo: number;
  mishnaDayNumber: number;
  globalIndices: number[];
}

export interface StoredEpisodeSyncState {
  title: string;
  description: string | null;
  audio_url: string;
  duration_seconds: number | null;
  published_at: string;
  tractate: string | null;
  chapter_from: number | null;
  mishna_from: number | null;
  chapter_to: number | null;
  mishna_to: number | null;
  mishna_day_number: number | null;
  mishna_episode_units: ReadonlyArray<{
    global_index: number;
    sequence: number;
    mapping_source: string;
  }>;
}

export type EpisodeSyncReason = 'missing_episode' | 'metadata_changed' | 'mapping_changed';

/** Return null only when the stored episode and verified mapping exactly match the feed. */
export function episodeSyncReason(
  stored: StoredEpisodeSyncState | undefined,
  desired: DesiredEpisodeSyncState
): EpisodeSyncReason | null {
  if (!stored) return 'missing_episode';

  const storedMappings = [...stored.mishna_episode_units].sort(
    (a, b) => a.sequence - b.sequence || a.global_index - b.global_index
  );
  if (
    storedMappings.length !== desired.globalIndices.length ||
    storedMappings.some(
      (mapping, index) =>
        mapping.sequence !== index + 1 ||
        mapping.global_index !== desired.globalIndices[index] ||
        mapping.mapping_source !== 'resolver_v1'
    )
  ) {
    return 'mapping_changed';
  }

  if (
    stored.title !== desired.title ||
    stored.description !== desired.description ||
    stored.audio_url !== desired.audioUrl ||
    stored.duration_seconds !== desired.durationSeconds ||
    !sameInstant(stored.published_at, desired.publishedAt) ||
    stored.tractate !== desired.tractate ||
    stored.chapter_from !== desired.chapterFrom ||
    stored.mishna_from !== desired.mishnaFrom ||
    stored.chapter_to !== desired.chapterTo ||
    stored.mishna_to !== desired.mishnaTo ||
    stored.mishna_day_number !== desired.mishnaDayNumber
  ) {
    return 'metadata_changed';
  }

  return null;
}

function sameInstant(left: string, right: string): boolean {
  const leftTime = Date.parse(left);
  const rightTime = Date.parse(right);
  if (!Number.isNaN(leftTime) && !Number.isNaN(rightTime)) return leftTime === rightTime;
  return left === right;
}

/**
 * Keep one episode per exact unit mapping, then return lessons in canonical
 * Mishnah order. Publication timestamps decide which duplicate recording wins;
 * they never decide which Mishnah comes next.
 */
export function choosePreferredMappedEpisodes<T extends MappedEpisodeForPreference>(episodes: T[]): T[] {
  const preferred = new Map<string, T>();

  for (const episode of episodes) {
    const mappingKey = [...episode.mishna_episode_units]
      .sort((a, b) => a.sequence - b.sequence || a.global_index - b.global_index)
      .map((unit) => unit.global_index)
      .join(',');

    if (!mappingKey) continue;

    const current = preferred.get(mappingKey);
    if (!current || isPreferredEpisode(episode, current)) {
      preferred.set(mappingKey, episode);
    }
  }

  return [...preferred.values()].sort(compareCanonicalMapping);
}

function compareCanonicalMapping(
  left: MappedEpisodeForPreference,
  right: MappedEpisodeForPreference,
): number {
  const leftIndices = orderedGlobalIndices(left);
  const rightIndices = orderedGlobalIndices(right);
  const sharedLength = Math.min(leftIndices.length, rightIndices.length);

  for (let index = 0; index < sharedLength; index++) {
    const difference = leftIndices[index] - rightIndices[index];
    if (difference !== 0) return difference;
  }

  return leftIndices.length - rightIndices.length || left.id.localeCompare(right.id);
}

function orderedGlobalIndices(episode: MappedEpisodeForPreference): number[] {
  return [...episode.mishna_episode_units]
    .sort((a, b) => a.sequence - b.sequence || a.global_index - b.global_index)
    .map((unit) => unit.global_index);
}

function isPreferredEpisode(candidate: MappedEpisodeForPreference, current: MappedEpisodeForPreference): boolean {
  const candidateTime = timestamp(candidate.published_at);
  const currentTime = timestamp(current.published_at);
  if (candidateTime !== currentTime) return candidateTime > currentTime;
  return candidate.id.localeCompare(current.id) < 0;
}

function timestamp(value: string | null): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? Number.NEGATIVE_INFINITY : parsed;
}
