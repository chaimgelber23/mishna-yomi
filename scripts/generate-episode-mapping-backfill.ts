/**
 * Read-only generator for the one-time mishna_episode_units backfill.
 *
 * Input on stdin may be a JSON array or { "episodes": [...] } / { "data": [...] }.
 * Every row must contain the raw mishna_episodes `id` and `title` fields.
 *
 * PowerShell example:
 *   Get-Content .\raw-episodes.json -Raw |
 *     npx tsx scripts/generate-episode-mapping-backfill.ts > C:\tmp\mishna-backfill.sql
 *
 * The generator does not connect to Supabase and never reads credentials. The
 * emitted SQL validates that the input still exactly covers mishna_episodes
 * before it deletes or inserts any mapping rows.
 */

import { resolve as resolvePath } from 'node:path';
import process from 'node:process';
import { pathToFileURL } from 'node:url';
import { resolveEpisodeMapping } from '../src/lib/episode-mapping';

interface RawEpisode {
  id: string;
  title: string;
}

interface ExpectedMapping {
  episodeId: string;
  globalIndex: number;
  sequence: number;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function generateEpisodeMappingBackfillSql(input: unknown): string {
  const episodes = parseEpisodeRows(input);
  const episodeIds = new Set<string>();
  const mappings: ExpectedMapping[] = [];
  const unresolved: Array<{ id: string; title: string; reason: string }> = [];

  for (const episode of episodes) {
    if (episodeIds.has(episode.id)) {
      throw new Error(`Duplicate episode id in input: ${episode.id}`);
    }
    episodeIds.add(episode.id);

    const mapping = resolveEpisodeMapping(episode.title);
    if (!mapping.ok) {
      unresolved.push({ id: episode.id, title: episode.title, reason: mapping.reason });
      continue;
    }

    for (const unit of mapping.units) {
      mappings.push({
        episodeId: episode.id,
        globalIndex: unit.globalIndex,
        sequence: unit.sequence,
      });
    }
  }

  if (unresolved.length) {
    const details = unresolved
      .map(({ id, title, reason }) => `${id} | ${title} | ${reason}`)
      .join('\n');
    throw new Error(`Refusing to generate a partial backfill. Unresolved episodes:\n${details}`);
  }

  const values = mappings
    .map(
      ({ episodeId, globalIndex, sequence }) =>
        `  ('${episodeId}'::uuid, ${globalIndex}, ${sequence})`
    )
    .join(',\n');

  return `-- Generated from ${episodes.length} raw episodes; ${mappings.length} exact mapping rows.
begin;

create temporary table expected_mishna_episode_units (
  episode_id uuid not null,
  global_index integer not null,
  sequence smallint not null,
  primary key (episode_id, global_index),
  unique (episode_id, sequence)
) on commit drop;

insert into expected_mishna_episode_units (episode_id, global_index, sequence)
values
${values};

do $verify_input$
begin
  if (select count(*) from public.mishna_episodes) <>
     (select count(distinct episode_id) from expected_mishna_episode_units) then
    raise exception 'Raw episode export is stale or incomplete; no mappings changed';
  end if;

  if exists (
    select 1
    from public.mishna_episodes as episode
    left join expected_mishna_episode_units as expected
      on expected.episode_id = episode.id
    where expected.episode_id is null
  ) or exists (
    select 1
    from expected_mishna_episode_units as expected
    left join public.mishna_episodes as episode
      on episode.id = expected.episode_id
    where episode.id is null
  ) then
    raise exception 'Raw episode ids do not exactly match the live episode table; no mappings changed';
  end if;

  if exists (
    select episode_id
    from expected_mishna_episode_units
    group by episode_id
    having count(*) not in (1, 2)
       or min(sequence) <> 1
       or max(sequence) <> count(*)
       or max(global_index) - min(global_index) <> count(*) - 1
       or bool_or(global_index not between 1 and 4192)
  ) then
    raise exception 'Generated mapping invariants failed; no mappings changed';
  end if;
end
$verify_input$;

delete from public.mishna_episode_units;

insert into public.mishna_episode_units (
  episode_id,
  global_index,
  sequence,
  mapping_source,
  verified_at
)
select
  episode_id,
  global_index,
  sequence,
  'resolver_v1',
  now()
from expected_mishna_episode_units
order by episode_id, sequence;

do $verify_backfill$
begin
  if exists (
    (select episode_id, global_index, sequence from expected_mishna_episode_units
     except
     select episode_id, global_index, sequence from public.mishna_episode_units)
    union all
    (select episode_id, global_index, sequence from public.mishna_episode_units
     except
     select episode_id, global_index, sequence from expected_mishna_episode_units)
  ) then
    raise exception 'Mapping read-back differs from the generated set; transaction rolled back';
  end if;
end
$verify_backfill$;

commit;

-- Dynamic post-backfill invariants. These are reports, not hardcoded feed totals.
select
  (select count(*) from public.mishna_episodes) as episode_count,
  count(distinct episode_id) as mapped_episode_count,
  count(*) as relationship_count,
  count(distinct global_index) as distinct_mishna_count,
  count(*) filter (where sequence = 1) as first_sequence_count,
  count(*) filter (where sequence = 2) as second_sequence_count
from public.mishna_episode_units;

select episode_id, count(*) as mapping_count,
       min(global_index) as first_global_index,
       max(global_index) as last_global_index
from public.mishna_episode_units
group by episode_id
having count(*) not in (1, 2)
   or min(sequence) <> 1
   or max(sequence) <> count(*)
   or max(global_index) - min(global_index) <> count(*) - 1;

select episode.id, episode.guid, episode.title
from public.mishna_episodes as episode
left join public.mishna_episode_units as mapping
  on mapping.episode_id = episode.id
where mapping.episode_id is null;
`;
}

function parseEpisodeRows(input: unknown): RawEpisode[] {
  const container = input as { episodes?: unknown; data?: unknown } | null;
  const rows = Array.isArray(input)
    ? input
    : Array.isArray(container?.episodes)
      ? container.episodes
      : Array.isArray(container?.data)
        ? container.data
        : null;

  if (!rows?.length) {
    throw new Error('Input must contain a non-empty raw episode array.');
  }

  return rows.map((value, index) => {
    const row = value as Partial<RawEpisode> | null;
    if (!row || typeof row.id !== 'string' || !UUID_PATTERN.test(row.id)) {
      throw new Error(`Episode row ${index + 1} has an invalid UUID id.`);
    }
    if (typeof row.title !== 'string' || !row.title.trim()) {
      throw new Error(`Episode row ${index + 1} has no title.`);
    }
    return { id: row.id, title: row.title };
  });
}

async function readStdin(): Promise<string> {
  let input = '';
  process.stdin.setEncoding('utf8');
  for await (const chunk of process.stdin) input += chunk;
  return input;
}

async function run(): Promise<void> {
  try {
    const input = await readStdin();
    const sql = generateEpisodeMappingBackfillSql(JSON.parse(input));
    process.stdout.write(sql);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

const entryPath = process.argv[1] ? pathToFileURL(resolvePath(process.argv[1])).href : '';
if (entryPath === import.meta.url) void run();
