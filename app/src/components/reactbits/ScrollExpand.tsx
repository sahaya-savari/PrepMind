import React, { useRef, useState, useEffect } from 'react';
import { ChevronDown, Maximize2, Minimize2, Sparkles } from 'lucide-react';

export interface ScrollExpandProps {
  src?: string;
  alt?: string;
  title?: string;
  scrollHint?: string;
  useWindowScroll?: boolean;
  mediaZoom?: number;
  className?: string;
  children?: React.ReactNode;
}

/**
 * ScrollExpand Component (React Bits Specification)
 * Expands frame dimensions and scales inner media smoothly as user scrolls or toggles,
 * styled in PrepMind AI's Terminal-Dark palette with reduced-motion safety.
 */
export const ScrollExpand: React.FC<ScrollExpandProps> = ({
  src = '/hero.jpg',
  alt = 'Product hero media',
  title = 'Built to scale',
  scrollHint = 'Scroll to reveal',
  useWindowScroll = false,
  mediaZoom = 1.35,
  className = '',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isManualExpanded, setIsManualExpanded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Window scroll tracking when useWindowScroll is true
  useEffect(() => {
    if (!useWindowScroll || prefersReducedMotion) return;

    const handleScroll = () => {
      const el = containerRef.current;
      if (!el) return;

      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      // Calculate how far container has scrolled across the viewport center
      const start = windowHeight;
      const end = -rect.height;
      const current = rect.top;

      const progress = Math.max(0, Math.min(1, (start - current) / (start - end + 200)));
      setScrollProgress(progress);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [useWindowScroll, prefersReducedMotion]);

  // Combined progress value
  const effectiveProgress = prefersReducedMotion
    ? isManualExpanded
      ? 1
      : 0
    : isManualExpanded
    ? 1
    : useWindowScroll
    ? scrollProgress
    : 0.15;

  const currentScale = 1 + (mediaZoom - 1) * effectiveProgress;
  const currentBorderRadius = Math.max(0, 24 * (1 - effectiveProgress));
  const currentPadding = Math.max(0, 24 * (1 - effectiveProgress));

  return (
    <div
      ref={containerRef}
      className={`relative w-full overflow-hidden transition-all duration-300 ${className}`}
      style={{
        padding: useWindowScroll ? `${currentPadding}px` : undefined,
      }}
    >
      <div
        className="relative w-full h-full min-h-[420px] sm:min-h-[500px] overflow-hidden border border-[var(--border)] bg-[var(--surface-elevated)] shadow-2xl transition-all duration-500 flex flex-col justify-between"
        style={{
          borderRadius: `${currentBorderRadius}px`,
        }}
      >
        {/* Background / Media Layer */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {!imgError ? (
            <img
              src={src}
              alt={alt}
              onError={() => setImgError(true)}
              style={{
                transform: `scale(${currentScale})`,
                transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
              className="w-full h-full object-cover opacity-35 filter brightness-90 contrast-110"
            />
          ) : null}

          {/* Architectural Blueprint Graphic */}
          <div
            className={`absolute inset-0 transition-transform duration-500 ${
              imgError ? 'opacity-90' : 'opacity-40 mix-blend-overlay'
            }`}
            style={{
              transform: `scale(${currentScale * 0.95})`,
            }}
          >
            <svg
              className="w-full h-full"
              viewBox="0 0 1200 800"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <radialGradient id="luxGrad" cx="50%" cy="50%" r="60%">
                  <stop offset="0%" stopColor="#C792EA" stopOpacity="0.25" />
                  <stop offset="50%" stopColor="#82AAFF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0A0B0D" stopOpacity="0.95" />
                </radialGradient>
                <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#2A2E37" strokeWidth="0.8" strokeOpacity="0.4" />
                </pattern>
              </defs>

              <rect width="100%" height="100%" fill="url(#luxGrad)" />
              <rect width="100%" height="100%" fill="url(#gridPattern)" />

              {/* Concentric rings denoting distributed consensus */}
              <circle cx="600" cy="400" r="320" stroke="#2A2E37" strokeWidth="1" strokeDasharray="4 6" strokeOpacity="0.5" />
              <circle cx="600" cy="400" r="240" stroke="#82AAFF" strokeWidth="1.5" strokeOpacity="0.6" />
              <circle cx="600" cy="400" r="160" stroke="#C792EA" strokeWidth="1.5" strokeOpacity="0.6" />
              <circle cx="600" cy="400" r="80" stroke="#C792EA" strokeWidth="2" strokeOpacity="0.8" />

              {/* Architectural node callouts */}
              <g transform="translate(600, 400)">
                <circle cx="0" cy="0" r="12" fill="#C792EA" />
                <circle cx="-160" cy="-60" r="8" fill="#16181D" stroke="#C792EA" strokeWidth="1.5" />
                <circle cx="160" cy="-60" r="8" fill="#C3E88D" stroke="#F78C6C" strokeWidth="1.5" />
                <circle cx="-120" cy="120" r="8" fill="#16181D" stroke="#C792EA" strokeWidth="1.5" />
                <circle cx="120" cy="120" r="8" fill="#C792EA" />

                {/* Connecting lines */}
                <line x1="0" y1="0" x2="-160" y2="-60" stroke="#C792EA" strokeWidth="1.5" strokeOpacity="0.4" />
                <line x1="0" y1="0" x2="160" y2="-60" stroke="#82AAFF" strokeWidth="1.5" strokeOpacity="0.8" />
                <line x1="0" y1="0" x2="-120" y2="120" stroke="#82AAFF" strokeWidth="1.5" strokeOpacity="0.8" />
                <line x1="0" y1="0" x2="120" y2="120" stroke="#C792EA" strokeWidth="1.5" strokeOpacity="0.4" />
              </g>

              {/* Technical annotations */}
              <text x="640" y="380" fill="#C792EA" fontSize="11" fontFamily="JetBrains Mono" fontWeight="600" opacity="0.9" letterSpacing="2">RAFT LEADER QUORUM</text>
              <text x="360" y="240" fill="#9BA1AC" fontSize="10" fontFamily="JetBrains Mono" opacity="0.8">P99.9 LATENCY: 1.4ms</text>
              <text x="780" y="520" fill="#9BA1AC" fontSize="10" fontFamily="JetBrains Mono" opacity="0.8">STATE MACHINE REPLICATION</text>
            </svg>
          </div>

          {/* Vignette Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface-elevated)] via-transparent to-[var(--surface-elevated)]/60 pointer-events-none" />
        </div>

        {/* Top Header Badge & Expansion Trigger */}
        <div className="relative z-10 flex items-center justify-between p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-sm text-[11px] font-mono tracking-widest uppercase text-[var(--accent)] flex items-center gap-1.5 shadow-sm">
              <Sparkles className="w-3 h-3 text-[var(--accent)]" />
              <span>{title}</span>
            </span>
            <span className="text-xs font-mono text-[var(--text-muted)] hidden sm:inline">
              Zoom: {currentScale.toFixed(2)}x
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsManualExpanded((prev) => !prev)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)]/90 hover:bg-[var(--surface)] text-xs font-mono text-[var(--text-primary)] hover:border-[var(--accent)] transition-all cursor-pointer shadow-sm"
            aria-label={isManualExpanded ? 'Minimize media frame' : 'Expand media frame'}
          >
            {isManualExpanded ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="hidden sm:inline">Contract Stage</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span className="hidden sm:inline">Expand Stage</span>
              </>
            )}
          </button>
        </div>

        {/* Center / Bottom Content Stage */}
        <div className="relative z-10 p-6 sm:p-10 max-w-2xl mt-auto space-y-3">
          {children ? (
            <div className="space-y-3 text-[var(--text-primary)]">
              {children}
            </div>
          ) : (
            <div className="space-y-2">
              <h2 className="font-serif text-2xl sm:text-4xl font-medium tracking-tight text-[var(--text-primary)] leading-tight">
                Every pixel, everywhere.
              </h2>
              <p className="text-xs sm:text-sm text-[var(--text-secondary)] font-light leading-relaxed">
                The frame opens up as you scroll and hands the whole stage to your media. Uncompromised luxury fidelity for complex distributed system visualizations.
              </p>
            </div>
          )}

          {/* Scroll Hint & Status Pill */}
          <div className="flex items-center gap-3 pt-2">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[var(--text-muted)]">
              <ChevronDown className="w-3.5 h-3.5 text-[var(--accent)] animate-bounce" />
              <span>{scrollHint}</span>
            </div>

            <div className="w-24 h-1 rounded-full bg-[var(--border)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] transition-all duration-300"
                style={{ width: `${effectiveProgress * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrollExpand;
