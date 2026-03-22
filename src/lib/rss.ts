// Edge-compatible RSS parser — no Node.js dependencies

export interface ParsedEpisode {
  guid: string;
  title: string;
  description: string | null;
  audioUrl: string;
  durationSeconds: number | null;
  publishedAt: Date;
  tractate: string | null;
  chapterFrom: number | null;
  mishnaFrom: number | null;
  chapterTo: number | null;
  mishnaTo: number | null;
}

const RSS_URL = 'https://anchor.fm/s/efb348c8/podcast/rss';

/** Extract a single XML tag value */
function tag(xml: string, name: string): string | null {
  // Try CDATA first
  const cdataRe = new RegExp(`<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${name}>`, 'i');
  const cdata = xml.match(cdataRe);
  if (cdata) return cdata[1].trim();

  const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i');
  const m = xml.match(re);
  return m ? m[1].trim() : null;
}

/** Extract an XML attribute value */
function attr(xml: string, tagName: string, attrName: string): string | null {
  const re = new RegExp(`<${tagName}[^>]+${attrName}="([^"]*)"`, 'i');
  const m = xml.match(re);
  return m ? m[1] : null;
}

/**
 * Parse episode title → tractate + mishna references
 * Handles:
 *   "Mishna Yomi - Kerisus 5:8-6:1"   (cross-chapter)
 *   "Mishna Yomi - Kerisus 5:4-5"      (same chapter)
 *   "Mishna Yomi - Kerisus 5:4"        (single)
 */
export function parseMishnaTitle(title: string) {
  const nil = { tractate: null, chapterFrom: null, mishnaFrom: null, chapterTo: null, mishnaTo: null };
  const cleaned = title.replace(/^Mishna\s+Yomi\s*[-:]\s*/i, '').trim();

  // Cross-chapter: "Name X:Y-W:Z"
  const cross = cleaned.match(/^(.+?)\s+(\d+):(\d+)\s*-\s*(\d+):(\d+)\s*$/);
  if (cross) return {
    tractate: cross[1].trim(),
    chapterFrom: +cross[2], mishnaFrom: +cross[3],
    chapterTo:   +cross[4], mishnaTo:   +cross[5],
  };

  // Same chapter: "Name X:Y-Z"
  const same = cleaned.match(/^(.+?)\s+(\d+):(\d+)\s*-\s*(\d+)\s*$/);
  if (same) return {
    tractate: same[1].trim(),
    chapterFrom: +same[2], mishnaFrom: +same[3],
    chapterTo:   +same[2], mishnaTo:   +same[4],
  };

  // Single: "Name X:Y"
  const single = cleaned.match(/^(.+?)\s+(\d+):(\d+)\s*$/);
  if (single) return {
    tractate: single[1].trim(),
    chapterFrom: +single[2], mishnaFrom: +single[3],
    chapterTo:   +single[2], mishnaTo:   +single[3],
  };

  return nil;
}

/** Parse iTunes duration string → seconds */
function parseDuration(d: string | null): number | null {
  if (!d) return null;
  if (/^\d+$/.test(d)) return +d;
  const parts = d.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

/** Fetch and parse the Mishna Yomi RSS feed using native fetch */
export async function fetchRSSFeed(): Promise<ParsedEpisode[]> {
  const res = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'MishnaYomi/1.0 RSS reader' },
  });

  if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);
  const xml = await res.text();

  // Split into <item> blocks
  const itemBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const episodes: ParsedEpisode[] = [];

  for (const block of itemBlocks) {
    const audioUrl = attr(block, 'enclosure', 'url');
    if (!audioUrl) continue;

    const title       = tag(block, 'title') ?? 'Untitled';
    const guid        = tag(block, 'guid') ?? audioUrl;
    const description = tag(block, 'description') ?? tag(block, 'itunes:summary') ?? null;
    const durationRaw = tag(block, 'itunes:duration');
    const pubDate     = tag(block, 'pubDate') ?? tag(block, 'dc:date');
    const publishedAt = pubDate ? new Date(pubDate) : new Date();

    episodes.push({
      guid,
      title,
      description,
      audioUrl,
      durationSeconds: parseDuration(durationRaw),
      publishedAt,
      ...parseMishnaTitle(title),
    });
  }

  return episodes.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
}

/** Format seconds → M:SS or H:MM:SS */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}
