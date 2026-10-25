import { LogoMark } from '../ui/Logo';

/** Full-screen branded loader — used while a portal verifies the session. */
function Loader({ label = 'Loading your workspace' }) {
  return (
    <main className="brand-loader" role="status" aria-live="polite" aria-label={label}>
      <div className="brand-loader__stack animate-fade-in">
        <LogoMark size={52} animated />
        <span className="text-[15px] font-bold tracking-[-0.03em] text-ink">FleetOS</span>
        <span className="loader-bar" />
        <span className="text-xs font-medium text-subtle">{label}</span>
      </div>
    </main>
  );
}

/**
 * In-content fallback shown only if a page chunk is not ready yet.
 *
 * It fills the viewport below the header on purpose: while the chunk loads,
 * everything after the page (the public footer) stays below the fold, so the
 * real content can replace this placeholder without pushing anything down.
 */
export function PageFallback() {
  return (
    <div className="grid min-h-[calc(100dvh-4rem)] place-items-center" role="status" aria-label="Loading page">
      <div className="grid justify-items-center gap-4 animate-fade-in">
        <LogoMark size={36} animated />
        <span className="loader-bar" />
      </div>
    </div>
  );
}

export default Loader;
