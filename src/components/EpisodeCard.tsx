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
  // Build reference label
  let refLabel = '';
  if (episode.tractate && episode.chapterFrom && episode.mishnaFrom) {
    if (episode.chapterFrom === episode.chapterTo) {
      refLabel = `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}–${episode.mishnaTo}`;
    } else {
      refLabel = `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}–${episode.chapterTo}:${episode.mishnaTo}`;
    }
  } else {
    refLabel = episode.title.replace(/^Mishna Yomi\s*[-:]\s*/i, '');
  }

  const date = new Date(episode.publishedAt);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div
      onClick={onClick}
      className={`
        flex items-center gap-4 px-4 py-3 rounded-xl cursor-pointer transition-all border
        ${isActive
          ? 'bg-gold-900/20 border-gold-600 shadow-gold'
          : isCompleted
            ? 'bg-green-900/10 border-green-800 hover:border-green-600'
            : isToday
              ? 'bg-navy-700/60 border-gold-700/40 hover:border-gold-600'
              : 'bg-navy-800/50 border-navy-600 hover:border-navy-500'
        }
      `}
    >
      {/* Status icon */}
      <div className={`
        flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm
        ${isActive ? 'bg-gold-500 text-navy-950' : isCompleted ? 'bg-green-800 text-green-300' : 'bg-navy-700 text-slate-400'}
      `}>
        {isActive ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        ) : isCompleted ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`font-semibold text-sm ${isActive ? 'text-gold-300' : 'text-parchment-100'} truncate`}>
            {refLabel}
          </span>
          {isToday && !isActive && (
            <span className="text-[10px] bg-gold-900/40 text-gold-500 px-2 py-0.5 rounded-full font-medium flex-shrink-0">
              Today
            </span>
          )}
        </div>
        <span className="text-xs text-slate-500">{dateStr}</span>
      </div>

      {/* Duration */}
      {episode.durationSeconds && (
        <span className="flex-shrink-0 text-xs text-slate-500 font-mono">
          {formatDuration(episode.durationSeconds)}
        </span>
      )}

      {/* Day number */}
      {episode.mishnaDayNumber && (
        <span className="flex-shrink-0 text-xs text-slate-600">
          Day {episode.mishnaDayNumber}
        </span>
      )}
    </div>
  );
}
