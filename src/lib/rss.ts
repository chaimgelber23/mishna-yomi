import Parser from 'rss-parser';

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

/**
 * Parse episode title to extract tractate and mishna references
 * Handles patterns like:
 * - "Mishna Yomi - Kerisus 5:4-5"         (same chapter)
 * - "Mishna Yomi - Kerisus 5:8-6:1"       (cross-chapter)
 * - "Mishna Yomi - Bava Kamma 3:4-5"      (tractate with space)
 */
export function parseMishnaTitle(title: string): {
  tractate: string | null;
  chapterFrom: number | null;
  mishnaFrom: number | null;
  chapterTo: number | null;
  mishnaTo: number | null;
} {
  const nullResult = { tractate: null, chapterFrom: null, mishnaFrom: null, chapterTo: null, mishnaTo: null };

  // Remove prefix like "Mishna Yomi - " or "Mishna Yomi: "
  let cleaned = title.replace(/^Mishna\s+Yomi\s*[-:]\s*/i, '').trim();

  // Cross-chapter: "Tractate Name X:Y-W:Z"
  const crossChapterRegex = /^(.+?)\s+(\d+):(\d+)\s*-\s*(\d+):(\d+)\s*$/;
  const crossMatch = cleaned.match(crossChapterRegex);
  if (crossMatch) {
    return {
      tractate: crossMatch[1].trim(),
      chapterFrom: parseInt(crossMatch[2], 10),
      mishnaFrom: parseInt(crossMatch[3], 10),
      chapterTo: parseInt(crossMatch[4], 10),
      mishnaTo: parseInt(crossMatch[5], 10),
    };
  }

  // Same chapter: "Tractate Name X:Y-Z"
  const sameChapterRegex = /^(.+?)\s+(\d+):(\d+)\s*-\s*(\d+)\s*$/;
  const sameMatch = cleaned.match(sameChapterRegex);
  if (sameMatch) {
    return {
      tractate: sameMatch[1].trim(),
      chapterFrom: parseInt(sameMatch[2], 10),
      mishnaFrom: parseInt(sameMatch[3], 10),
      chapterTo: parseInt(sameMatch[2], 10), // same chapter
      mishnaTo: parseInt(sameMatch[4], 10),
    };
  }

  // Single mishna: "Tractate Name X:Y"
  const singleRegex = /^(.+?)\s+(\d+):(\d+)\s*$/;
  const singleMatch = cleaned.match(singleRegex);
  if (singleMatch) {
    return {
      tractate: singleMatch[1].trim(),
      chapterFrom: parseInt(singleMatch[2], 10),
      mishnaFrom: parseInt(singleMatch[3], 10),
      chapterTo: parseInt(singleMatch[2], 10),
      mishnaTo: parseInt(singleMatch[3], 10),
    };
  }

  return nullResult;
}

/**
 * Parse iTunes duration string (e.g. "00:15:30" or "930") to seconds
 */
function parseDuration(duration: string | undefined): number | null {
  if (!duration) return null;

  // Numeric string (seconds)
  if (/^\d+$/.test(duration)) {
    return parseInt(duration, 10);
  }

  // HH:MM:SS or MM:SS
  const parts = duration.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }

  return null;
}

type FeedItem = {
  guid?: string;
  title?: string;
  contentSnippet?: string;
  content?: string;
  enclosure?: { url?: string };
  itunes?: { duration?: string };
  pubDate?: string;
  isoDate?: string;
};

/**
 * Fetch and parse the RSS feed
 */
export async function fetchRSSFeed(): Promise<ParsedEpisode[]> {
  const parser = new Parser({
    customFields: {
      item: [
        ['itunes:duration', 'itunes.duration'],
        ['itunes:summary', 'itunes.summary'],
      ],
    },
  });

  const feed = await parser.parseURL(RSS_URL);
  const episodes: ParsedEpisode[] = [];

  for (const item of (feed.items as FeedItem[])) {
    const audioUrl = item.enclosure?.url;
    if (!audioUrl) continue;

    const guid = item.guid || audioUrl;
    const title = item.title || 'Untitled';
    const description = item.contentSnippet || item.content || item.itunes?.duration || null;
    const duration = parseDuration(item.itunes?.duration);
    const publishedAt = item.isoDate ? new Date(item.isoDate) : (item.pubDate ? new Date(item.pubDate) : new Date());

    const parsed = parseMishnaTitle(title);

    episodes.push({
      guid,
      title,
      description: typeof description === 'string' ? description : null,
      audioUrl,
      durationSeconds: duration,
      publishedAt,
      ...parsed,
    });
  }

  // Sort by published date ascending
  return episodes.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
}

/**
 * Format duration in seconds to MM:SS or HH:MM:SS
 */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;

  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${m}:${String(s).padStart(2, '0')}`;
}
