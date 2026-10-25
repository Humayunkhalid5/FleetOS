// FleetOS mark: five stacked lanes (the original logo geometry). Colours come
// from tokens so the mark reads correctly in both themes.
export function LogoMark({ size = 32, animated = false, className = '' }) {
  return (
    <svg
      width={size}
      height={size * (70 / 64)}
      viewBox="0 0 64 70"
      fill="none"
      aria-hidden="true"
      className={`${animated ? 'logo-mark-anim' : ''} ${className}`.trim()}
    >
      <path d="M3 13.2 30.3 1v14.8L3 28V13.2Z" fill="rgb(var(--brand))" />
      <path d="M3 32.6 30.3 20.5v14.7L3 47.4V32.6Z" fill="rgb(var(--brand-hover))" />
      <path d="m3 52 27.3-12.1v14.7L3 66.8V52Z" fill="#0AC7ED" />
      <path d="M36.8 14.9 62 3.7v14.7L36.8 29.6V14.9Z" fill="rgb(var(--brand))" opacity="0.85" />
      <path d="M36.8 34.4 62 23.2v14.7L36.8 49.1V34.4Z" fill="rgb(var(--brand))" opacity="0.7" />
    </svg>
  );
}

export default function Logo({ size = 28, showWord = true, className = '', subtitle }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <LogoMark size={size} />
      {showWord && (
        <span className="grid leading-none">
          <span className="text-[19px] font-bold tracking-[-0.04em] text-ink">
            FleetOS
          </span>
          {subtitle && <span className="mt-1 text-[11px] font-medium text-subtle">{subtitle}</span>}
        </span>
      )}
    </span>
  );
}
