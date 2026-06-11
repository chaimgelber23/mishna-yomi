import {
  ALL_MISHNAYOT,
  MISHNA_STRUCTURE,
  TOTAL_MISHNAYOT,
  MishnaReference,
} from './mishna-data';

/**
 * A personal learning cycle. Unlike the communal Mishna Yomit cycle
 * (fixed start date, 2/day), a custom cycle has its own start date,
 * pace, and starting point in Shas.
 */
export interface CustomCycle {
  id: string;
  name: string;
  start_date: string;        // 'YYYY-MM-DD'
  pace: number;              // mishnayot per day (>= 1)
  start_index: number;       // 0-based offset into ALL_MISHNAYOT
  target_date: string | null;
  is_active: boolean;
}

/** Parse a 'YYYY-MM-DD' date string as UTC midnight. */
export function parseDateUTC(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, (m || 1) - 1, d || 1));
}

/** Format a Date as 'YYYY-MM-DD'. */
export function toDateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Today's date as 'YYYY-MM-DD' in the user's local timezone. */
export function todayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Whole-day difference between two 'YYYY-MM-DD' strings (b - a). */
export function diffDays(a: string, b: string): number {
  return Math.round(
    (parseDateUTC(b).getTime() - parseDateUTC(a).getTime()) / 86_400_000
  );
}

/** 0-based global index of the first mishna of a tractate (or 0 if not found). */
export function tractateStartIndex(tractate: string): number {
  let idx = 0;
  for (const t of MISHNA_STRUCTURE) {
    if (t.tractate === tractate) return idx;
    idx += t.totalMishnayot;
  }
  return 0;
}

/** Mishnayot remaining in Shas from a given 0-based start index. */
export function remainingFromIndex(startIndex: number): number {
  return Math.max(0, TOTAL_MISHNAYOT - startIndex);
}

/** Total days a cycle takes from its start point at its pace. */
export function cycleTotalDays(cycle: Pick<CustomCycle, 'pace' | 'start_index'>): number {
  if (cycle.pace < 1) return 0;
  return Math.ceil(remainingFromIndex(cycle.start_index) / cycle.pace);
}

/**
 * 1-based day number of the cycle on a given date ('YYYY-MM-DD').
 * Returns 0 if the cycle hasn't started yet; clamps to the final day
 * once the cycle is complete.
 */
export function cycleDayNumber(cycle: CustomCycle, dateStr: string): number {
  const elapsed = diffDays(cycle.start_date, dateStr); // 0 on start day
  if (elapsed < 0) return 0;
  return Math.min(elapsed + 1, cycleTotalDays(cycle));
}

/** The mishnayot assigned to a given 1-based cycle day. */
export function mishnayotForCycleDay(cycle: CustomCycle, dayNumber: number): MishnaReference[] {
  if (dayNumber < 1) return [];
  const from = cycle.start_index + (dayNumber - 1) * cycle.pace;
  return ALL_MISHNAYOT.slice(from, from + cycle.pace);
}

/**
 * The pace (mishnayot/day) needed to finish Shas from a start index
 * by a target date, learning every day from the start date (inclusive).
 */
export function paceForTargetDate(startIndex: number, startDate: string, targetDate: string): number {
  const days = diffDays(startDate, targetDate) + 1;
  if (days < 1) return remainingFromIndex(startIndex); // finish in one day
  return Math.max(1, Math.ceil(remainingFromIndex(startIndex) / days));
}

/** Projected completion date ('YYYY-MM-DD') of a cycle. */
export function cycleEndDate(cycle: CustomCycle): string {
  const end = parseDateUTC(cycle.start_date);
  end.setUTCDate(end.getUTCDate() + cycleTotalDays(cycle) - 1);
  return toDateString(end);
}

/**
 * Human label for a list of consecutive mishnayot,
 * e.g. "Berakhot 1:1-3" or "Berakhot 9:5 – Pe'ah 1:2".
 */
export function mishnaRangeLabel(refs: MishnaReference[]): string {
  if (!refs.length) return '';
  const a = refs[0];
  const b = refs[refs.length - 1];
  if (refs.length === 1 || (a.tractate === b.tractate && a.chapter === b.chapter && a.mishna === b.mishna)) {
    return `${a.tractate} ${a.chapter}:${a.mishna}`;
  }
  if (a.tractate !== b.tractate) {
    return `${a.tractate} ${a.chapter}:${a.mishna} – ${b.tractate} ${b.chapter}:${b.mishna}`;
  }
  if (a.chapter === b.chapter) {
    return `${a.tractate} ${a.chapter}:${a.mishna}-${b.mishna}`;
  }
  return `${a.tractate} ${a.chapter}:${a.mishna}-${b.chapter}:${b.mishna}`;
}
