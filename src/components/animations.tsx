"use client";

import { useRef, useEffect, type ReactNode } from "react";
import {
  motion, useInView, useMotionValue, useTransform,
  useScroll, useSpring, animate, type Variant,
} from "framer-motion";

/* ── FadeIn ── */
export function FadeIn({ children, delay = 0, duration = 0.6, direction = "up", className }: {
  children: ReactNode; delay?: number; duration?: number;
  direction?: "up" | "down" | "left" | "right"; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const offsets = { up: { y: 40, x: 0 }, down: { y: -40, x: 0 }, left: { x: 40, y: 0 }, right: { x: -40, y: 0 } };
  const o = offsets[direction];
  return (
    <motion.div ref={ref} initial={{ opacity: 0, ...o }}
      animate={inView ? { opacity: 1, x: 0, y: 0 } : undefined}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}>
      {children}
    </motion.div>
  );
}

/* ── StaggerChildren ── */
const staggerContainer = {
  hidden: {},
  visible: (d: number) => ({ transition: { staggerChildren: d } }),
};
const staggerItem: Record<string, Variant> = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.21, 0.47, 0.32, 0.98] } },
};

export function StaggerChildren({ children, staggerDelay = 0.12, className }: {
  children: ReactNode; staggerDelay?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div ref={ref} variants={staggerContainer} custom={staggerDelay}
      initial="hidden" animate={inView ? "visible" : "hidden"} className={className}>
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return <motion.div variants={staggerItem} className={className}>{children}</motion.div>;
}

/* ── TextReveal ── */
export function TextReveal({ text, className, delay = 0 }: {
  text: string; className?: string; delay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <span ref={ref} className={className}>
      {text.split(" ").map((word, i) => (
        <motion.span key={i} className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, y: 20, filter: "blur(4px)" }}
          animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : undefined}
          transition={{ duration: 0.4, delay: delay + i * 0.06, ease: [0.21, 0.47, 0.32, 0.98] }}>
          {word}
        </motion.span>
      ))}
    </span>
  );
}

/* ── CountUp ── */
export function CountUp({ from = 0, to, duration = 1.5, suffix = "", prefix = "", className }: {
  from?: number; to: number; duration?: number; suffix?: string; prefix?: string; className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(from);
  const rounded = useTransform(mv, (v) => Math.round(v));

  useEffect(() => {
    if (inView) { const c = animate(mv, to, { duration, ease: [0.21, 0.47, 0.32, 0.98] }); return () => c.stop(); }
  }, [inView, mv, to, duration]);

  useEffect(() => {
    return rounded.on("change", (v) => { if (ref.current) ref.current.textContent = `${prefix}${v}${suffix}`; });
  }, [rounded, prefix, suffix]);

  return <span ref={ref} className={className}>{prefix}{from}{suffix}</span>;
}

/* ── ParallaxLayer ── */
export function ParallaxLayer({ children, speed = 0.5, className }: {
  children: ReactNode; speed?: number; className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, speed * 120]);
  const smoothY = useSpring(y, { stiffness: 100, damping: 30 });
  return <motion.div ref={ref} style={{ y: smoothY }} className={className}>{children}</motion.div>;
}

/* ── MagneticButton ── */
export function MagneticButton({ children, className, strength = 0.3 }: {
  children: ReactNode; className?: string; strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 20 });
  const sy = useSpring(y, { stiffness: 200, damping: 20 });
  function onMove(e: React.MouseEvent) {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set((e.clientX - rect.left - rect.width / 2) * strength);
    y.set((e.clientY - rect.top - rect.height / 2) * strength);
  }
  return (
    <motion.div ref={ref} onMouseMove={onMove} onMouseLeave={() => { x.set(0); y.set(0); }}
      style={{ x: sx, y: sy }} className={className}>
      {children}
    </motion.div>
  );
}

/* ── RevealOnScroll ── */
export function RevealOnScroll({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <div ref={ref} className={className}>
      <motion.div initial={{ opacity: 0, y: 50 }}
        animate={inView ? { opacity: 1, y: 0 } : undefined}
        transition={{ duration: 0.6, ease: [0.21, 0.47, 0.32, 0.98] }}>
        {children}
      </motion.div>
    </div>
  );
}
