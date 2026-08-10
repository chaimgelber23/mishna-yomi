/**
 * Seed/update episodes through the same exact resolver and protected RPC as
 * the production RSS sync. Run with:
 *
 *   npx tsx scripts/seed-db.mjs
 *
 * Plain `node` is intentionally unsupported because this script imports the
 * TypeScript source of truth. Failing before a write is safer than maintaining
 * a second, lossy parser here.
 */

import { createClient } from '@supabase/supabase-js';
import episodeMappingModule from '../src/lib/episode-mapping';
import calendarModule from '../src/lib/calendar';

const {
  isPotentialMishnaLesson,
  resolveEpisodeMapping,
} = episodeMappingModule;
const { getDayNumber } = calendarModule;

const url = process.env.MISHNA_SUPABASE_URL
  ?? process.env.SUPABASE_URL
  ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Set MISHNA_SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL) and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const RSS_URL = 'https://anchor.fm/s/efb348c8/podcast/rss';
const SYNC_CONCURRENCY = 6;

function getTag(xml, name) {
  const cdata = xml.match(
    new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${name}>`, 'i')
  );
  if (cdata) return cdata[1].trim();
  const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i'));
  return match ? match[1].trim() : null;
}

function getAttr(xml, tag, attr) {
  const match = xml.match(new RegExp(`<${tag}[^>]+${attr}="([^"]*)"`, 'i'));
  return match ? match[1] : null;
}

function parseDuration(value) {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);
  const parts = value.split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

async function run() {
  console.log('Fetching RSS...');
  const response = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'MishnaYomi/1.0 database seed' },
  });
  if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);

  const xml = await response.text();
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const candidates = [];
  const unresolved = [];
  let skipped = 0;

  for (const block of items) {
    const audioUrl = getAttr(block, 'enclosure', 'url');
    if (!audioUrl) continue;

    const title = getTag(block, 'title') ?? 'Untitled';
    const mapping = resolveEpisodeMapping(title);
    if (!mapping.ok) {
      if (isPotentialMishnaLesson(title)) {
        unresolved.push({ title, reason: mapping.reason });
      } else {
        skipped++;
      }
      continue;
    }

    const publication = getTag(block, 'pubDate') ?? getTag(block, 'dc:date');
    const publishedAt = publication ? new Date(publication) : new Date();
    if (Number.isNaN(publishedAt.getTime())) {
      unresolved.push({ title, reason: `Invalid publication date: ${publication}` });
      continue;
    }

    candidates.push({
      guid: getTag(block, 'guid') ?? audioUrl,
      title,
      description: getTag(block, 'description') ?? getTag(block, 'itunes:summary') ?? null,
      audioUrl,
      durationSeconds: parseDuration(getTag(block, 'itunes:duration')),
      publishedAt,
      mapping,
    });
  }

  if (unresolved.length) {
    console.error('Refusing a partial seed. Unresolved Mishnah lessons:', unresolved);
    process.exitCode = 1;
    return;
  }

  console.log(`Resolved ${candidates.length} lessons; skipped ${skipped} non-lesson items.`);
  let synced = 0;
  const failures = [];

  for (let offset = 0; offset < candidates.length; offset += SYNC_CONCURRENCY) {
    const batch = candidates.slice(offset, offset + SYNC_CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (candidate) => {
        const first = candidate.mapping.units[0];
        const last = candidate.mapping.units[candidate.mapping.units.length - 1];
        const { error } = await supabase.rpc('sync_mishna_episode', {
          p_guid: candidate.guid,
          p_title: candidate.title,
          p_description: candidate.description,
          p_audio_url: candidate.audioUrl,
          p_duration_seconds: candidate.durationSeconds,
          p_published_at: candidate.publishedAt.toISOString(),
          p_tractate: first.tractate,
          p_chapter_from: first.chapter,
          p_mishna_from: first.mishna,
          p_chapter_to: last.chapter,
          p_mishna_to: last.mishna,
          p_mishna_day_number: getDayNumber(candidate.publishedAt),
          p_global_indices: candidate.mapping.globalIndices,
        });
        return error ? { title: candidate.title, error: error.message } : null;
      })
    );

    for (const failure of results) {
      if (failure) failures.push(failure);
      else synced++;
    }
    process.stdout.write(`\r  ${synced}/${candidates.length}`);
  }

  console.log('');
  if (failures.length) {
    console.error(`Seed completed with ${failures.length} RPC failures:`, failures.slice(0, 25));
    process.exitCode = 1;
    return;
  }

  console.log(`Done. Synced ${synced} exact episode mappings.`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
