import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { fetchRSSFeed } from '@/lib/rss';
import { getDayNumber } from '@/lib/calendar';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = await createServiceClient();
    const episodes = await fetchRSSFeed();

    let inserted = 0;
    let updated = 0;
    let errors = 0;

    for (const ep of episodes) {
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

    return NextResponse.json({
      success: true,
      total: episodes.length,
      inserted,
      updated,
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
