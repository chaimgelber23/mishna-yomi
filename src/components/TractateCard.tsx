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
    ? 'border-[#E4D8C0]'
    : completedCount === tractate.totalMishnayot
      ? 'border-green-300'
      : isCurrentTractate
        ? 'border-[#C9A96E]'
        : 'border-[#E4D8C0]';

  const statusBg = completedCount === tractate.totalMishnayot
    ? 'bg-green-50'
    : isCurrentTractate
      ? 'bg-[#C9A96E]/10'
      : 'bg-white';

  return (
    <div
      className={`border ${statusColor} ${statusBg} rounded-xl overflow-hidden transition-all cursor-pointer`}
      onClick={() => { setExpanded(!expanded); onSelect?.(tractate.tractate); }}
    >
      <div className="px-4 py-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm truncate" style={{ color: 'var(--fg)' }}>
                {tractate.tractate}
              </span>
              {completedCount === tractate.totalMishnayot && (
                <span className="text-green-600 text-xs">✓</span>
              )}
              {isCurrentTractate && (
                <span className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{ background: 'rgba(201,169,110,0.15)', color: 'var(--gold-dark)' }}>
                  Current
                </span>
              )}
            </div>
            <span className="text-xs block" dir="rtl" style={{ color: 'var(--muted)', fontFamily: 'var(--font-hebrew)' }}>
              {TRACTATE_HEBREW[tractate.tractate] || ''}
            </span>
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-xs font-mono" style={{ color: 'var(--gold-dark)' }}>{pct.toFixed(0)}%</span>
            <span className="text-xs block" style={{ color: 'var(--muted)' }}>{completedCount}/{tractate.totalMishnayot}</span>
          </div>
        </div>

        <ProgressBar
          value={pct}
          height="sm"
          color={completedCount === tractate.totalMishnayot ? 'green' : 'gold'}
        />

        {isCurrentTractate && currentChapter && currentMishna && (
          <p className="text-xs mt-2" style={{ color: 'var(--gold-dark)' }}>
            Currently on Chapter {currentChapter}, Mishna {currentMishna}
          </p>
        )}
      </div>

      {/* Chapter breakdown when expanded */}
      {expanded && (
        <div className="border-t px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <p className="text-xs mb-2 uppercase tracking-wider" style={{ color: 'var(--muted)' }}>Chapters</p>
          <div className="grid grid-cols-6 gap-1">
            {tractate.chapters.map((mishnaCount, ci) => {
              const _chapterIdx = ci;
              // We can't know exact per-chapter completion without deeper data here
              // Show chapter count info
              return (
                <div
                  key={ci}
                  className="text-center rounded p-1 border"
                  style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                  title={`Chapter ${ci + 1}: ${mishnaCount} mishnayot`}
                >
                  <span className="text-[10px] block" style={{ color: 'var(--fg)' }}>{ci + 1}</span>
                  <span className="text-[10px]" style={{ color: 'var(--muted)' }}>{mishnaCount}m</span>
                </div>
              );
            })}
          </div>
          <p className="text-xs mt-2" style={{ color: 'var(--muted)' }}>
            {tractate.chapters.length} chapters · {tractate.totalMishnayot} mishnayot
          </p>
        </div>
      )}
    </div>
  );
}
