// Edge-compatible RSS parser -- no Node.js dependencies.

import {
  parseMishnaTitle,
  type ParsedMishnaTitle,
} from './episode-mapping';

export { normalizeTractate, parseMishnaTitle } from './episode-mapping';

export interface ParsedEpisode extends ParsedMishnaTitle {
  guid: string;
  title: string;
  description: string | null;
  audioUrl: string;
  durationSeconds: number | null;
  publishedAt: Date;
}

const RSS_URL = 'https://anchor.fm/s/efb348c8/podcast/rss';

function tag(xml: string, name: string): string | null {
  const cdataPattern = new RegExp(
    `<${name}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${name}>`,
    'i'
  );
  const cdata = xml.match(cdataPattern);
  if (cdata) return cdata[1].trim();

  const pattern = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, 'i');
  const match = xml.match(pattern);
  return match ? match[1].trim() : null;
}

function attr(xml: string, tagName: string, attrName: string): string | null {
  const pattern = new RegExp(`<${tagName}[^>]+${attrName}="([^"]*)"`, 'i');
  const match = xml.match(pattern);
  return match ? match[1] : null;
}

function parseDuration(value: string | null): number | null {
  if (!value) return null;
  if (/^\d+$/.test(value)) return Number(value);

  const parts = value.split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

export async function fetchRSSFeed(): Promise<ParsedEpisode[]> {
  const response = await fetch(RSS_URL, {
    headers: { 'User-Agent': 'MishnaYomi/1.0 RSS reader' },
  });

  if (!response.ok) throw new Error(`RSS fetch failed: ${response.status}`);
  const xml = await response.text();
  const itemBlocks = xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ?? [];
  const episodes: ParsedEpisode[] = [];

  for (const block of itemBlocks) {
    const audioUrl = attr(block, 'enclosure', 'url');
    if (!audioUrl) continue;

    const title = tag(block, 'title') ?? 'Untitled';
    const guid = tag(block, 'guid') ?? audioUrl;
    const description = tag(block, 'description') ?? tag(block, 'itunes:summary') ?? null;
    const duration = tag(block, 'itunes:duration');
    const publication = tag(block, 'pubDate') ?? tag(block, 'dc:date');
    const publishedAt = publication ? new Date(publication) : new Date();

    episodes.push({
      guid,
      title,
      description,
      audioUrl,
      durationSeconds: parseDuration(duration),
      publishedAt,
      ...parseMishnaTitle(title),
    });
  }

  return episodes.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}
