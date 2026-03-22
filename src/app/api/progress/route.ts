import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

// GET /api/progress — fetch user's progress
export async function GET() {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('mishna_progress')
    .select(`
      id,
      episode_id,
      completed,
      position_seconds,
      completed_at,
      mishna_episodes (
        id, title, tractate, chapter_from, mishna_from, chapter_to, mishna_to, mishna_day_number, audio_url, duration_seconds, published_at
      )
    `)
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ progress: data });
}

// POST /api/progress — upsert progress for an episode
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { episodeId, completed, positionSeconds } = body;

  if (!episodeId) {
    return NextResponse.json({ error: 'episodeId required' }, { status: 400 });
  }

  // Ensure user record exists
  const { error: userError } = await supabase
    .from('mishna_users')
    .upsert({ id: user.id, email: user.email! }, { onConflict: 'id' });

  if (userError) {
    console.error('User upsert error:', userError);
  }

  const record: Record<string, unknown> = {
    user_id: user.id,
    episode_id: episodeId,
    position_seconds: positionSeconds ?? 0,
    completed: completed ?? false,
  };

  if (completed) {
    record.completed_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('mishna_progress')
    .upsert(record, { onConflict: 'user_id,episode_id' })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ progress: data });
}
