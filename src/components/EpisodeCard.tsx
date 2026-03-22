'use client';

import { formatDuration } from '@/lib/rss';

interface EpisodeCardProps {
  episode: {
    id: string;
    title: string;
    tractate?: string | null;
    chapterFrom?: number | null;
    mishnaFrom?: number | null;
    chapterTo?: number | null;
    mishnaTo?: number | null;
    durationSeconds?: number | null;
    publishedAt: string;
    mishnaDayNumber?: number | null;
  };
  isActive?: boolean;
  isCompleted?: boolean;
  isToday?: boolean;
  onClick?: () => void;
}

export default function EpisodeCard({
  episode,
  isActive = false,
  isCompleted = false,
  isToday = false,
  onClick,
}: EpisodeCardProps) {
  let refLabel = '';
  if (episode.tractate && episode.chapterFrom && episode.mishnaFrom) {
    if (episode.chapterFrom === episode.chapterTo) {
      refLabel = `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}–${episode.mishnaTo}`;
    } else {
      refLabel = `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}–${episode.chapterTo}:${episode.mishnaTo}`;
    }
  } else {
    refLabel = episode.title.replace(/^Mishna Yomi\s*[-:]\s*/i, '').replace(/\s*-\s*By.*$/i, '');
  }

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all"
      style={{
        background: isActive
          ? 'linear-gradient(135deg, rgba(180,83,9,0.15), rgba(12,26,53,0.8))'
          : isCompleted
            ? 'rgba(6,78,59,0.08)'
            : 'transparent',
        border: isActive
          ? '1px solid rgba(245,158,11,0.3)'
          : isToday
            ? '1px solid rgba(245,158,11,0.15)'
            : '1px solid transparent',
      }}
      onMouseEnter={e => {
        if (!isActive) (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.04)';
      }}
      onMouseLeave={e => {
        if (!isActive) (e.currentTarget as HTMLDivElement).style.background = isCompleted ? 'rgba(6,78,59,0.08)' : 'transparent';
      }}
    >
      {/* Status indicator */}
      <div
        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
        style={{
          background: isActive
            ? 'rgba(245,158,11,0.2)'
            : isCompleted
              ? 'rgba(16,185,129,0.15)'
              : 'rgba(255,255,255,0.04)',
          border: isActive
            ? '1px solid rgba(245,158,11,0.4)'
            : isCompleted
              ? '1px solid rgba(16,185,129,0.3)'
              : '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {isActive ? (
          <svg className="w-3.5 h-3.5 text-gold-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        ) : isCompleted ? (
          <svg className="w-3.5 h-3.5 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        ) : (
          <svg className="w-3 h-3 text-slate-600 group-hover:text-slate-400 transition-colors" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate transition-colors ${
            isActive ? 'text-gold-300' : 'text-slate-300 group-hover:text-parchment-100'
          }`}>
            {refLabel}
          </span>
          {isToday && !isActive && (
            <span className="flex-shrink-0 text-[9px] bg-gold-900/30 text-gold-500 border border-gold-800/40 px-1.5 py-0.5 rounded-full font-medium uppercase tracking-wide">
              Today
            </span>
          )}
        </div>
        {episode.mishnaDayNumber && (
          <span className="text-[11px] text-slate-600">Day {episode.mishnaDayNumber}</span>
        )}
      </div>

      {/* Duration */}
      {episode.durationSeconds && (
        <span className="flex-shrink-0 text-[11px] text-slate-600 font-mono">
          {formatDuration(episode.durationSeconds)}
        </span>
      )}
    </div>
  );
}
