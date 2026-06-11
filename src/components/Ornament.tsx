/* Sefer ornaments — a brass four-point star and a centred page rule.
   Used instead of dingbat glyphs so the mark stays crisp at any size. */

export function Ornament({ size = 12, className = '' }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className={className}
      style={{ display: 'inline-block', flexShrink: 0 }}
    >
      {/* Four-point star with a small centre diamond — classic sefer flourish */}
      <path
        d="M12 1 L13.6 10.4 L23 12 L13.6 13.6 L12 23 L10.4 13.6 L1 12 L10.4 10.4 Z"
        fill="var(--brass)"
      />
      <circle cx="12" cy="12" r="1.6" fill="var(--brass-glow)" />
    </svg>
  );
}

export function SeferDivider({ className = '', width = 260 }: { className?: string; width?: number }) {
  return (
    <div className={`flex items-center gap-4 ${className}`} style={{ maxWidth: width }}>
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, transparent, var(--brass))' }} />
      <Ornament size={13} />
      <div className="flex-1 h-px" style={{ background: 'linear-gradient(90deg, var(--brass), transparent)' }} />
    </div>
  );
}
