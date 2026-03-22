'use client';

import { formatDuration } from '@/lib/rss';

interface EpisodeCardProps {
  episode: { id: string; title: string; tractate?: string | null; chapterFrom?: number | null; mishnaFrom?: number | null; chapterTo?: number | null; mishnaTo?: number | null; durationSeconds?: number | null; publishedAt: string; mishnaDayNumber?: number | null; };
  isActive?: boolean; isCompleted?: boolean; isToday?: boolean; onClick?: () => void;
}

export default function EpisodeCard({ episode, isActive = false, isCompleted = false, isToday = false, onClick }: EpisodeCardProps) {
  let label = '';
  if (episode.tractate && episode.chapterFrom && episode.mishnaFrom) {
    label = episode.chapterFrom === episode.chapterTo
      ? `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}–${episode.mishnaTo}`
      : `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}–${episode.chapterTo}:${episode.mishnaTo}`;
  } else {
    label = episode.title.replace(/^Mishna Yomi\s*[-:]\s*/i, '').replace(/\s*-\s*By.*$/i, '');
  }

  return (
    <div onClick={onClick} className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border"
      style={{
        background: isActive ? 'rgba(30,58,95,0.06)' : isCompleted ? 'rgba(6,95,70,0.04)' : 'transparent',
        borderColor: isActive ? 'rgba(30,58,95,0.2)' : isCompleted ? 'rgba(167,243,208,0.6)' : isToday ? 'rgba(201,169,110,0.3)' : 'transparent',
      }}>
      <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center border transition-all"
        style={{
          background: isActive ? 'rgba(30,58,95,0.1)' : isCompleted ? '#ECFDF5' : 'var(--bg)',
          borderColor: isActive ? 'rgba(30,58,95,0.25)' : isCompleted ? '#A7F3D0' : 'var(--border)',
        }}>
        {isActive
          ? <svg className="w-3.5 h-3.5 ml-0.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--navy)' }}><path d="M8 5v14l11-7z"/></svg>
          : isCompleted
            ? <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: '#065F46' }}><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            : <svg className="w-3 h-3 ml-0.5" fill="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--muted)' }}><path d="M8 5v14l11-7z"/></svg>}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate" style={{ color: isActive ? 'var(--navy)' : 'var(--fg)' }}>{label}</span>
          {isToday && !isActive && (
            <span className="flex-shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full border"
              style={{ background: '#FFFBEB', borderColor: '#FDE68A', color: '#92400E' }}>Today</span>
          )}
        </div>
        {episode.mishnaDayNumber && <span className="text-[11px]" style={{ color: 'var(--muted)' }}>Day {episode.mishnaDayNumber}</span>}
      </div>

      {episode.durationSeconds && (
        <span className="flex-shrink-0 text-[11px] font-mono" style={{ color: 'var(--muted)' }}>
          {formatDuration(episode.durationSeconds)}
        </span>
      )}
    </div>
  );
}
