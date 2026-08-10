import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import {
  choosePreferredMappedEpisodes,
  normalizeTractate,
} from '@/lib/episode-mapping';
import { ALL_MISHNAYOT } from '@/lib/mishna-data';

export const dynamic = 'force-dynamic';
export const runtime = 'edge';

const PAGE_SIZE = 1000;
const EPISODE_SELECT = `
  id,
  title,
  audio_url,
  tractate,
  chapter_from,
  mishna_from,
  chapter_to,
  mishna_to,
  mishna_day_number,
  published_at,
  duration_seconds,
  mishna_episode_units (
    global_index,
    sequence,
    mapping_source,
    verified_at
  )
`;

interface EpisodeMappingRow {
  global_index: number;
  sequence: number;
  mapping_source: string;
  verified_at: string;
}

interface EpisodeRow {
  id: string;
  title: string;
  audio_url: string;
  tractate: string;
  chapter_from: number;
  mishna_from: number;
  chapter_to: number;
  mishna_to: number;
  mishna_day_number: number;
  published_at: string | null;
  duration_seconds: number | null;
  mishna_episode_units: EpisodeMappingRow[] | null;
}

/**
 * GET /api/episodes?tractate=Kelim
 *
 * Tractate filtering uses canonical mapping rows, not the legacy first
 * tractate column, so a cross-tractate lesson is discoverable from both ends.
 */
export async function GET(request: NextRequest) {
  const requestedTractate = new URL(request.url).searchParams.get('tractate');

  try {
    const supabase = createServiceClient();
    let episodeIds: string[] | null = null;

    if (requestedTractate) {
      const tractate = normalizeTractate(requestedTractate);
      const refs = ALL_MISHNAYOT.filter((ref) => ref.tractate === tractate);
      if (!refs.length) {
        return NextResponse.json(
          { error: `Unknown tractate: ${requestedTractate}`, episodes: [] },
          { status: 400 }
        );
      }

      const firstIndex = refs[0].globalIndex;
      const lastIndex = refs[refs.length - 1].globalIndex;
      const { data: mappingRows, error: mappingError } = await supabase
        .from('mishna_episode_units')
        .select('episode_id')
        .gte('global_index', firstIndex)
        .lte('global_index', lastIndex);

      if (mappingError) throw mappingError;
      episodeIds = [...new Set((mappingRows ?? []).map((row) => row.episode_id as string))];
      if (!episodeIds.length) {
        return NextResponse.json({ episodes: [], duplicatesRemoved: 0 });
      }
    }

    const rows: EpisodeRow[] = [];
    for (let offset = 0; ; offset += PAGE_SIZE) {
      let query = supabase
        .from('mishna_episodes')
        .select(EPISODE_SELECT)
        .order('published_at', { ascending: true })
        .order('id', { ascending: true })
        .range(offset, offset + PAGE_SIZE - 1);

      if (episodeIds) query = query.in('id', episodeIds);

      const { data, error } = await query;
      if (error) throw error;

      const page = (data ?? []) as EpisodeRow[];
      rows.push(...page);
      if (page.length < PAGE_SIZE) break;
    }

    const mappedRows = rows
      .map((episode) => ({
        ...episode,
        mishna_episode_units: [...(episode.mishna_episode_units ?? [])].sort(
          (a, b) => a.sequence - b.sequence || a.global_index - b.global_index
        ),
      }))
      .filter((episode) => episode.mishna_episode_units.length > 0);

    const episodes = choosePreferredMappedEpisodes(mappedRows);
    return NextResponse.json({
      episodes,
      duplicatesRemoved: mappedRows.length - episodes.length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Unknown error',
        episodes: [],
      },
      { status: 500 }
    );
  }
}
