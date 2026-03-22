import { DAY_TO_MISHNAYOT, MishnaReference, ALL_MISHNAYOT, TOTAL_MISHNAYOT } from './mishna-data';

// The current Mishna Yomit cycle started on December 25, 2021 (21 Tevet 5782)
export const CYCLE_START = new Date('2021-12-25T00:00:00.000Z');

// Total number of days in one complete cycle
export const TOTAL_CYCLE_DAYS = DAY_TO_MISHNAYOT.length;

/**
 * Returns the 1-based sequential day number for a given date,
 * wrapping around if we're past the end of one cycle.
 */
export function getDayNumber(date: Date): number {
  const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const diffMs = utcDate.getTime() - CYCLE_START.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return 1;
  // Wrap around cycle
  return (diffDays % TOTAL_CYCLE_DAYS) + 1;
}

/**
 * Returns the 2 Mishnayot for a given cycle day number (1-based)
 */
export function getMishnayotForDay(dayNumber: number): MishnaReference[] {
  const idx = Math.max(0, Math.min(dayNumber - 1, TOTAL_CYCLE_DAYS - 1));
  return DAY_TO_MISHNAYOT[idx] || [];
}

/**
 * Returns today's 2 Mishnayot
 */
export function getTodaysMishnayot(): MishnaReference[] {
  return getMishnayotForDay(getDayNumber(new Date()));
}

/**
 * Returns a human-readable label for a pair of mishnayot
 * e.g. "Berakhot 1:1-2" or "Berakhot 1:5-2:1"
 */
export function getMishnaPairLabel(pair: MishnaReference[]): string {
  if (!pair.length) return '';
  if (pair.length === 1) {
    return `${pair[0].tractate} ${pair[0].chapter}:${pair[0].mishna}`;
  }
  const [a, b] = pair;
  if (a.tractate !== b.tractate) {
    return `${a.tractate} ${a.chapter}:${a.mishna} – ${b.tractate} ${b.chapter}:${b.mishna}`;
  }
  if (a.chapter === b.chapter) {
    return `${a.tractate} ${a.chapter}:${a.mishna}-${b.mishna}`;
  }
  return `${a.tractate} ${a.chapter}:${a.mishna}-${b.chapter}:${b.mishna}`;
}

/**
 * Returns the calendar date for a given day number in the current cycle
 */
export function getDateForDayNumber(dayNumber: number): Date {
  const d = new Date(CYCLE_START);
  d.setUTCDate(d.getUTCDate() + (dayNumber - 1));
  return d;
}

/**
 * Returns a range of calendar entries around the current day
 */
export interface CalendarEntry {
  date: Date;
  dayNumber: number;
  mishnayot: MishnaReference[];
  label: string;
  isToday: boolean;
}

export function getCalendarRange(centerDate: Date, rangeDays: number = 30): CalendarEntry[] {
  const entries: CalendarEntry[] = [];
  const today = new Date();
  const todayStr = `${today.getUTCFullYear()}-${today.getUTCMonth()}-${today.getUTCDate()}`;

  for (let offset = -Math.floor(rangeDays / 2); offset <= Math.floor(rangeDays / 2); offset++) {
    const d = new Date(centerDate);
    d.setUTCDate(d.getUTCDate() + offset);
    const dayNum = getDayNumber(d);
    const mishnayot = getMishnayotForDay(dayNum);
    const dStr = `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;

    entries.push({
      date: d,
      dayNumber: dayNum,
      mishnayot,
      label: getMishnaPairLabel(mishnayot),
      isToday: dStr === todayStr,
    });
  }

  return entries;
}

/**
 * Format a date nicely
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

/**
 * Given number of completed mishnayot and current pace, project completion date
 */
export function projectCompletionDate(completedCount: number): Date | null {
  if (completedCount <= 0) return null;
  const remaining = TOTAL_MISHNAYOT - completedCount;
  // Mishna Yomit pace: 2 per day
  const daysRemaining = Math.ceil(remaining / 2);
  const completion = new Date();
  completion.setDate(completion.getDate() + daysRemaining);
  return completion;
}

/**
 * Returns a concise summary of today for display
 */
export function getTodaySummary(): { dayNumber: number; mishnayot: MishnaReference[]; label: string; dateLabel: string } {
  const today = new Date();
  const dayNumber = getDayNumber(today);
  const mishnayot = getMishnayotForDay(dayNumber);
  return {
    dayNumber,
    mishnayot,
    label: getMishnaPairLabel(mishnayot),
    dateLabel: formatDate(today),
  };
}
