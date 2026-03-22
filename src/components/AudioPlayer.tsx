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
  const [speedIdx, setSpeedIdx] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const storageKey = `mishna-pos-${episode.id}`;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const pos = parseInt(saved, 10);
      if (!isNaN(pos) && pos > 0) setCurrentTime(pos);
    } else if (initialPosition > 0) {
      setCurrentTime(initialPosition);
    }
  }, [episode.id, initialPosition, storageKey]);

  useEffect(() => {
    if (loaded && audioRef.current && currentTime > 0) {
      audioRef.current.currentTime = currentTime;
    }
  }, [loaded]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx]);

  const savePosition = useCallback((time: number) => {
    localStorage.setItem(storageKey, String(Math.floor(time)));
    onPositionChange?.(Math.floor(time));
  }, [storageKey, onPositionChange]);

  function handleTimeUpdate() {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setCurrentTime(t);
    // Update buffered
    if (audioRef.current.buffered.length > 0) {
      setBuffered((audioRef.current.buffered.end(audioRef.current.buffered.length - 1) / (duration || 1)) * 100);
    }
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

  const refLabel = episode.tractate
    ? episode.chapterFrom && episode.mishnaFrom
      ? episode.chapterFrom === episode.chapterTo
        ? `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}${episode.mishnaTo !== episode.mishnaFrom ? `–${episode.mishnaTo}` : ''}`
        : `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}–${episode.chapterTo}:${episode.mishnaTo}`
      : episode.tractate
    : '';

  return (
    <div
      className="rounded-2xl overflow-hidden"
      style={{
        background: 'linear-gradient(160deg, rgba(17,35,71,0.95) 0%, rgba(7,15,31,0.98) 100%)',
        border: '1px solid rgba(245,158,11,0.15)',
        boxShadow: playing
          ? '0 0 60px rgba(180,83,9,0.2), 0 4px 40px rgba(0,0,0,0.6)'
          : '0 4px 40px rgba(0,0,0,0.5)',
        transition: 'box-shadow 0.4s ease',
      }}
    >
      {/* Top bar */}
      <div className="px-6 pt-5 pb-4 border-b border-white/5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${playing ? 'bg-gold-400 animate-pulse' : 'bg-slate-600'}`} />
              <p className="text-[11px] text-slate-500 uppercase tracking-widest font-medium">
                {playing ? 'Now Playing' : 'Paused'}
              </p>
            </div>
            {refLabel && (
              <p className="text-xl font-bold text-gold-300 truncate">{refLabel}</p>
            )}
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {episode.title.replace(/^Mishna Yomi\s*[-:]\s*/i, '').replace(/\s*-\s*By.*$/i, '')}
            </p>
          </div>
          {completed && (
            <div className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-900/30 border border-emerald-700/50 text-emerald-400 text-xs px-3 py-1.5 rounded-full font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Complete
            </div>
          )}
        </div>
      </div>

      {/* Player body */}
      <div className="px-6 py-6">

        {/* Progress track */}
        <div className="mb-5">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="relative h-1.5 rounded-full cursor-pointer group"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            {/* Buffered */}
            <div
              className="absolute top-0 left-0 h-full rounded-full"
              style={{ width: `${buffered}%`, background: 'rgba(255,255,255,0.08)' }}
            />
            {/* Played */}
            <div
              className="absolute top-0 left-0 h-full rounded-full transition-all"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #b45309, #f59e0b, #fbbf24)',
              }}
            />
            {/* Thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-gold-400 shadow-gold opacity-0 group-hover:opacity-100 transition-all scale-0 group-hover:scale-100 cursor-grab"
              style={{ left: `calc(${progress}% - 7px)` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-slate-600 font-mono">
            <span>{formatDuration(Math.floor(currentTime))}</span>
            <span>{duration > 0 ? formatDuration(Math.floor(duration)) : '--:--'}</span>
          </div>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between">

          {/* Left: speed */}
          <button
            onClick={cycleSpeed}
            className="text-xs text-slate-500 hover:text-gold-400 transition-colors bg-white/5 hover:bg-gold-900/20 border border-white/5 hover:border-gold-700/30 px-3 py-1.5 rounded-lg font-mono font-bold cursor-pointer"
            title="Playback speed"
          >
            {SPEEDS[speedIdx]}×
          </button>

          {/* Center: main controls */}
          <div className="flex items-center gap-4">
            {/* Prev */}
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-1.5 cursor-pointer"
              aria-label="Previous episode"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/>
              </svg>
            </button>

            {/* Skip back 15s */}
            <button
              onClick={() => skip(-15)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 relative cursor-pointer"
              aria-label="Back 15 seconds"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/>
              </svg>
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 font-bold">15</span>
            </button>

            {/* Play/Pause */}
            <button
              onClick={togglePlay}
              className="relative w-14 h-14 rounded-full flex items-center justify-center text-navy-950 transition-all cursor-pointer"
              style={{
                background: playing
                  ? 'linear-gradient(135deg, #f59e0b, #fbbf24)'
                  : 'linear-gradient(135deg, #d97706, #f59e0b)',
                boxShadow: playing
                  ? '0 0 30px rgba(245,158,11,0.5), 0 0 60px rgba(245,158,11,0.2)'
                  : '0 0 20px rgba(245,158,11,0.3)',
              }}
              aria-label={playing ? 'Pause' : 'Play'}
            >
              {playing ? (
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
              ) : (
                <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              )}
            </button>

            {/* Skip forward 30s */}
            <button
              onClick={() => skip(30)}
              className="text-slate-400 hover:text-slate-200 transition-colors p-1.5 relative cursor-pointer"
              aria-label="Forward 30 seconds"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"/>
              </svg>
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] text-slate-500 font-bold">30</span>
            </button>

            {/* Next */}
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="text-slate-500 hover:text-slate-300 disabled:opacity-20 disabled:cursor-not-allowed transition-colors p-1.5 cursor-pointer"
              aria-label="Next episode"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          {/* Right: mark complete */}
          {!completed ? (
            <button
              onClick={markComplete}
              className="text-xs text-slate-600 hover:text-emerald-400 border border-white/5 hover:border-emerald-700/40 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Done
            </button>
          ) : (
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
              </svg>
              Done
            </span>
          )}
        </div>
      </div>

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
