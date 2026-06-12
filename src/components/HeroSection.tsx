'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MagneticButton, CountUp } from './animations';
import { Ornament } from './Ornament';

const FLOATING_LETTERS = ['מ', 'ש', 'נ', 'ה', 'י', 'ו', 'מ', 'י', 'ב', 'ר', 'כ', 'ה'];

const PARTICLES = FLOATING_LETTERS.map((letter, i) => ({
  letter,
  x: [8, 15, 22, 30, 38, 48, 56, 65, 72, 80, 88, 94][i],
  y: [15, 70, 30, 80, 20, 55, 85, 25, 65, 40, 75, 15][i],
  size: [64, 48, 80, 56, 96, 44, 72, 52, 88, 60, 40, 76][i],
  delay: i * 0.4,
  duration: 6 + (i % 4) * 2,
  opacity: [0.05, 0.07, 0.045, 0.075, 0.04, 0.06, 0.05, 0.055, 0.045, 0.065, 0.05, 0.04][i],
}));

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden"
      style={{
        background: 'linear-gradient(165deg, #FBF6EC 0%, #F4EAD6 48%, #EADBBE 100%)',
        minHeight: '94vh',
        display: 'flex',
        alignItems: 'center',
      }}>

      {/* ── Radial glow layers — warm brass light ── */}
      <div className="absolute inset-0 pointer-events-none">
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%',
          width: '800px', height: '800px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(160,120,64,0.24) 0%, rgba(160,120,64,0.07) 40%, transparent 70%)',
          filter: 'blur(1px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-20%', left: '-10%',
          width: '600px', height: '600px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(133,98,48,0.10) 0%, transparent 65%)',
        }} />
        <div style={{
          position: 'absolute', top: '30%', left: '40%',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(230,201,130,0.12) 0%, transparent 65%)',
        }} />
      </div>

      {/* ── Floating Hebrew letter particles ── */}
      <div className="absolute inset-0 pointer-events-none select-none overflow-hidden">
        {PARTICLES.map((p, i) => (
          <motion.span key={i}
            className="absolute"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              fontSize: `${p.size}px`,
              color: `rgba(133,98,48,${p.opacity})`,
              fontFamily: 'var(--font-frank)',
              fontWeight: 700,
              direction: 'rtl',
              lineHeight: 1,
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{
              opacity: [0, p.opacity, p.opacity * 0.6, p.opacity],
              y: [20, 0, -12, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}>
            {p.letter}
          </motion.span>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="relative w-full px-6 lg:px-10" style={{ maxWidth: '1152px', margin: '0 auto' }}>
        <div className="max-w-3xl mx-auto py-28 sm:py-36 flex flex-col items-center text-center">

          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="inline-flex items-center gap-2.5 rounded-full px-5 py-2 mb-10 border"
            style={{ background: 'rgba(160,120,64,0.08)', borderColor: 'rgba(160,120,64,0.3)' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: 'var(--brass)' }} />
            <span className="text-xs font-semibold tracking-wide" style={{ color: 'var(--brass-deep)' }}>
              Official Mishna Yomit Program
            </span>
          </motion.div>

          {/* Giant Hebrew title */}
          <motion.div
            style={{
              fontFamily: 'var(--font-frank)',
              direction: 'rtl',
              fontSize: 'clamp(76px, 12vw, 128px)',
              color: 'var(--ink)',
              fontWeight: 900,
              lineHeight: 1,
              letterSpacing: '-0.005em',
            }}
            initial={{ opacity: 0, y: 50, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.21, 0.47, 0.32, 0.98] }}>
            משנה יומי
          </motion.div>

          {/* Gold rule */}
          <motion.div
            className="my-6"
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            style={{ transformOrigin: 'center' }}
            transition={{ duration: 0.7, delay: 0.45, ease: [0.21, 0.47, 0.32, 0.98] }}>
            <div className="flex items-center gap-4 mx-auto" style={{ maxWidth: '280px' }}>
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--brass), transparent)' }} />
              <Ornament size={13} />
              <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--brass))' }} />
            </div>
          </motion.div>

          {/* English headline */}
          <motion.h1
            style={{ fontFamily: 'var(--font-frank)', fontSize: 'clamp(28px, 3.5vw, 44px)', color: 'var(--ink)', lineHeight: 1.22, fontWeight: 700 }}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5, ease: [0.21, 0.47, 0.32, 0.98] }}
            className="mb-5">
            Daily Mishnah Learning with{' '}
            <span className="gradient-gold">R&apos;&nbsp;Shloimie Friedman</span>
          </motion.h1>

          <motion.p
            style={{ color: 'var(--muted)', fontSize: '1.0625rem', maxWidth: '500px', lineHeight: 1.8 }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.58 }}
            className="mb-10 mx-auto">
            Finish all of Shas — your way. Follow the worldwide Mishna Yomit calendar,
            or build your own cycle: start anywhere, set your pace, even pick the date
            of your siyum. Listen, track, and never lose your place.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            className="flex flex-wrap gap-3 mb-12"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.66 }}>
            <MagneticButton>
              <Link href="/learn" className="btn-primary"
                style={{ fontSize: '0.9375rem', padding: '0.875rem 2.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Start Learning Today
              </Link>
            </MagneticButton>
            <Link href="/cycles" className="btn-ghost"
              style={{ fontSize: '0.9375rem', padding: '0.875rem 2.25rem' }}>
              Create Your Own Cycle
            </Link>
          </motion.div>

          {/* Dedication */}
          <motion.div
            className="inline-flex items-center gap-2.5 mb-8 px-4 py-2 rounded-full border"
            style={{ background: 'rgba(160,120,64,0.06)', borderColor: 'rgba(160,120,64,0.22)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.72 }}>
            <Ornament size={10} />
            <span className="text-xs italic" style={{ color: 'var(--brass-deep)', letterSpacing: '0.03em' }}>
              L&apos;ilui Nishmas Etta Ahuva bas Yaakov
            </span>
            <Ornament size={10} />
          </motion.div>

          {/* Stats */}
          <motion.div
            className="flex items-center gap-6 text-sm"
            style={{ color: 'var(--muted)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.78 }}>
            <div className="flex items-center gap-1.5">
              <CountUp to={4192} duration={2.2} className="font-bold text-base" />
              <span>Mishnayot</span>
            </div>
            <span style={{ color: 'var(--rule)' }}>|</span>
            <span><strong style={{ color: 'var(--ink)' }}>63</strong> Tractates</span>
            <span style={{ color: 'var(--rule)' }}>|</span>
            <span><strong style={{ color: 'var(--ink)' }}>6</strong> Sedarim</span>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
