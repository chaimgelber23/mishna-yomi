import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

/**
 * GET /api/episodes?tractate=Keritot
 * Returns all episodes for a given tractate (for the browse page).
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tractate = searchParams.get('tractate');

  try {
    const supabase = await createServiceClient();

    let query = supabase
      .from('mishna_episodes')
      .select('id, title, audio_url, tractate, chapter_from, mishna_from, chapter_to, mishna_to, published_at, duration_seconds')
      .order('published_at', { ascending: true });

    if (tractate) {
      query = query.ilike('tractate', tractate);
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({ episodes: data ?? [] });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error', episodes: [] },
      { status: 500 }
    );
  }
}
