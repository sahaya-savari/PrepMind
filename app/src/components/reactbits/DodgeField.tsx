import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

export interface DodgeFieldProps {
  onReset?: () => void;
  className?: string;
}

/**
 * DodgeField Component (React Bits TS-TW variant)
 * Playful empty-state sandbox where decorative target elements dynamically evade
 * the cursor within safe bounds without ever obstructing real UI controls.
 * Respects prefers-reduced-motion by remaining stationary.
 * STRICTLY restricted to empty-state displays.
 */
export const DodgeField: React.FC<DodgeFieldProps> = ({
  onReset,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [dodges, setDodges] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handlePointerMove = (e: React.PointerEvent) => {
    if (prefersReducedMotion || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cursorX = e.clientX - rect.left - rect.width / 2;
    const cursorY = e.clientY - rect.top - rect.height / 2;

    const dist = Math.hypot(cursorX - pos.x, cursorY - pos.y);
    const triggerRadius = 75;

    if (dist < triggerRadius) {
      // Repel away from cursor within +/- 90px
      const angle = Math.atan2(pos.y - cursorY, pos.x - cursorX);
      const escapeDist = 55;
      const newX = Math.max(-100, Math.min(100, pos.x + Math.cos(angle) * escapeDist));
      const newY = Math.max(-70, Math.min(70, pos.y + Math.sin(angle) * escapeDist));

      setPos({ x: newX, y: newY });
      setDodges((prev) => prev + 1);
    }
  };

  const handleManualReset = () => {
    setPos({ x: 0, y: 0 });
    setDodges(0);
    onReset?.();
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      className={`relative flex flex-col items-center justify-center p-8 sm:p-12 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-center overflow-hidden min-h-[300px] select-none ${className}`}
    >
      {/* Empty State Vector Illustration */}
      <div className="w-48 sm:w-60 max-w-full h-auto mb-4 pointer-events-none">
        <img
          src="/assets/illustrations/empty-progress.svg"
          alt="Performance Metric Calibration"
          className="w-full h-auto object-contain mx-auto"
        />
      </div>

      <h3 className="text-base font-semibold text-[var(--text-primary)] mb-1">
        No Practice Sessions Recorded Yet
      </h3>
      <p className="text-xs text-[var(--text-secondary)] max-w-sm mb-6">
        Once you launch practice drills or interview evaluations, your mastery timeline and accuracy breakdown will appear here.
      </p>

      {/* Real, functional action button (NOT dodging) */}
      <div className="flex items-center gap-3 relative z-20">
        <button
          type="button"
          onClick={handleManualReset}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--text-primary)] hover:border-[var(--border-strong)] transition-colors cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span>Reset Filter / Sample Data</span>
        </button>
      </div>

      {dodges > 2 && (
        <span className="text-[10px] font-mono text-[var(--accent)] mt-3">
          (Playful dodge counter: {dodges} evasions)
        </span>
      )}
    </div>
  );
};
