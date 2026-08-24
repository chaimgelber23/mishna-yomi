'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import MishnaText from '@/components/MishnaText';
import {
  ALL_MISHNAYOT, SEDARIM, SEDER_HEBREW, TRACTATE_HEBREW,
  type SederInfo, type TractateInfo,
} from '@/lib/mishna-data';
import {
  readStudyResume,
  resolveStudyResume,
  writeStudyResume,
} from '@/lib/study-resume';

type Level = 'seder' | 'tractate' | 'chapter' | 'mishna';

interface Crumb {
  label: string; level: Level;
  seder?: string; tractate?: string; chapter?: number;
}

interface EpisodeStub {
  id: string; audio_url: string; title: string; tractate: string;
  chapter_from: number; mishna_from: number; chapter_to: number; mishna_to: number;
  mishna_episode_units: Array<{
    global_index: number; sequence: number; mapping_source?: string; verified_at?: string;
  }>;
}

interface MishnaProgressRecord {
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

interface SaveFailure {
  desiredSelfStudy: boolean;
  message: string;
}

interface BulkStudyScope {
  key: string;
  kind: 'chapter' | 'tractate';
  tractate: string;
  chapter?: number;
  label: string;
  globalIndices: number[];
}

interface BulkSaveFailure {
  scope: BulkStudyScope;
  message: string;
}

const MISHNA_BY_REFERENCE = new Map(
  ALL_MISHNAYOT.map(unit => [`${unit.tractate}-${unit.chapter}-${unit.mishna}`, unit]),
);

const MISHNA_INDICES_BY_TRACTATE = new Map<string, number[]>();
const MISHNA_INDICES_BY_CHAPTER = new Map<string, number[]>();
for (const unit of ALL_MISHNAYOT) {
  const tractateIndices = MISHNA_INDICES_BY_TRACTATE.get(unit.tractate) ?? [];
  tractateIndices.push(unit.globalIndex);
  MISHNA_INDICES_BY_TRACTATE.set(unit.tractate, tractateIndices);

  const chapterKey = `${unit.tractate}-${unit.chapter}`;
  const chapterIndices = MISHNA_INDICES_BY_CHAPTER.get(chapterKey) ?? [];
  chapterIndices.push(unit.globalIndex);
  MISHNA_INDICES_BY_CHAPTER.set(chapterKey, chapterIndices);
}

function mishnaForReference(tractate: string, chapter: number, mishna: number) {
  return MISHNA_BY_REFERENCE.get(`${tractate}-${chapter}-${mishna}`);
}

function isLearned(progress?: MishnaProgressRecord) {
  return Boolean(
    progress?.learned
    || progress?.self_studied_at
    || progress?.listened_at
    || progress?.cycle_completed_at,
  );
}

function learningSources(progress?: MishnaProgressRecord) {
  const sources: string[] = [];
  if (progress?.learned_by_self_study || progress?.self_studied_at) sources.push('Self-study');
  if (progress?.learned_by_listening || progress?.listened_at) sources.push('Audio');
  if (progress?.learned_by_cycle || progress?.cycle_completed_at) sources.push('My Cycle');
  return sources;
}

function withSelfStudy(
  globalIndex: number,
  previous: MishnaProgressRecord | undefined,
  selfStudied: boolean,
  timestamp: string,
): MishnaProgressRecord {
  const hasOtherSource = Boolean(previous?.listened_at || previous?.cycle_completed_at);
  const learnedAfterChange = selfStudied || hasOtherSource;
  return {
    global_index: globalIndex,
    listened_at: previous?.listened_at ?? null,
    cycle_completed_at: previous?.cycle_completed_at ?? null,
    self_studied_at: selfStudied
      ? previous?.self_studied_at ?? timestamp
      : null,
    learned_at: learnedAfterChange ? previous?.learned_at ?? timestamp : null,
    learned_by_listening: Boolean(previous?.listened_at),
    learned_by_self_study: selfStudied,
    learned_by_cycle: Boolean(previous?.cycle_completed_at),
    learned: learnedAfterChange,
  };
}

function browsePath(seder?: string, tractate?: string, chapter?: number | null, mishna?: number | null) {
  const params = new URLSearchParams();
  if (seder) params.set('seder', seder);
  if (tractate) params.set('tractate', tractate);
  if (chapter != null) params.set('chapter', String(chapter));
  if (mishna != null) params.set('mishna', String(mishna));
  const query = params.toString();
  return query ? `/browse?${query}` : '/browse';
}

function positiveInteger(value: string | null) {
  if (!value || !/^\d+$/.test(value)) return null;
  const parsed = Number(value);
  return parsed > 0 ? parsed : null;
}

function getBrowserStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/* Six sedarim — muted earth tones, matching the homepage seder strip */
const SEDER_PALETTES = [
  { bg: 'rgba(160,120,64,0.09)', border: 'rgba(160,120,64,0.26)', accent: '#856230', hex: '#A07840', light: 'rgba(160,120,64,0.12)' }, // brass
  { bg: 'rgba(74,58,36,0.07)',   border: 'rgba(74,58,36,0.20)',   accent: '#4A3A24', hex: '#3D2E1A', light: 'rgba(74,58,36,0.1)' },   // espresso
  { bg: 'rgba(107,76,42,0.07)',  border: 'rgba(107,76,42,0.18)',  accent: '#6B4C2A', hex: '#8A5A2B', light: 'rgba(107,76,42,0.1)' },  // umber
  { bg: 'rgba(74,86,52,0.07)',   border: 'rgba(74,86,52,0.18)',   accent: '#4A5634', hex: '#5E6B3A', light: 'rgba(74,86,52,0.1)' },   // olive
  { bg: 'rgba(122,52,46,0.07)',  border: 'rgba(122,52,46,0.18)',  accent: '#7A342E', hex: '#94413A', light: 'rgba(122,52,46,0.1)' },  // terracotta
  { bg: 'rgba(61,73,84,0.07)',   border: 'rgba(61,73,84,0.18)',   accent: '#3D4954', hex: '#516170', light: 'rgba(61,73,84,0.1)' },   // slate
];

const SEDER_ORDER = ['Zeraim','Moed','Nashim','Nezikin','Kodashim','Taharot'];

function getPalette(sederName: string) {
  const idx = SEDER_ORDER.indexOf(sederName);
  return SEDER_PALETTES[idx >= 0 ? idx : 0];
}

export default function BrowsePage() {
  const mutationLock = useRef(false);
  const explicitBrowseLocation = useRef(false);
  const didResolveStudyResume = useRef(false);
  const [level, setLevel]                       = useState<Level>('seder');
  const [selectedSeder, setSelectedSeder]       = useState<SederInfo | null>(null);
  const [selectedTractate, setSelectedTractate] = useState<TractateInfo | null>(null);
  const [selectedChapter, setSelectedChapter]   = useState<number | null>(null);
  const [targetMishna, setTargetMishna]         = useState<number | null>(null);
  const [episodes, setEpisodes]                 = useState<EpisodeStub[]>([]);
  const [mishnaProgress, setMishnaProgress]     = useState<Record<number, MishnaProgressRecord>>({});
  const [progressReady, setProgressReady]       = useState(false);
  const [progressNotice, setProgressNotice]     = useState<'signed-out' | 'error' | null>(null);
  const [pendingMishnayot, setPendingMishnayot] = useState<Set<number>>(new Set());
  const [saveFailures, setSaveFailures]         = useState<Record<number, SaveFailure>>({});
  const [bulkConfirmation, setBulkConfirmation] = useState<BulkStudyScope | null>(null);
  const [pendingBulkKey, setPendingBulkKey]     = useState<string | null>(null);
  const [bulkFailure, setBulkFailure]           = useState<BulkSaveFailure | null>(null);
  const [progressAnnouncement, setProgressAnnouncement] = useState('');
  const [openText, setOpenText]                 = useState<string | null>(null);

  // Stable deep links can open any level, down to one Mishnah.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sederParam = params.get('seder');
    const tractateParam = params.get('tractate');
    let matchedSeder = sederParam
      ? SEDARIM.find(s => s.name.toLowerCase() === sederParam.toLowerCase()) ?? null
      : null;
    let matchedTractate: TractateInfo | null = null;

    if (tractateParam) {
      for (const seder of SEDARIM) {
        const tractate = seder.tractates.find(
          candidate => candidate.tractate.toLowerCase() === tractateParam.toLowerCase(),
        );
        if (tractate) {
          matchedSeder = seder;
          matchedTractate = tractate;
          break;
        }
      }
    }

    if (!matchedSeder) return;
    explicitBrowseLocation.current = true;
    setSelectedSeder(matchedSeder);

    if (!matchedTractate) {
      setLevel('tractate');
      return;
    }

    setSelectedTractate(matchedTractate);
    const requestedChapter = positiveInteger(params.get('chapter'));
    if (!requestedChapter || requestedChapter > matchedTractate.chapters.length) {
      setLevel('chapter');
      return;
    }

    setSelectedChapter(requestedChapter);
    setLevel('mishna');
    const requestedMishna = positiveInteger(params.get('mishna'));
    if (requestedMishna && requestedMishna <= matchedTractate.chapters[requestedChapter - 1]) {
      setTargetMishna(requestedMishna);
      setOpenText(`${requestedChapter}:${requestedMishna}`);
      const unit = mishnaForReference(
        matchedTractate.tractate,
        requestedChapter,
        requestedMishna,
      );
      if (unit) writeStudyResume(getBrowserStorage(), unit.globalIndex);
    }
  }, []);

  useEffect(() => {
    if (!selectedTractate || selectedChapter === null || targetMishna === null) return;
    const unit = mishnaForReference(selectedTractate.tractate, selectedChapter, targetMishna);
    if (!unit) return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`mishna-${unit.globalIndex}`)?.scrollIntoView({ block: 'center' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedChapter, selectedTractate, targetMishna]);

  useEffect(() => {
    if (!selectedTractate) { setEpisodes([]); return; }

    const controller = new AbortController();
    setEpisodes([]);
    fetch(`/api/episodes?tractate=${encodeURIComponent(selectedTractate.tractate)}`, {
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(d => setEpisodes(d.episodes ?? []))
      .catch(error => {
        if (error instanceof Error && error.name !== 'AbortError') setEpisodes([]);
      });

    return () => controller.abort();
  }, [selectedTractate]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProgress() {
      try {
        const response = await fetch('/api/progress', { signal: controller.signal });
        if (response.status === 401) {
          setProgressNotice('signed-out');
          return;
        }
        if (!response.ok) throw new Error('Progress request failed');

        const data = await response.json() as { mishnaProgress?: MishnaProgressRecord[] };
        const map: Record<number, MishnaProgressRecord> = {};
        for (const item of data.mishnaProgress ?? []) map[item.global_index] = item;
        setMishnaProgress(map);
        setProgressNotice(null);
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setProgressNotice('error');
      } finally {
        if (!controller.signal.aborted) setProgressReady(true);
      }
    }

    void loadProgress();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!progressReady || didResolveStudyResume.current) return;
    didResolveStudyResume.current = true;
    if (explicitBrowseLocation.current) return;

    const storage = getBrowserStorage();
    const selection = resolveStudyResume({
      localPointer: readStudyResume(storage),
      serverProgress: Object.values(mishnaProgress),
    });
    if (!selection) return;

    openStudyMishna(selection.globalIndex, true);
  // Initial resume runs once after progress/local state is available. Later
  // self-study mutations must not move the learner unexpectedly.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressReady, mishnaProgress]);

  const crumbs: Crumb[] = [{ label: 'All Sedarim', level: 'seder' }];
  if (selectedSeder)    crumbs.push({ label: selectedSeder.name,         level: 'tractate' });
  if (selectedTractate) crumbs.push({ label: selectedTractate.tractate,  level: 'chapter' });
  if (selectedChapter !== null) crumbs.push({ label: `Chapter ${selectedChapter}`, level: 'mishna' });

  function navigateTo(
    seder: SederInfo | null,
    tractate: TractateInfo | null = null,
    chapter: number | null = null,
    mishna: number | null = null,
    cancelPendingResume = true,
  ) {
    if (cancelPendingResume) didResolveStudyResume.current = true;
    setSelectedSeder(seder);
    setSelectedTractate(tractate);
    setSelectedChapter(chapter);
    setTargetMishna(mishna);
    setOpenText(null);
    setBulkConfirmation(null);
    setBulkFailure(null);
    setLevel(chapter !== null ? 'mishna' : tractate ? 'chapter' : seder ? 'tractate' : 'seder');
    window.history.replaceState(
      null,
      '',
      browsePath(seder?.name, tractate?.tractate, chapter, mishna),
    );
  }

  function openStudyMishna(globalIndex: number, remember: boolean) {
    const reference = ALL_MISHNAYOT[globalIndex - 1];
    if (!reference || reference.globalIndex !== globalIndex) return;
    const seder = SEDARIM.find(item => item.name === reference.seder) ?? null;
    const tractate = seder?.tractates.find(
      item => item.tractate === reference.tractate,
    ) ?? null;
    if (!seder || !tractate) return;

    navigateTo(seder, tractate, reference.chapter, reference.mishna, false);
    setOpenText(`${reference.chapter}:${reference.mishna}`);
    if (remember) writeStudyResume(getBrowserStorage(), reference.globalIndex);
  }

  function rememberNextStudyPlace(globalIndex: number, completed: boolean): number {
    const targetIndex = completed
      ? Math.min(globalIndex + 1, ALL_MISHNAYOT.length)
      : globalIndex;
    writeStudyResume(getBrowserStorage(), targetIndex);
    return targetIndex;
  }

  function toggleMishnaText(globalIndex: number, chapter: number, mishna: number) {
    const textKey = `${chapter}:${mishna}`;
    if (openText === textKey) {
      setOpenText(null);
      return;
    }

    setTargetMishna(mishna);
    setOpenText(textKey);
    window.history.replaceState(
      null,
      '',
      browsePath(
        selectedSeder?.name,
        selectedTractate?.tractate,
        chapter,
        mishna,
      ),
    );
    writeStudyResume(getBrowserStorage(), globalIndex);
  }

  function navTo(crumb: Crumb) {
    if (crumb.level === 'seder') navigateTo(null);
    else if (crumb.level === 'tractate') navigateTo(selectedSeder);
    else if (crumb.level === 'chapter') navigateTo(selectedSeder, selectedTractate);
  }

  function isCompleted(tractate: string, ch: number, m: number) {
    const unit = mishnaForReference(tractate, ch, m);
    return unit ? isLearned(mishnaProgress[unit.globalIndex]) : false;
  }

  function tractateCompletedCount(t: TractateInfo) {
    let n = 0;
    for (let ci = 0; ci < t.chapters.length; ci++)
      for (let mi = 1; mi <= t.chapters[ci]; mi++)
        if (isCompleted(t.tractate, ci + 1, mi)) n++;
    return n;
  }

  function episodeForMishna(globalIndex: number) {
    return episodes.find(ep =>
      ep.mishna_episode_units?.some(unit => unit.global_index === globalIndex),
    );
  }

  function signInForMishna(chapter: number, mishna: number) {
    const next = browsePath(
      selectedSeder?.name,
      selectedTractate?.tractate,
      chapter,
      mishna,
    );
    window.location.assign(`/auth/login?next=${encodeURIComponent(next)}`);
  }

  function signInForCurrentView() {
    const next = browsePath(
      selectedSeder?.name,
      selectedTractate?.tractate,
      selectedChapter,
      targetMishna,
    );
    window.location.assign(`/auth/login?next=${encodeURIComponent(next)}`);
  }

  async function saveBulkSelfStudy(scope: BulkStudyScope) {
    if (mutationLock.current || pendingBulkKey || pendingMishnayot.size > 0) return;
    setBulkConfirmation(null);

    if (progressNotice === 'signed-out') {
      signInForCurrentView();
      return;
    }
    if (!progressReady || progressNotice === 'error') return;

    const targetIndices = scope.globalIndices.filter(
      globalIndex => !mishnaProgress[globalIndex]?.self_studied_at,
    );
    if (targetIndices.length === 0) {
      setProgressAnnouncement(`All Mishnayot in ${scope.label} are already marked as self-studied.`);
      return;
    }

    const previous = new Map(
      targetIndices.map(globalIndex => [globalIndex, mishnaProgress[globalIndex]]),
    );
    const timestamp = new Date().toISOString();

    mutationLock.current = true;
    setPendingBulkKey(scope.key);
    setBulkFailure(null);
    setPendingMishnayot(current => {
      const next = new Set(current);
      for (const globalIndex of targetIndices) next.add(globalIndex);
      return next;
    });
    setSaveFailures(current => {
      const next = { ...current };
      for (const globalIndex of targetIndices) delete next[globalIndex];
      return next;
    });
    setMishnaProgress(current => {
      const next = { ...current };
      for (const globalIndex of targetIndices) {
        next[globalIndex] = withSelfStudy(
          globalIndex,
          current[globalIndex],
          true,
          timestamp,
        );
      }
      return next;
    });

    function restorePreviousProgress() {
      setMishnaProgress(current => {
        const next = { ...current };
        for (const globalIndex of targetIndices) {
          const item = previous.get(globalIndex);
          if (item) next[globalIndex] = item;
          else delete next[globalIndex];
        }
        return next;
      });
    }

    try {
      const response = await fetch('/api/progress/mishna/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scope: scope.kind,
          tractate: scope.tractate,
          ...(scope.chapter === undefined ? {} : { chapter: scope.chapter }),
        }),
      });

      if (response.status === 401) {
        restorePreviousProgress();
        setProgressNotice('signed-out');
        signInForCurrentView();
        return;
      }
      if (!response.ok) throw new Error('Bulk self-study save failed');

      const data = await response.json() as {
        mishnaProgress?: MishnaProgressRecord[];
      };
      if (data.mishnaProgress) {
        setMishnaProgress(current => {
          const next = { ...current };
          for (const item of data.mishnaProgress ?? []) {
            next[item.global_index] = item;
          }
          return next;
        });
      }
      const lastIndex = Math.max(...scope.globalIndices);
      if (Number.isFinite(lastIndex)) {
        const nextIndex = rememberNextStudyPlace(lastIndex, true);
        openStudyMishna(nextIndex, true);
      }
      setProgressAnnouncement(
        `All ${scope.globalIndices.length} Mishnayot in ${scope.label} are now marked as self-studied.`,
      );
    } catch {
      restorePreviousProgress();
      setBulkFailure({
        scope,
        message: `We couldn't mark ${scope.label}. Your previous progress is still shown.`,
      });
    } finally {
      mutationLock.current = false;
      setPendingBulkKey(null);
      setPendingMishnayot(current => {
        const next = new Set(current);
        for (const globalIndex of targetIndices) next.delete(globalIndex);
        return next;
      });
    }
  }

  async function saveSelfStudy(
    globalIndex: number,
    desiredSelfStudy: boolean,
    label: string,
    chapter: number,
    mishna: number,
  ) {
    if (mutationLock.current || pendingMishnayot.has(globalIndex) || pendingBulkKey) return;
    if (progressNotice === 'signed-out') {
      signInForMishna(chapter, mishna);
      return;
    }

    const previous = mishnaProgress[globalIndex];
    const optimistic = withSelfStudy(
      globalIndex,
      previous,
      desiredSelfStudy,
      new Date().toISOString(),
    );

    mutationLock.current = true;
    setBulkConfirmation(null);
    setBulkFailure(null);
    setPendingMishnayot(current => new Set(current).add(globalIndex));
    setSaveFailures(current => {
      const next = { ...current };
      delete next[globalIndex];
      return next;
    });
    setMishnaProgress(current => ({ ...current, [globalIndex]: optimistic }));

    try {
      const response = await fetch('/api/progress/mishna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ globalIndex, selfStudied: desiredSelfStudy }),
      });

      if (response.status === 401) {
        setMishnaProgress(current => {
          const next = { ...current };
          if (previous) next[globalIndex] = previous;
          else delete next[globalIndex];
          return next;
        });
        setProgressNotice('signed-out');
        signInForMishna(chapter, mishna);
        return;
      }

      if (!response.ok) throw new Error('Self-study save failed');
      const data = await response.json() as { mishnaProgress?: MishnaProgressRecord };
      if (data.mishnaProgress) {
        setMishnaProgress(current => ({
          ...current,
          [globalIndex]: data.mishnaProgress as MishnaProgressRecord,
        }));
      }
      const nextIndex = rememberNextStudyPlace(globalIndex, desiredSelfStudy);
      openStudyMishna(nextIndex, true);
      const remainingSources = learningSources(optimistic).filter(source => source !== 'Self-study');
      if (desiredSelfStudy) {
        setProgressAnnouncement(
          remainingSources.length > 0
            ? `Self-study recorded for ${label}. It was already learned through ${remainingSources.join(' and ')}.`
            : `Self-study recorded for ${label}.`,
        );
      } else {
        setProgressAnnouncement(
          remainingSources.length > 0
            ? `Self-study mark removed from ${label}. It remains learned through ${remainingSources.join(' and ')}.`
            : `Self-study mark removed from ${label}.`,
        );
      }
    } catch {
      setMishnaProgress(current => {
        const next = { ...current };
        if (previous) next[globalIndex] = previous;
        else delete next[globalIndex];
        return next;
      });
      setSaveFailures(current => ({
        ...current,
        [globalIndex]: {
          desiredSelfStudy,
          message: `We couldn't save ${label}. Your previous progress is still shown.`,
        },
      }));
    } finally {
      mutationLock.current = false;
      setPendingMishnayot(current => {
        const next = new Set(current);
        next.delete(globalIndex);
        return next;
      });
    }
  }

  const pal = selectedSeder ? getPalette(selectedSeder.name) : SEDER_PALETTES[0];

  function renderBulkStudyControl(scope: BulkStudyScope, confirmBeforeSaving: boolean) {
    const total = scope.globalIndices.length;
    const marked = scope.globalIndices.filter(
      globalIndex => Boolean(mishnaProgress[globalIndex]?.self_studied_at),
    ).length;
    const remaining = total - marked;
    const pending = pendingBulkKey === scope.key;
    const confirmationOpen = bulkConfirmation?.key === scope.key;
    const failure = bulkFailure?.scope.key === scope.key ? bulkFailure : null;
    const signedOut = progressNotice === 'signed-out';
    const unavailable = !progressReady
      || progressNotice === 'error'
      || pendingBulkKey !== null
      || pendingMishnayot.size > 0;
    const scopeKind = scope.kind === 'chapter' ? 'perek' : 'masechta';
    const confirmationId = `bulk-confirm-${scope.kind}-${scope.tractate
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')}-${scope.chapter ?? 'all'}`;

    function requestSave() {
      if (signedOut) {
        signInForCurrentView();
      } else if (confirmBeforeSaving) {
        setBulkFailure(null);
        setBulkConfirmation(scope);
      } else {
        void saveBulkSelfStudy(scope);
      }
    }

    return (
      <div className="rounded-xl border p-4 sm:p-5"
        style={{ background: pal.bg, borderColor: pal.border }}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="font-semibold" style={{ color: 'var(--fg)' }}>{scope.label} self-study</div>
            <p className="mt-1 text-sm" style={{ color: 'var(--muted)' }}>
              {signedOut
                ? 'Sign in to see and save your self-study progress.'
                : `${marked} of ${total} marked as self-studied.`}
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              This only adds Self-study. Audio and My Cycle stay unchanged.
            </p>
          </div>
          <button
            type="button"
            onClick={requestSave}
            disabled={remaining === 0 || unavailable}
            aria-busy={pending}
            aria-expanded={confirmBeforeSaving ? confirmationOpen : undefined}
            aria-controls={confirmBeforeSaving ? confirmationId : undefined}
            aria-label={remaining === 0
              ? `All ${total} Mishnayot in ${scope.label} are marked as self-studied`
              : signedOut
                ? `Sign in to mark this ${scopeKind} as self-studied`
                : `Mark ${remaining} remaining Mishnayot in ${scope.label} as self-studied`}
            className="btn-gold inline-flex min-h-11 w-full flex-shrink-0 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-55 sm:w-auto">
            {pending
              ? `Marking ${scopeKind}…`
              : !progressReady
                ? 'Loading progress…'
              : remaining === 0
                ? `All ${total} marked as self-studied`
                : signedOut
                  ? `Sign in to mark ${scopeKind}`
                  : marked === 0
                    ? `Mark whole ${scopeKind} (${total})`
                    : `Mark remaining ${remaining}`}
          </button>
        </div>

        {confirmationOpen && (
          <div id={confirmationId} role="group" aria-labelledby={`${confirmationId}-title`}
            className="mt-4 rounded-xl border bg-white/80 p-4">
            <p id={`${confirmationId}-title`} className="text-sm font-medium" style={{ color: 'var(--fg)' }}>
              Mark the remaining {remaining} Mishnayot in {scope.label} as self-studied?
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
              You can still remove any individual self-study mark later.
            </p>
            <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setBulkConfirmation(null)}
                className="min-h-11 rounded-xl border px-4 py-2 text-sm font-medium"
                style={{ borderColor: 'var(--border)', color: 'var(--fg)' }}>
                Cancel
              </button>
              <button type="button" onClick={() => void saveBulkSelfStudy(scope)}
                className="btn-gold min-h-11 rounded-xl px-4 py-2 text-sm font-semibold">
                Yes, mark {remaining}
              </button>
            </div>
          </div>
        )}

        {failure && (
          <div role="alert" className="mt-4 flex flex-col gap-2 rounded-xl border px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
            style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
            <span>{failure.message}</span>
            <button type="button" onClick={() => void saveBulkSelfStudy(scope)}
              className="min-h-11 flex-shrink-0 font-semibold underline underline-offset-2">
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Seder grid ──
  function renderSederLevel() {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {SEDARIM.map((seder, i) => {
          const p = SEDER_PALETTES[i];
          return (
            <button key={seder.name} onClick={() => navigateTo(seder)}
              className="group text-left p-7 rounded-2xl border transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: p.bg, borderColor: p.border }}>
              <div className="flex items-start justify-between mb-4">
                <div className="text-3xl font-bold leading-none" dir="rtl"
                  style={{ fontFamily: 'var(--font-hebrew)', color: p.accent }}>
                  {SEDER_HEBREW[seder.name]}
                </div>
                <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
                  style={{ background: p.light }}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: p.accent }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
              <div className="font-bold text-lg mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
                Seder {seder.name}
              </div>
              <div className="flex gap-3 text-xs mb-4" style={{ color: 'var(--muted)' }}>
                <span>{seder.tractates.length} tractates</span>
                <span>·</span>
                <span>{seder.totalMishnayot.toLocaleString()} mishnayot</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {seder.tractates.slice(0, 6).map(t => (
                  <span key={t.tractate} className="text-xs px-2 py-0.5 rounded-full border"
                    style={{ background: 'rgba(255,255,255,0.7)', borderColor: p.border, color: 'var(--muted)' }}>
                    {t.tractate}
                  </span>
                ))}
                {seder.tractates.length > 6 && (
                  <span className="text-xs px-2 py-0.5 rounded-full" style={{ color: 'var(--muted)' }}>
                    +{seder.tractates.length - 6}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Tractate grid ──
  function renderTractateLevel() {
    if (!selectedSeder) return null;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {selectedSeder.tractates.map(t => {
          const done = tractateCompletedCount(t);
          const pct  = t.totalMishnayot > 0 ? Math.round((done / t.totalMishnayot) * 100) : 0;
          return (
            <button key={t.tractate}
              onClick={() => navigateTo(selectedSeder, t)}
              className="group text-left p-6 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
              style={{ background: pal.bg, borderColor: pal.border }}>
              <div className="flex items-start justify-between mb-3">
                <div dir="rtl" className="text-xl font-bold"
                  style={{ fontFamily: 'var(--font-hebrew)', color: pal.accent }}>
                  {TRACTATE_HEBREW[t.tractate] ?? t.tractate}
                </div>
                {pct === 100 && (
                  <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background: '#ECFDF5' }}>
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#065F46' }}>
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                    </svg>
                  </div>
                )}
              </div>
              <div className="font-semibold mb-1" style={{ color: 'var(--fg)' }}>{t.tractate}</div>
              <div className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
                {t.chapters.length} chapters · {t.totalMishnayot} mishnayot
              </div>
              <div className="h-1.5 rounded-full overflow-hidden mb-1" style={{ background: 'rgba(0,0,0,0.06)' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : pal.hex }} />
              </div>
              <div className="text-xs" style={{ color: 'var(--muted)' }}>{done}/{t.totalMishnayot} complete</div>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Chapter grid ──
  function renderChapterLevel() {
    if (!selectedTractate) return null;
    const scope: BulkStudyScope = {
      key: `tractate:${selectedTractate.tractate}`,
      kind: 'tractate',
      tractate: selectedTractate.tractate,
      label: `Masechta ${selectedTractate.tractate}`,
      globalIndices: MISHNA_INDICES_BY_TRACTATE.get(selectedTractate.tractate) ?? [],
    };
    return (
      <div className="space-y-4">
        {renderBulkStudyControl(scope, true)}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {selectedTractate.chapters.map((mishnaCount, idx) => {
            const ch = idx + 1;
            let done = 0;
            for (let m = 1; m <= mishnaCount; m++)
              if (isCompleted(selectedTractate.tractate, ch, m)) done++;
            const pct = mishnaCount > 0 ? Math.round((done / mishnaCount) * 100) : 0;
            return (
              <button key={ch}
                onClick={() => navigateTo(selectedSeder, selectedTractate, ch)}
                className="group text-left p-5 rounded-xl border transition-all duration-200 cursor-pointer hover:shadow-md hover:-translate-y-0.5"
                style={{ background: pct === 100 ? 'rgba(6,95,70,0.05)' : pal.bg, borderColor: pct === 100 ? 'rgba(6,95,70,0.2)' : pal.border }}>
                <div className="text-2xl font-bold mb-1" style={{ color: pct === 100 ? '#065F46' : pal.accent }}>
                  {ch}
                </div>
                <div className="text-xs mb-3" style={{ color: 'var(--muted)' }}>
                  {mishnaCount} mishna{mishnaCount !== 1 ? 'yot' : 'h'}
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.06)' }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${pct}%`, background: pct === 100 ? '#10B981' : pal.hex }} />
                </div>
                {pct === 100 && (
                  <div className="text-xs mt-1.5 font-medium" style={{ color: '#065F46' }}>
                    ✓ Complete
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Mishna list ──
  function renderMishnaLevel() {
    if (!selectedTractate || selectedChapter === null) return null;
    const mishnaCount = selectedTractate.chapters[selectedChapter - 1];
    const scope: BulkStudyScope = {
      key: `chapter:${selectedTractate.tractate}:${selectedChapter}`,
      kind: 'chapter',
      tractate: selectedTractate.tractate,
      chapter: selectedChapter,
      label: `Perek ${selectedChapter} of ${selectedTractate.tractate}`,
      globalIndices: MISHNA_INDICES_BY_CHAPTER.get(
        `${selectedTractate.tractate}-${selectedChapter}`,
      ) ?? [],
    };
    return (
      <div className="space-y-2">
        <div className="mb-4">{renderBulkStudyControl(scope, false)}</div>
        <p className="mb-4 rounded-xl border px-4 py-3 text-sm leading-relaxed"
          style={{ background: 'rgba(201,169,110,0.07)', borderColor: 'rgba(201,169,110,0.25)', color: 'var(--muted)' }}>
          Tap a Mishnah number to record self-study. Listening and completed My Cycle days update the same progress without double-counting.
        </p>
        {Array.from({ length: mishnaCount }, (_, i) => i + 1).map(m => {
          const unit = mishnaForReference(selectedTractate.tractate, selectedChapter, m);
          if (!unit) return null;

          const ep = episodeForMishna(unit.globalIndex);
          const itemProgress = mishnaProgress[unit.globalIndex];
          const selfStudied = Boolean(itemProgress?.self_studied_at);
          const done = isLearned(itemProgress);
          const sources = learningSources(itemProgress);
          const pending = pendingMishnayot.has(unit.globalIndex);
          const mutationPending = pendingMishnayot.size > 0 || pendingBulkKey !== null;
          const failure = saveFailures[unit.globalIndex];
          const label = `${selectedTractate.tractate} ${selectedChapter}:${m}`;
          const textKey = `${selectedChapter}:${m}`;
          const isOpen = openText === textKey;
          const statusId = `mishna-status-${unit.globalIndex}`;
          const errorId = `mishna-error-${unit.globalIndex}`;
          const textId = `mishna-text-${unit.globalIndex}`;
          return (
            <div key={unit.globalIndex} id={`mishna-${unit.globalIndex}`}>
              <div
                className="flex flex-col items-stretch gap-3 rounded-xl border p-3 transition-all duration-200 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4"
                style={{
                  background: done ? 'rgba(6,95,70,0.04)' : 'rgba(255,255,255,0.7)',
                  borderColor: done ? 'rgba(6,95,70,0.18)' : 'var(--border)',
                  boxShadow: targetMishna === m ? `0 0 0 2px ${pal.hex}` : undefined,
                }}>
                <div className="flex min-w-0 items-center gap-4">
                  <button
                    type="button"
                    onClick={() => void saveSelfStudy(unit.globalIndex, !selfStudied, label, selectedChapter, m)}
                    disabled={!progressReady || mutationPending}
                    aria-pressed={selfStudied}
                    aria-busy={pending}
                    aria-describedby={`${statusId}${failure ? ` ${errorId}` : ''}`}
                    aria-label={progressNotice === 'signed-out'
                      ? `Sign in to record self-study for ${label}`
                      : selfStudied
                        ? `Remove self-study mark from ${label}`
                        : `Record self-study for ${label}`}
                    className="relative flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border text-sm font-bold transition-all disabled:cursor-wait disabled:opacity-65"
                    style={{
                      background: selfStudied ? 'rgba(201,169,110,0.16)' : 'var(--bg)',
                      borderColor: selfStudied ? 'var(--gold)' : 'var(--border)',
                      color: selfStudied ? 'var(--navy)' : 'var(--muted)',
                    }}>
                    <span aria-hidden="true">{m}</span>
                    {pending ? (
                      <svg aria-hidden="true" className="absolute -bottom-1 -right-1 h-4 w-4 animate-spin rounded-full bg-white p-0.5"
                        fill="none" viewBox="0 0 24 24" style={{ color: 'var(--gold-dark)' }}>
                        <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
                        <path className="opacity-80" fill="currentColor" d="M21 12a9 9 0 00-9-9v3a6 6 0 016 6h3z" />
                      </svg>
                    ) : selfStudied ? (
                      <span aria-hidden="true" className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full text-white"
                        style={{ background: '#065F46' }}>
                        <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                      </span>
                    ) : null}
                  </button>
                  <div className="min-w-0">
                    <div className="font-medium text-sm" style={{ color: 'var(--fg)' }}>{label}</div>
                    <div className="text-xs" dir="rtl" style={{ color: 'var(--muted)', fontFamily: 'var(--font-hebrew)' }}>
                      {TRACTATE_HEBREW[selectedTractate.tractate] ?? selectedTractate.tractate} {selectedChapter}:{m}
                    </div>
                    <div id={statusId} className="mt-1 flex min-w-0 items-center gap-1.5 text-xs"
                      style={{ color: done ? '#065F46' : 'var(--muted)' }}>
                      {done ? (
                        <>
                          <svg aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
                          <span className="min-w-0 break-words">Learned · {sources.join(' + ')}</span>
                        </>
                      ) : progressNotice === 'signed-out' ? (
                        <span>Sign in to see saved progress</span>
                      ) : !progressReady ? (
                        <span>Loading progress…</span>
                      ) : (
                        <span>Not yet learned</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                  <button type="button" onClick={() => toggleMishnaText(
                    unit.globalIndex,
                    selectedChapter,
                    m,
                  )}
                    aria-expanded={isOpen} aria-controls={textId}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer hover:shadow-sm"
                    style={{ background: isOpen ? pal.bg : 'var(--bg)', borderColor: pal.border, color: pal.accent }}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    {isOpen ? 'Hide' : 'Read'}
                  </button>
                  {ep ? (
                    <Link href={`/learn?episode=${ep.id}`}
                      className="inline-flex min-h-11 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium transition-all duration-200 cursor-pointer hover:shadow-sm"
                      style={{ background: pal.light, borderColor: pal.border, color: pal.accent }}>
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      Listen
                    </Link>
                  ) : (
                    <span className="text-xs px-3 py-1.5 rounded-full border" style={{ color: 'var(--muted)', borderColor: 'var(--border)' }}>
                      Coming soon
                    </span>
                  )}
                </div>
              </div>
              {failure && (
                <div id={errorId} role="alert" className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 text-xs"
                  style={{ background: '#FEF2F2', borderColor: '#FECACA', color: '#991B1B' }}>
                  <span>{failure.message}</span>
                  <button type="button"
                    onClick={() => void saveSelfStudy(unit.globalIndex, failure.desiredSelfStudy, label, selectedChapter, m)}
                    className="min-h-11 font-semibold underline underline-offset-2">
                    Retry
                  </button>
                </div>
              )}
              {isOpen && (
                <div id={textId} className="mt-2">
                  <MishnaText single={{ tractate: selectedTractate.tractate, chapter: selectedChapter, mishna: m }} compact />
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  }

  function pageHeading() {
    if (level === 'seder')    return { title: 'Browse Mishnayot', sub: 'Choose a Seder to explore all tractates' };
    if (level === 'tractate') return { title: `Seder ${selectedSeder?.name}`, sub: `${selectedSeder?.tractates.length} tractates · ${selectedSeder?.totalMishnayot?.toLocaleString()} mishnayot` };
    if (level === 'chapter')  return { title: selectedTractate?.tractate ?? '', sub: `${selectedTractate?.chapters.length} chapters · ${selectedTractate?.totalMishnayot} mishnayot` };
    return { title: `${selectedTractate?.tractate} — Chapter ${selectedChapter}`, sub: `${selectedTractate?.chapters[(selectedChapter ?? 1) - 1]} mishnayot` };
  }

  const { title, sub } = pageHeading();
  const currentBrowsePath = browsePath(
    selectedSeder?.name,
    selectedTractate?.tractate,
    selectedChapter,
    targetMishna,
  );

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>

      {/* Page header */}
      <div className="border-b" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
        <div className="px-6 lg:px-10 py-8" style={{ maxWidth: '1152px', margin: '0 auto' }}>
          {/* Breadcrumb */}
          <nav className="mb-5 flex flex-wrap items-center gap-1.5 text-sm" style={{ color: 'var(--muted)' }}>
            <Link href="/" className="transition-colors hover:text-[var(--navy)]" style={{ color: 'var(--muted)' }}>Home</Link>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
            {crumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1.5">
                {i < crumbs.length - 1 ? (
                  <>
                    <button onClick={() => navTo(crumb)}
                      className="transition-colors hover:text-[var(--navy)] cursor-pointer" style={{ color: 'var(--muted)' }}>
                      {crumb.label}
                    </button>
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                  </>
                ) : (
                  <span className="font-medium" style={{ color: 'var(--navy)' }}>{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>

          {/* Hebrew + title */}
          {level !== 'seder' && selectedSeder && (
            <div className="text-sm font-bold mb-1" dir="rtl"
              style={{ fontFamily: 'var(--font-hebrew)', color: pal.accent }}>
              {SEDER_HEBREW[selectedSeder.name]}
              {selectedTractate && ` · ${TRACTATE_HEBREW[selectedTractate.tractate] ?? selectedTractate.tractate}`}
            </div>
          )}
          <h1 className="text-3xl font-bold mb-1" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>
            {title}
          </h1>
          <p style={{ color: 'var(--muted)' }}>{sub}</p>
        </div>
      </div>

      <main className="px-6 lg:px-10 py-8" style={{ maxWidth: '1152px', margin: '0 auto' }}>
        <div className="sr-only" aria-live="polite" aria-atomic="true">{progressAnnouncement}</div>
        {/* Progress status notice */}
        {progressNotice === 'signed-out' && (
          <div className="mb-6 flex items-center justify-between gap-4 px-5 py-3.5 rounded-xl border text-sm"
            style={{ background: 'rgba(201,169,110,0.07)', borderColor: 'rgba(201,169,110,0.25)', color: 'var(--fg)' }}>
            <span>You&apos;re browsing as a guest — sign in to see and track your progress.</span>
            <Link href={`/auth/login?next=${encodeURIComponent(currentBrowsePath)}`} className="font-semibold whitespace-nowrap" style={{ color: 'var(--navy)' }}>
              Sign in →
            </Link>
          </div>
        )}
        {progressNotice === 'error' && (
          <div className="mb-6 px-5 py-3.5 rounded-xl border text-sm"
            style={{ background: 'rgba(239,68,68,0.05)', borderColor: 'rgba(239,68,68,0.2)', color: '#B91C1C' }}>
            We couldn&apos;t load your progress right now. Your completed mishnayot are safe — try refreshing.
          </div>
        )}

        {/* Back button */}
        {level !== 'seder' && (
          <button
            onClick={() => {
              if (level === 'tractate') navigateTo(null);
              else if (level === 'chapter') navigateTo(selectedSeder);
              else if (level === 'mishna') navigateTo(selectedSeder, selectedTractate);
            }}
            className="mb-6 flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border transition-all cursor-pointer hover:shadow-sm"
            style={{ color: 'var(--muted)', borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
            </svg>
            Back
          </button>
        )}

        {level === 'seder'    && renderSederLevel()}
        {level === 'tractate' && renderTractateLevel()}
        {level === 'chapter'  && renderChapterLevel()}
        {level === 'mishna'   && renderMishnaLevel()}
      </main>
    </div>
  );
}
