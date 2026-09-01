import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  EpisodeProgressRow,
  MishnaProgressRow,
  emptyMishnaProgress,
  parseEpisodeProgressMutation,
  postgresMutationStatus,
  sortEpisodeMappings,
} from '@/lib/progress';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

async function readJson(request: NextRequest): Promise<unknown | null> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

// GET /api/progress — fetch playback state and deduplicated Mishnah progress.
export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [episodeResult, mishnaResult] = await Promise.all([
    supabase
      .from('mishna_progress')
      .select(`
        id,
        episode_id,
        completed,
        position_seconds,
        completed_at,
        updated_at,
        mishna_episodes (
          id,
          title,
          tractate,
          chapter_from,
          mishna_from,
          chapter_to,
          mishna_to,
          mishna_day_number,
          audio_url,
          duration_seconds,
          published_at,
          mishna_episode_units (global_index, sequence)
        )
      `)
      .eq('user_id', user.id),
    supabase
      .from('mishna_canonical_progress')
      .select(`
        user_id,
        global_index,
        listened_at,
        self_studied_at,
        cycle_completed_at,
        learned_at,
        learned_by_listening,
        learned_by_self_study,
        learned_by_cycle,
        learned
      `)
      .eq('user_id', user.id)
      .order('global_index', { ascending: true }),
  ]);

  if (episodeResult.error) {
    return NextResponse.json({ error: episodeResult.error.message }, { status: 500 });
  }
  if (mishnaResult.error) {
    return NextResponse.json({ error: mishnaResult.error.message }, { status: 500 });
  }

  const episodeProgress = sortEpisodeMappings(
    (episodeResult.data ?? []) as unknown as EpisodeProgressRow[]
  );
  const mishnaProgress = (mishnaResult.data ?? []) as unknown as MishnaProgressRow[];

  return NextResponse.json({ episodeProgress, mishnaProgress });
}

// POST /api/progress — save playback position and/or an explicit listened state.
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = parseEpisodeProgressMutation(await readJson(request));
  if ('error' in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!user.email) {
    return NextResponse.json({ error: 'An email address is required to save progress' }, { status: 409 });
  }

  const { error: profileError } = await supabase
    .from('mishna_users')
    .upsert({ id: user.id, email: user.email }, { onConflict: 'id' });

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const mutation = parsed.value;

  if (mutation.hasPosition) {
    const { error } = await supabase.rpc('save_mishna_episode_position', {
      p_episode_id: mutation.episodeId,
      p_position_seconds: mutation.positionSeconds,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: postgresMutationStatus(error.code) }
      );
    }
  }

  if (mutation.hasCompletion) {
    const { error } = await supabase.rpc('set_mishna_episode_listened', {
      p_episode_id: mutation.episodeId,
      p_listened: mutation.completed,
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: postgresMutationStatus(error.code) }
      );
    }
  }

  const [progressResult, mappingResult] = await Promise.all([
    supabase
      .from('mishna_progress')
      .select('id, episode_id, completed, position_seconds, completed_at, updated_at')
      .eq('user_id', user.id)
      .eq('episode_id', mutation.episodeId)
      .maybeSingle(),
    supabase
      .from('mishna_episode_units')
      .select('global_index, sequence')
      .eq('episode_id', mutation.episodeId)
      .order('sequence', { ascending: true }),
  ]);

  if (progressResult.error) {
    return NextResponse.json({ error: progressResult.error.message }, { status: 500 });
  }
  if (mappingResult.error) {
    return NextResponse.json({ error: mappingResult.error.message }, { status: 500 });
  }

  const globalIndices = (mappingResult.data ?? []).map((row) => row.global_index);
  let mishnaProgress: MishnaProgressRow[] = [];

  if (globalIndices.length > 0) {
    const { data: canonicalRows, error: canonicalError } = await supabase
      .from('mishna_canonical_progress')
      .select(`
        user_id,
        global_index,
        listened_at,
        self_studied_at,
        cycle_completed_at,
        learned_at,
        learned_by_listening,
        learned_by_self_study,
        learned_by_cycle,
        learned
      `)
      .eq('user_id', user.id)
      .in('global_index', globalIndices);

    if (canonicalError) {
      return NextResponse.json({ error: canonicalError.message }, { status: 500 });
    }

    const rowsByIndex = new Map(
      ((canonicalRows ?? []) as unknown as MishnaProgressRow[])
        .map((row) => [row.global_index, row])
    );
    mishnaProgress = globalIndices.map((globalIndex) =>
      rowsByIndex.get(globalIndex)
      ?? { user_id: user.id, ...emptyMishnaProgress(globalIndex) }
    );
  }

  return NextResponse.json({
    progress: progressResult.data,
    mishnaProgress,
  });
}
