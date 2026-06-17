import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchRSSFeed } from '@/lib/rss';
import { getDayNumber } from '@/lib/calendar';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // Fail hard if the secret is not configured — never run unprotected.
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();
    const episodes = await fetchRSSFeed();

    let inserted = 0;
    let skipped = 0;
    let errors = 0;

    for (const ep of episodes) {
      // Only sync real Mishna Yomi shiurim. The feed also carries the podcast
      // trailer and the occasional other series (e.g. a single "Halacha Yomi"
      // episode) — those have no Mishna chapter:mishna reference, so skip them
      // until Halacha Yomi becomes its own project.
      if (!ep.tractate || ep.chapterFrom === null) { skipped++; continue; }

      // Calculate mishna_day_number from published date
      const dayNumber = getDayNumber(ep.publishedAt);

      const record = {
        guid: ep.guid,
        title: ep.title,
        description: ep.description,
        audio_url: ep.audioUrl,
        duration_seconds: ep.durationSeconds,
        published_at: ep.publishedAt.toISOString(),
        tractate: ep.tractate,
        chapter_from: ep.chapterFrom,
        mishna_from: ep.mishnaFrom,
        chapter_to: ep.chapterTo,
        mishna_to: ep.mishnaTo,
        mishna_day_number: dayNumber,
      };

      const { error } = await supabase
        .from('mishna_episodes')
        .upsert(record, { onConflict: 'guid' });

      if (error) {
        console.error('Upsert error:', ep.guid, error.message);
        errors++;
      } else {
        inserted++;
      }
    }

    // Cleanup: remove any rows a previous sync stored that aren't real Mishna
    // shiurim (trailer / Halacha Yomi / unparseable titles), so they don't
    // linger in the episode list or browse view. Best-effort — never fail the sync.
    const { error: cleanupError } = await supabase
      .from('mishna_episodes')
      .delete()
      .is('tractate', null);
    if (cleanupError) console.error('Cleanup (null tractate) failed:', cleanupError.message);

    return NextResponse.json({
      success: true,
      total: episodes.length,
      inserted,
      skipped,
      errors,
    });
  } catch (err) {
    console.error('RSS sync error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return POST(request);
}
