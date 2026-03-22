'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { formatDuration } from '@/lib/rss';

interface Episode {
  id: string;
  title: string;
  audioUrl: string;
  durationSeconds?: number | null;
  tractate?: string | null;
  chapterFrom?: number | null;
  mishnaFrom?: number | null;
  chapterTo?: number | null;
  mishnaTo?: number | null;
}

interface AudioPlayerProps {
  episode: Episode;
  onComplete?: () => void;
  onPositionChange?: (seconds: number) => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
  initialPosition?: number;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function AudioPlayer({
  episode,
  onComplete,
  onPositionChange,
  onPrev,
  onNext,
  hasPrev = false,
  hasNext = false,
  initialPosition = 0,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(episode.durationSeconds || 0);
  const [speedIdx, setSpeedIdx] = useState(1); // default 1x
  const [completed, setCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);

  const storageKey = `mishna-pos-${episode.id}`;

  // Load saved position from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const pos = parseInt(saved, 10);
      if (!isNaN(pos) && pos > 0) {
        setCurrentTime(pos);
      }
    } else if (initialPosition > 0) {
      setCurrentTime(initialPosition);
    }
  }, [episode.id, initialPosition, storageKey]);

  // Seek to saved position once loaded
  useEffect(() => {
    if (loaded && audioRef.current && currentTime > 0) {
      audioRef.current.currentTime = currentTime;
    }
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update speed
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = SPEEDS[speedIdx];
    }
  }, [speedIdx]);

  const savePosition = useCallback((time: number) => {
    localStorage.setItem(storageKey, String(Math.floor(time)));
    onPositionChange?.(Math.floor(time));
  }, [storageKey, onPositionChange]);

  function handleTimeUpdate() {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setCurrentTime(t);

    // Auto-save every 5 seconds
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => savePosition(t), 5000);
  }

  function handleLoadedMetadata() {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
    setLoaded(true);
  }

  function handleEnded() {
    setPlaying(false);
    setCompleted(true);
    savePosition(duration);
    onComplete?.();
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
      savePosition(currentTime);
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  }

  function handleProgressClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!progressRef.current || !audioRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = ratio * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    savePosition(newTime);
  }

  function cycleSpeed() {
    setSpeedIdx(i => (i + 1) % SPEEDS.length);
  }

  function skip(seconds: number) {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  }

  function markComplete() {
    setCompleted(true);
    onComplete?.();
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  // Build reference label
  const refLabel = episode.tractate
    ? episode.chapterFrom && episode.mishnaFrom
      ? episode.chapterFrom === episode.chapterTo
        ? `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}${episode.mishnaTo !== episode.mishnaFrom ? `–${episode.mishnaTo}` : ''}`
        : `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}–${episode.chapterTo}:${episode.mishnaTo}`
      : episode.tractate
    : '';

  return (
    <div className="bg-navy-800 border border-navy-600 rounded-2xl overflow-hidden shadow-card">
      {/* Header */}
      <div className="bg-gradient-to-r from-navy-700 to-navy-800 px-6 py-4 border-b border-navy-600">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs text-gold-500 uppercase tracking-widest mb-1">Now Playing</p>
            {refLabel && (
              <p className="text-lg font-bold text-gold-300 truncate">{refLabel}</p>
            )}
            <p className="text-sm text-slate-400 truncate mt-0.5">{episode.title}</p>
          </div>
          {completed && (
            <span className="flex-shrink-0 bg-green-900/40 border border-green-700 text-green-400 text-xs px-3 py-1 rounded-full font-medium">
              ✓ Complete
            </span>
          )}
        </div>
      </div>

      {/* Player Body */}
      <div className="px-6 py-6">
        {/* Progress Bar */}
        <div className="mb-4">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="relative h-2 bg-navy-600 rounded-full cursor-pointer group"
          >
            <div
              className="absolute top-0 left-0 h-2 bg-gradient-to-r from-gold-700 to-gold-400 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-gold-400 rounded-full shadow-gold opacity-0 group-hover:opacity-100 transition-opacity cursor-grab"
              style={{ left: `calc(${progress}% - 8px)` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-500">
            <span>{formatDuration(Math.floor(currentTime))}</span>
            <span>{duration > 0 ? formatDuration(Math.floor(duration)) : '--:--'}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-center gap-6">
          {/* Prev episode */}
          <button
            onClick={onPrev}
            disabled={!hasPrev}
            className="text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-2"
            title="Previous episode"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
            </svg>
          </button>

          {/* Skip back 15s */}
          <button
            onClick={() => skip(-15)}
            className="text-slate-400 hover:text-slate-200 transition-colors p-2 text-xs font-bold relative"
            title="Back 15 seconds"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
            </svg>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px]">15</span>
          </button>

          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-600 to-gold-400 flex items-center justify-center text-navy-950 hover:from-gold-500 hover:to-gold-300 transition-all shadow-gold hover:shadow-gold-lg animate-pulse-gold"
            title={playing ? 'Pause' : 'Play'}
          >
            {playing ? (
              <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
            ) : (
              <svg className="w-7 h-7 ml-1" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          {/* Skip forward 30s */}
          <button
            onClick={() => skip(30)}
            className="text-slate-400 hover:text-slate-200 transition-colors p-2 text-xs font-bold relative"
            title="Forward 30 seconds"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"/>
            </svg>
            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 text-[9px]">30</span>
          </button>

          {/* Next episode */}
          <button
            onClick={onNext}
            disabled={!hasNext}
            className="text-slate-500 hover:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors p-2"
            title="Next episode"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>
        </div>

        {/* Speed + Mark Complete */}
        <div className="flex items-center justify-between mt-5">
          <button
            onClick={cycleSpeed}
            className="text-sm text-slate-400 hover:text-gold-400 transition-colors bg-navy-700 px-3 py-1.5 rounded-lg font-mono font-bold"
            title="Change playback speed"
          >
            {SPEEDS[speedIdx]}×
          </button>

          {!completed && (
            <button
              onClick={markComplete}
              className="text-sm text-slate-400 hover:text-green-400 border border-slate-600 hover:border-green-600 px-4 py-1.5 rounded-lg transition-all"
            >
              ✓ Mark Complete
            </button>
          )}

          {completed && (
            <span className="text-sm text-green-400 font-medium">Lesson Complete!</span>
          )}
        </div>
      </div>

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        src={episode.audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        preload="metadata"
      />
    </div>
  );
}
