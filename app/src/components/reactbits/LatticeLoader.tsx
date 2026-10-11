import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export interface LatticeLoaderProps {
  size?: number; // grid dimension, e.g. 3x3
  label?: string;
  className?: string;
}

/**
 * LatticeLoader Component (React Bits TS-TW variant)
 * Renders a matrix of pulsating lattice nodes for question generation states.
 * Respects prefers-reduced-motion with static nodes.
 * Includes visible and accessible text label.
 */
export const LatticeLoader: React.FC<LatticeLoaderProps> = ({
  size = 3,
  label = 'Synthesizing targeted interview scenario...',
  className = '',
}) => {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const nodes = Array.from({ length: size * size }, (_, i) => ({
    id: i,
    row: Math.floor(i / size),
    col: i % size,
  }));

  return (
    <div className={`flex flex-col items-center justify-center gap-4 py-8 text-center ${className}`}>
      <div
        className="grid gap-2 p-3 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)]"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-label={label}
      >
        {nodes.map((node) => {
          const delay = (node.row + node.col) * 0.12;
          return (
            <motion.div
              key={node.id}
              className="w-2.5 h-2.5 rounded-sm bg-[var(--accent)]"
              animate={
                prefersReducedMotion
                  ? { opacity: 0.8, scale: 1 }
                  : {
                      scale: [0.75, 1.3, 0.75],
                      opacity: [0.35, 1, 0.35],
                    }
              }
              transition={
                prefersReducedMotion
                  ? undefined
                  : {
                      duration: 1.4,
                      repeat: Infinity,
                      delay,
                      ease: 'easeInOut',
                    }
              }
            />
          );
        })}
      </div>

      {label && (
        <span className="text-xs font-mono text-[var(--text-secondary)] tracking-tight">
          {label}
        </span>
      )}
    </div>
  );
};
