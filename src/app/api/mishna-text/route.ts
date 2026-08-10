import { NextRequest, NextResponse } from 'next/server';
import { fetchMishnayotText } from '@/lib/sefaria';
import { getMishnayotForDay, TOTAL_CYCLE_DAYS } from '@/lib/calendar';
import { ALL_MISHNAYOT, type MishnaReference } from '@/lib/mishna-data';

export const runtime = 'edge';

/**
 * GET /api/mishna-text
 *
 *   ?day=42                          → the 2 mishnayot of cycle day 42
 *   ?tractate=Berakhot&chapter=1&mishna=1   → a single mishna
 *
 * Returns { mishnayot: [{ label, ref, he, en }] }.
 * The Mishna text is immutable, so the response is cached aggressively.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  let refs: Pick<MishnaReference, 'tractate' | 'chapter' | 'mishna'>[] = [];

  const day = searchParams.get('day');
  const tractate = searchParams.get('tractate');
  const indices = searchParams.get('indices');

  if (indices) {
    const parsed = [...new Set(indices.split(',').map(value => Number(value)))];
    if (
      parsed.length >= 1 &&
      parsed.length <= 10 &&
      parsed.every(index => Number.isInteger(index) && index >= 1 && index <= ALL_MISHNAYOT.length)
    ) {
      refs = parsed.map(index => ALL_MISHNAYOT[index - 1]);
    }
  } else if (day) {
    const n = parseInt(day, 10);
    // Range-check so a junk day returns 400 rather than a silently-clamped day.
    if (Number.isInteger(n) && n >= 1 && n <= TOTAL_CYCLE_DAYS) refs = getMishnayotForDay(n);
  } else if (tractate) {
    const chapter = parseInt(searchParams.get('chapter') ?? '', 10);
    const mishna = parseInt(searchParams.get('mishna') ?? '', 10);
    if (Number.isFinite(chapter) && Number.isFinite(mishna)) {
      refs = [{ tractate, chapter, mishna }];
    }
  }

  if (!refs.length) {
    return NextResponse.json({ error: 'Provide valid ?indices=, ?day=N, or ?tractate=&chapter=&mishna=' }, { status: 400 });
  }

  try {
    const mishnayot = await fetchMishnayotText(refs);
    // Only cache hard when every mishna actually came back with text. If a
    // Sefaria hiccup degraded any to empty, cache briefly so a good refetch
    // can replace it rather than pinning an empty result in the CDN for a year.
    const degraded = mishnayot.some(m => !m.he && !m.en);
    const cacheControl = degraded
      ? 'public, max-age=60, must-revalidate'
      : 'public, max-age=86400, s-maxage=31536000, immutable';
    return NextResponse.json({ mishnayot }, { headers: { 'Cache-Control': cacheControl } });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', mishnayot: [] },
      { status: 500 }
    );
  }
}
