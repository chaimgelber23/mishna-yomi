'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { formatDuration } from '@/lib/rss';

interface Episode {
  id: string; title: string; audioUrl: string;
  durationSeconds?: number | null; tractate?: string | null;
  chapterFrom?: number | null; mishnaFrom?: number | null;
  chapterTo?: number | null; mishnaTo?: number | null;
}

interface AudioPlayerProps {
  episode: Episode; onComplete?: () => void; onPositionChange?: (s: number) => void;
  onPrev?: () => void; onNext?: () => void;
  hasPrev?: boolean; hasNext?: boolean; initialPosition?: number;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function AudioPlayer({ episode, onComplete, onPositionChange, onPrev, onNext, hasPrev = false, hasNext = false, initialPosition = 0 }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(initialPosition);
  const [duration, setDuration] = useState(episode.durationSeconds || 0);
  const [speedIdx, setSpeedIdx] = useState(1);
  const [completed, setCompleted] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<NodeJS.Timeout | null>(null);
  const key = `mishna-pos-${episode.id}`;

  useEffect(() => {
    const s = localStorage.getItem(key);
    if (s) { const p = parseInt(s, 10); if (!isNaN(p) && p > 0) setCurrentTime(p); }
    else if (initialPosition > 0) setCurrentTime(initialPosition);
  }, [episode.id, initialPosition, key]);

  useEffect(() => { if (loaded && audioRef.current && currentTime > 0) audioRef.current.currentTime = currentTime; }, [loaded]); // eslint-disable-line

  useEffect(() => { if (audioRef.current) audioRef.current.playbackRate = SPEEDS[speedIdx]; }, [speedIdx]);

  const save = useCallback((t: number) => { localStorage.setItem(key, String(Math.floor(t))); onPositionChange?.(Math.floor(t)); }, [key, onPositionChange]);

  function onTimeUpdate() {
    if (!audioRef.current) return;
    const t = audioRef.current.currentTime;
    setCurrentTime(t);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(t), 5000);
  }

  function onLoaded() { if (!audioRef.current) return; setDuration(audioRef.current.duration); setLoaded(true); }
  function onEnded() { setPlaying(false); setCompleted(true); save(duration); onComplete?.(); }
  function togglePlay() {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); save(currentTime); } else audioRef.current.play();
    setPlaying(!playing);
  }
  function clickProgress(e: React.MouseEvent<HTMLDivElement>) {
    if (!progressRef.current || !audioRef.current) return;
    const r = progressRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const t = ratio * duration;
    audioRef.current.currentTime = t; setCurrentTime(t); save(t);
  }
  function skip(s: number) {
    if (!audioRef.current) return;
    const t = Math.max(0, Math.min(duration, currentTime + s));
    audioRef.current.currentTime = t; setCurrentTime(t);
  }

  const pct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const ref = episode.tractate
    ? episode.chapterFrom && episode.mishnaFrom
      ? episode.chapterFrom === episode.chapterTo
        ? `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}${episode.mishnaTo !== episode.mishnaFrom ? `–${episode.mishnaTo}` : ''}`
        : `${episode.tractate} ${episode.chapterFrom}:${episode.mishnaFrom}–${episode.chapterTo}:${episode.mishnaTo}`
      : episode.tractate
    : '';

  return (
    <div className="card overflow-hidden" style={{ borderColor: 'var(--border)', boxShadow: playing ? '0 4px 24px rgba(30,58,95,0.12)' : '0 1px 4px rgba(0,0,0,0.05)', transition: 'box-shadow 0.3s' }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-4 border-b" style={{ borderColor: 'var(--border)', background: 'linear-gradient(135deg, #F8F4EE, #fff)' }}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 rounded-full transition-colors" style={{ background: playing ? 'var(--gold)' : 'var(--border)' }} />
              <p className="text-[11px] uppercase tracking-widest font-semibold" style={{ color: 'var(--muted)' }}>
                {playing ? 'Now Playing' : 'Paused'}
              </p>
            </div>
            {ref && <p className="text-xl font-bold truncate" style={{ fontFamily: 'var(--font-playfair)', color: 'var(--fg)' }}>{ref}</p>}
            <p className="text-xs truncate mt-0.5" style={{ color: 'var(--muted)' }}>
              {episode.title.replace(/^Mishna Yomi\s*[-:]\s*/i, '').replace(/\s*-\s*By.*$/i, '')}
            </p>
          </div>
          {completed && (
            <span className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border"
              style={{ background: '#ECFDF5', borderColor: '#A7F3D0', color: '#065F46' }}>
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
              Complete
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6">
        {/* Progress bar */}
        <div className="mb-6">
          <div ref={progressRef} onClick={clickProgress}
            className="relative h-1.5 rounded-full cursor-pointer group border"
            style={{ background: 'var(--muted-bg, #EEEAE2)', borderColor: 'var(--border)' }}>
            <div className="absolute top-0 left-0 h-full rounded-full transition-all"
              style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--navy), var(--gold))' }} />
            <div className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border-2 border-white shadow opacity-0 group-hover:opacity-100 transition-all scale-0 group-hover:scale-100 cursor-grab"
              style={{ left: `calc(${pct}% - 7px)`, background: 'var(--gold)' }} />
          </div>
          <div className="flex justify-between mt-1.5 text-xs font-mono" style={{ color: 'var(--muted)' }}>
            <span>{formatDuration(Math.floor(currentTime))}</span>
            <span>{duration > 0 ? formatDuration(Math.floor(duration)) : '--:--'}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <button onClick={() => setSpeedIdx(i => (i + 1) % SPEEDS.length)}
            className="text-xs font-bold font-mono px-3 py-1.5 rounded-lg border transition-all cursor-pointer"
            style={{ color: 'var(--muted)', background: 'var(--bg)', borderColor: 'var(--border)' }}>
            {SPEEDS[speedIdx]}×
          </button>

          <div className="flex items-center gap-3">
            <button onClick={onPrev} disabled={!hasPrev} aria-label="Previous"
              className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ color: 'var(--muted)' }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>
            </button>
            <button onClick={() => skip(-15)} aria-label="Back 15s" className="relative p-1.5 cursor-pointer" style={{ color: 'var(--muted)' }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold" style={{ color: 'var(--muted)' }}>15</span>
            </button>

            <button onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}
              className="w-14 h-14 rounded-full flex items-center justify-center text-white transition-all cursor-pointer"
              style={{ background: playing ? 'var(--navy)' : 'linear-gradient(135deg, var(--navy), #2d5a8e)', boxShadow: playing ? '0 4px 20px rgba(30,58,95,0.35)' : '0 2px 12px rgba(30,58,95,0.2)' }}>
              {playing
                ? <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
                : <svg className="w-6 h-6 ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
            </button>

            <button onClick={() => skip(30)} aria-label="Forward 30s" className="relative p-1.5 cursor-pointer" style={{ color: 'var(--muted)' }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2z"/></svg>
              <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] font-bold" style={{ color: 'var(--muted)' }}>30</span>
            </button>
            <button onClick={onNext} disabled={!hasNext} aria-label="Next"
              className="p-1.5 rounded-lg transition-colors cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
              style={{ color: 'var(--muted)' }}>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>
            </button>
          </div>

          {!completed
            ? <button onClick={() => { setCompleted(true); onComplete?.(); }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5"
                style={{ color: 'var(--muted)', borderColor: 'var(--border)', background: 'transparent' }}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Done
              </button>
            : <span className="text-xs font-semibold flex items-center gap-1" style={{ color: '#065F46' }}>
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                Done
              </span>}
        </div>
      </div>

      <audio ref={audioRef} src={episode.audioUrl} onTimeUpdate={onTimeUpdate} onLoadedMetadata={onLoaded}
        onEnded={onEnded} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} preload="metadata" />
    </div>
  );
}
