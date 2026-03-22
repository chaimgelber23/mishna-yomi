import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://trakxowvjsosbzbbfoxq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRyYWt4b3d2anNvc2J6YmJmb3hxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzE3NTA4NCwiZXhwIjoyMDg4NzUxMDg0fQ.onKKdDaYVitrHIOCLUACd0OOfAAbFP8IHEx-U60oKCI'
);

const CYCLE_START = new Date('2021-12-25');
function getDayNumber(date) {
  return Math.floor((date.getTime() - CYCLE_START.getTime()) / 86400000) + 1;
}

const TRACTATE_MAP = {
  'Shabbos':'Shabbat','Kesubos':'Ketubot','Gitin':'Gittin','Kidushin':'Kiddushin',
  'Bava Kama':'Bava Kamma','Bava Basra':'Bava Batra','Makos':'Makkot','Shevuos':'Shevuot',
  'Eduyos':'Eduyot','Avos':'Avot','Horayos':'Horayot','Menachos':'Menachot',
  'Chulin':'Chullin','Bechoros':'Bekhorot','Erchin':'Arakhin','Kerisus':'Keritot','Nida':'Niddah',
};
function normalize(name) {
  if (!name) return null;
  const clean = name.replace(/\s+\d+:\d+\s*-.*$/, '').trim();
  return TRACTATE_MAP[clean] ?? clean;
}

function parseMishnaTitle(title) {
  const cleaned = title.replace(/^Mishna\s+Yomi\s*[-:]\s*/i, '').replace(/\s*-\s*By.*$/i, '').trim();
  const cross = cleaned.match(/^(.+?)\s+(\d+):(\d+)\s*-\s*(\d+):(\d+)\s*$/);
  if (cross) return { tractate: normalize(cross[1].trim()), chapterFrom: +cross[2], mishnaFrom: +cross[3], chapterTo: +cross[4], mishnaTo: +cross[5] };
  const same = cleaned.match(/^(.+?)\s+(\d+):(\d+)\s*-\s*(\d+)\s*$/);
  if (same) return { tractate: normalize(same[1].trim()), chapterFrom: +same[2], mishnaFrom: +same[3], chapterTo: +same[2], mishnaTo: +same[4] };
  const single = cleaned.match(/^(.+?)\s+(\d+):(\d+)\s*$/);
  if (single) return { tractate: normalize(single[1].trim()), chapterFrom: +single[2], mishnaFrom: +single[3], chapterTo: +single[2], mishnaTo: +single[3] };
  return { tractate: null, chapterFrom: null, mishnaFrom: null, chapterTo: null, mishnaTo: null };
}

function getTag(xml, name) {
  const cd = xml.match(new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${name}>`, 'i'));
  if (cd) return cd[1].trim();
  const m = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`, 'i'));
  return m ? m[1].trim() : null;
}
function getAttr(xml, tag, attr) {
  const m = xml.match(new RegExp(`<${tag}[^>]+${attr}="([^"]*)"`, 'i'));
  return m ? m[1] : null;
}
function parseDuration(d) {
  if (!d) return null;
  if (/^\d+$/.test(d)) return +d;
  const p = d.split(':').map(Number);
  if (p.length === 3) return p[0]*3600 + p[1]*60 + p[2];
  if (p.length === 2) return p[0]*60 + p[1];
  return null;
}

async function run() {
  console.log('Fetching RSS...');
  const res = await fetch('https://anchor.fm/s/efb348c8/podcast/rss', {
    headers: { 'User-Agent': 'MishnaYomi/1.0' }
  });
  const xml = await res.text();
  const items = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  console.log(`Found ${items.length} episodes`);

  const records = [];
  for (const block of items) {
    const audioUrl = getAttr(block, 'enclosure', 'url');
    if (!audioUrl) continue;
    const title = getTag(block, 'title') ?? 'Untitled';
    const guid = getTag(block, 'guid') ?? audioUrl;
    const pubDate = getTag(block, 'pubDate');
    const publishedAt = pubDate ? new Date(pubDate) : new Date();
    const duration = parseDuration(getTag(block, 'itunes:duration'));
    const parsed = parseMishnaTitle(title);
    records.push({
      guid: guid.slice(0, 500),
      title: title.slice(0, 500),
      description: null,
      audio_url: audioUrl.slice(0, 1000),
      duration_seconds: duration,
      published_at: publishedAt.toISOString(),
      tractate: parsed.tractate,
      chapter_from: parsed.chapterFrom,
      mishna_from: parsed.mishnaFrom,
      chapter_to: parsed.chapterTo,
      mishna_to: parsed.mishnaTo,
      mishna_day_number: getDayNumber(publishedAt),
    });
  }

  console.log(`Upserting ${records.length} records in batches...`);
  let inserted = 0, errors = 0;
  const BATCH = 50;
  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH);
    const { error } = await supabase.from('mishna_episodes').upsert(batch, { onConflict: 'guid' });
    if (error) {
      console.error(`Batch ${i}-${i+BATCH} error:`, error.message, error.details);
      errors += batch.length;
    } else {
      inserted += batch.length;
      process.stdout.write(`\r  ${inserted}/${records.length}`);
    }
  }
  console.log(`\nDone. Inserted: ${inserted}, Errors: ${errors}`);

  const { count } = await supabase.from('mishna_episodes').select('*', { count: 'exact', head: true });
  console.log('Total rows in DB:', count);
}

run().catch(console.error);
