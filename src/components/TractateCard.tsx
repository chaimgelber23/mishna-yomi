'use client';

import { useState } from 'react';
import ProgressBar from './ProgressBar';
import { TractateInfo, TRACTATE_HEBREW } from '@/lib/mishna-data';

interface TractateCardProps {
  tractate: TractateInfo;
  completedCount: number;
  isCurrentTractate?: boolean;
  currentChapter?: number;
  currentMishna?: number;
  onSelect?: (tractate: string) => void;
}

export default function TractateCard({
  tractate,
  completedCount,
  isCurrentTractate = false,
  currentChapter,
  currentMishna,
  onSelect,
}: TractateCardProps) {
  const [expanded, setExpanded] = useState(false);
  const pct = tractate.totalMishnayot > 0
    ? (completedCount / tractate.totalMishnayot) * 100
    : 0;

  const statusColor = completedCount === 0
    ? 'border-navy-600'
    : completedCount === tractate.totalMishnayot
      ? 'border-green-700'
      : isCurrentTractate
        ? 'border-gold-600'
        : 'border-navy-500';

  const statusBg = completedCount === tractate.totalMishnayot
    ? 'bg-green-900/10'
    : isCurrentTractate
      ? 'bg-gold-900/10'
      : '';

  return (
    <div
      className={`border ${statusColor} ${statusBg} rounded-xl overflow-hidden transition-all hover:border-opacity-80 cursor-pointer`}
      onClick={() => { setExpanded(!expanded); onSelect?.(tractate.tractate); }}
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-parchment-100 text-sm truncate">
                {tractate.tractate}
              </span>
              {completedCount === tractate.totalMishnayot && (
                <span className="text-green-400 text-xs">✓</span>
              )}
              {isCurrentTractate && (
                <span className="text-xs bg-gold-900/40 text-gold-400 px-1.5 py-0.5 rounded text-[10px] font-medium">
                  Current
                </span>
              )}
            </div>
            <span className="text-xs text-slate-600 block" dir="rtl">
              {TRACTATE_HEBREW[tractate.tractate] || ''}
            </span>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs font-mono text-gold-500">{pct.toFixed(0)}%</span>
            <span className="text-xs text-slate-600 block">{completedCount}/{tractate.totalMishnayot}</span>
          </div>
        </div>

        <ProgressBar
          value={pct}
          height="sm"
          color={completedCount === tractate.totalMishnayot ? 'green' : 'gold'}
        />

        {isCurrentTractate && currentChapter && currentMishna && (
          <p className="text-xs text-gold-500 mt-2">
            Currently on Chapter {currentChapter}, Mishna {currentMishna}
          </p>
        )}
      </div>

      {/* Chapter breakdown when expanded */}
      {expanded && (
        <div className="border-t border-navy-700 px-4 py-3 bg-navy-900/50">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider">Chapters</p>
          <div className="grid grid-cols-6 gap-1">
            {tractate.chapters.map((mishnaCount, ci) => {
              const chapterIdx = ci;
              // We can't know exact per-chapter completion without deeper data here
              // Show chapter count info
              return (
                <div
                  key={ci}
                  className="text-center bg-navy-800 rounded p-1"
                  title={`Chapter ${ci + 1}: ${mishnaCount} mishnayot`}
                >
                  <span className="text-[10px] text-slate-500 block">{ci + 1}</span>
                  <span className="text-[10px] text-slate-600">{mishnaCount}m</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-slate-600 mt-2">
            {tractate.chapters.length} chapters · {tractate.totalMishnayot} mishnayot
          </p>
        </div>
      )}
    </div>
  );
}
