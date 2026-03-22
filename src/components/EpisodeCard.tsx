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

export default function EpisodeCard({ episode, isActive = false, isCompleted = false, isToday = false, onClick }: EpisodeCardProps) {
  let refLabel = '';
  if (episode.tractate && episode.chapterFrom && episode.mishnaFrom) {
    refLabel = episode.chapterFrom === episode.chapterTo
      ? `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}–${episode.mishnaTo}`
      : `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}–${episode.chapterTo}:${episode.mishnaTo}`;
  } else {
    refLabel = episode.title.replace(/^Mishna Yomi\s*[-:]\s*/i, '').replace(/\s*-\s*By.*$/i, '');
  }

  return (
    <div onClick={onClick}
      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all border ${
        isActive
          ? 'bg-amber-50 border-gold-300 shadow-sm'
          : isCompleted
            ? 'bg-emerald-50/60 border-emerald-200 hover:border-emerald-300'
            : isToday
              ? 'bg-gold-50 border-gold-200 hover:border-gold-300'
              : 'bg-white border-stone-100 hover:border-stone-300 hover:bg-stone-50'
      }`}>

      {/* Status icon */}
      <div className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
        isActive ? 'bg-gold-100 border border-gold-300'
        : isCompleted ? 'bg-emerald-100 border border-emerald-200'
        : 'bg-stone-100 border border-stone-200 group-hover:border-stone-300'
      }`}>
        {isActive
          ? <svg className="w-3.5 h-3.5 text-gold-600 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
          : isCompleted
            ? <svg className="w-3.5 h-3.5 text-emerald-600" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
            : <svg className="w-3 h-3 text-stone-400 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium truncate ${isActive ? 'text-gold-800' : 'text-stone-700 group-hover:text-stone-900'}`}>
            {refLabel}
          </span>
          {isToday && !isActive && (
            <span className="flex-shrink-0 text-[9px] bg-gold-100 text-gold-700 border border-gold-200 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">
              Today
            </span>
          )}
        </div>
        {episode.mishnaDayNumber && (
          <span className="text-[11px] text-stone-400">Day {episode.mishnaDayNumber}</span>
        )}
      </div>

      {/* Duration */}
      {episode.durationSeconds && (
        <span className="flex-shrink-0 text-[11px] text-stone-400 font-mono">
          {formatDuration(episode.durationSeconds)}
        </span>
      )}
    </div>
  );
}
