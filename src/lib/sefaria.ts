// Sefaria text layer — fetch the vocalized Hebrew + a clean English of any Mishna.
//
// Hebrew:  "Torat Emet 357" (vocalized, Public Domain)
// English: "Mishnah Yomit by Dr. Joshua Kulp" (CC-BY) — a clean, direct Mishnah
//          translation written for the Mishna Yomit cycle. Preferred over the
//          William Davidson Edition, which is the verbose *elucidated Talmud*
//          text rather than a plain translation of the mishna. Davidson is the
//          fallback if Kulp is ever missing for a ref.
//
// The text of the Mishna never changes, so every fetch is cached forever in
// Next's Data Cache (revalidate: false). Sefaria is hit at most once per ref.

import type { MishnaReference } from './mishna-data';

export interface MishnaText {
  /** "Tractate ch:mishna" display label, e.g. "Berakhot 1:1" */
  label: string;
  /** Sefaria canonical ref, e.g. "Mishnah Berakhot 1:1" */
  ref: string;
  /** Vocalized Hebrew (RTL) */
  he: string;
  /** English translation (Kulp preferred, Davidson fallback) */
  en: string;
  /** Version title of the English actually used (for attribution) */
  enSource: string;
}

const KULP_VERSION = 'Mishnah Yomit by Dr. Joshua Kulp';
/** Bound each Sefaria call so a hung connection can't run into Vercel's maxDuration. */
const FETCH_TIMEOUT_MS = 5000;

/**
 * Convert one of our MishnaReference tractate names to Sefaria's canonical
 * title. Sefaria strips the apostrophe from every tractate name
 * (Pe'ah → Peah, Shevi'it → Sheviit, Ma'aser Sheni → Maaser Sheni, …),
 * which is the only transform needed — every other name matches verbatim.
 */
export function toSefariaRef(ref: Pick<MishnaReference, 'tractate' | 'chapter' | 'mishna'>): string {
  const tractate = ref.tractate.replace(/'/g, '');
  return `Mishnah ${tractate} ${ref.chapter}:${ref.mishna}`;
}

/** Sefaria sometimes returns a segmented array; normalize to a single string. */
function joinText(t: unknown): string {
  if (Array.isArray(t)) return t.flat(Infinity).filter(Boolean).join(' ');
  return typeof t === 'string' ? t : '';
}

/** Collapse whitespace and strip any stray markup the API leaves behind. */
function clean(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')             // belt-and-suspenders: any residual tags
    .replace(/[   ]/g, ' ') // nbsp / narrow-nbsp / thin space → space
    .replace(/\s+\n/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')          // collapse runs (incl. converted nbsp)
    .trim();
}

interface SefariaVersion {
  actualLanguage?: string;
  versionTitle?: string;
  text?: unknown;
}

/**
 * Fetch the Hebrew + English text for a single mishna from Sefaria.
 * Returns empty strings (never throws) when a language or the whole ref is
 * unavailable, so the caller can degrade gracefully.
 */
export async function fetchMishnaText(
  ref: Pick<MishnaReference, 'tractate' | 'chapter' | 'mishna'>
): Promise<MishnaText> {
  const sefariaRef = toSefariaRef(ref);
  const label = `${ref.tractate} ${ref.chapter}:${ref.mishna}`;
  // Request Hebrew, Kulp's clean translation, and the default English (fallback)
  // in a single call. v3 takes repeated version= params.
  const url =
    `https://www.sefaria.org/api/v3/texts/${encodeURIComponent(sefariaRef)}` +
    `?version=hebrew` +
    `&version=english|${encodeURIComponent(KULP_VERSION)}` +
    `&version=english` +
    `&return_format=text_only`;

  try {
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      // Hard ceiling per call so a slow/hung Sefaria can't stall a cron run.
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      // The text is immutable — cache it permanently in the Data Cache.
      next: { revalidate: false },
    });
    if (!res.ok) throw new Error(`Sefaria ${res.status}`);
    const data = await res.json();

    const versions: SefariaVersion[] = data?.versions ?? [];
    const he = versions.find(v => v.actualLanguage === 'he');

    const englishVersions = versions.filter(v => v.actualLanguage === 'en' && joinText(v.text).trim());
    // Prefer Kulp's Mishnah Yomit translation; fall back to whatever English exists.
    const en =
      englishVersions.find(v => (v.versionTitle ?? '').includes('Kulp')) ?? englishVersions[0];

    return {
      label,
      ref: sefariaRef,
      he: clean(joinText(he?.text)),
      en: clean(joinText(en?.text)),
      enSource: en?.versionTitle ?? '',
    };
  } catch {
    return { label, ref: sefariaRef, he: '', en: '', enSource: '' };
  }
}

/** Fetch text for a list of mishnayot (a day's worth), in order. */
export async function fetchMishnayotText(
  refs: Pick<MishnaReference, 'tractate' | 'chapter' | 'mishna'>[]
): Promise<MishnaText[]> {
  return Promise.all(refs.map(fetchMishnaText));
}
