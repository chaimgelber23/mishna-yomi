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
  episode, onComplete, onPositionChange,
  onPrev, onNext, hasPrev = false, hasNext = false, initialPosition = 0,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(episode.durationSeconds || 0);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);
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
    if (loaded && audioRef.current && currentTime > 0) audioRef.current.currentTime = currentTime;
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
    if (playing) { audioRef.current.pause(); savePosition(currentTime); }
    else audioRef.current.play();
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

  function skip(seconds: number) {
    if (!audioRef.current) return;
    const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
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
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden"
      style={{ boxShadow: playing ? '0 4px 32px rgba(180,83,9,0.12), 0 1px 4px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.06)', transition: 'box-shadow 0.3s' }}>

      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b border-stone-100 bg-gradient-to-r from-amber-50 to-white">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-1.5 h-1.5 rounded-full transition-colors ${playing ? 'bg-gold-500' : 'bg-stone-300'}`} />
              <p className="text-[11px] text-stone-400 uppercase tracking-widest font-medium">
                {playing ? 'Now Playing' : 'Paused'}
              </p>
            </div>
            {refLabel && <p className="text-xl font-bold text-stone-900 truncate">{refLabel}</p>}
            <p className="text-xs text-stone-400 truncate mt-0.5">
              {episode.title.replace(/^Mishna Yomi\s*[-:]\s*/i, '').replace(/\s*-\s*By.*$/i, '')}
            </p>
          </div>
          {completed && (
            <div className="flex-shrink-0 flex items-center gap-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3 py-1.5 rounded-full font-medium">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              Complete
            </div>
          )}
        </div>
      </div>

      {/* Player body */}
      <div className="px-6 py-6">
        {/* Progress */}
        <div className="mb-6">
          <div ref={progressRef} onClick={handleProgressClick}
            className="relative h-1.5 bg-stone-100 rounded-full cursor-pointer group border border-stone-200">
            <div className="absolute top-0 left-0 h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #b45309, #d97706, #f59e0b)' }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-gold-500 border-2 border-white shadow-sm opacity-0 group-hover:opacity-100 transition-all cursor-grab"
              style={{ left: `calc(${progress}% - 7px)` }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs text-stone-400 font-mono">
            <span>{formatDuration(Math.floor(currentTime))}</span>
            <span>{duration > 0 ? formatDuration(Math.floor(duration)) : '--:--'}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          {/* Speed */}
          <button onClick={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)}
            className="text-xs text-stone-500 hover:text-gold-700 bg-stone-100 hover:bg-gold-50 border border-stone-200 hover:border-gold-300 px-3 py-1.5 rounded-lg font-mono font-bold transition-all cursor-pointer">
            {SPEEDS[speedIdx]}×
          </button>

          {/* Main controls */}
          <div className="flex items-center gap-3">
            <button onClick={onPrev} disabled={!hasPrev} aria-label="Previous"
              className="text-stone-400 hover:text-stone-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors p-1.5 cursor-pointer">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>

            <button onClick={() => skip(-15)} aria-label="Back 15s"
              className="relative text-stone-400 hover:text-stone-700 transition-colors p-1.5 cursor-pointer">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-stone-400">15</span>
            </button>

            {/* Play/Pause */}
            <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-all cursor-pointer"
              style={{
                background: 'linear-gradient(135deg, #b45309, #d97706)',
                boxShadow: playing ? '0 4px 20px rgba(180,83,9,0.4)' : '0 2px 10px rgba(180,83,9,0.2)',
              }}>
              {playing
                ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
              }
            </button>

            <button onClick={() => skip(30)} aria-label="Forward 30s"
              className="relative text-stone-400 hover:text-stone-700 transition-colors p-1.5 cursor-pointer">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"/></svg>
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold text-stone-400">30</span>
            </button>

            <button onClick={onNext} disabled={!hasNext} aria-label="Next"
              className="text-stone-400 hover:text-stone-700 disabled:opacity-25 disabled:cursor-not-allowed transition-colors p-1.5 cursor-pointer">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>

          {/* Mark done */}
          {!completed
            ? <button onClick={() => { setCompleted(true); onComplete?.(); }}
                className="text-xs text-stone-400 hover:text-emerald-600 border border-stone-200 hover:border-emerald-300 px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Done
              </button>
            : <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                Done
              </span>
          }
        </div>
      </div>

      <audio ref={audioRef} src={episode.audioUrl}
        onTimeUpdate={handleTimeUpdate} onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        preload="metadata" />
    </div>
  );
}
