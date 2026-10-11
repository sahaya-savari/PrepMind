import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface RotatingTextProps {
  texts?: string[];
  words?: string[]; // Backwards-compatible alias
  mainClassName?: string;
  className?: string; // Backwards-compatible alias
  wordClassName?: string;
  staggerFrom?: 'first' | 'last' | 'center' | 'random';
  initial?: Record<string, any>;
  animate?: Record<string, any>;
  exit?: Record<string, any>;
  staggerDuration?: number;
  splitLevelClassName?: string;
  transition?: Record<string, any>;
  rotationInterval?: number;
  interval?: number; // Backwards-compatible alias
}

/**
 * RotatingText Component (Terminal-Dark Spec)
 * Uses framer-motion with prefers-reduced-motion fallback.
 */
export const RotatingText: React.FC<RotatingTextProps> = ({
  texts,
  words,
  mainClassName = '',
  className = '',
  wordClassName = '',
  initial = { y: '100%' },
  animate = { y: '0%' },
  exit = { y: '-120%' },
  transition = { type: 'spring', damping: 30, stiffness: 400 },
  rotationInterval,
  interval = 2500,
  splitLevelClassName = '',
}) => {
  const list = texts || words || ['Interviews', 'Exams', 'Placements', 'Concepts'];
  const delay = rotationInterval || interval;
  const [index, setIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion || list.length <= 1) return;

    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % list.length);
    }, delay);

    return () => clearInterval(timer);
  }, [list.length, delay, prefersReducedMotion]);

  if (prefersReducedMotion) {
    return (
      <span className={`inline-block font-semibold text-midnight-accent ${mainClassName} ${className} ${wordClassName}`}>
        {list[0]}
      </span>
    );
  }

  const currentWord = list[index];

  return (
    <span
      className={`relative inline-flex items-center overflow-hidden align-top select-none ${mainClassName} ${className}`}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={currentWord}
          initial={initial}
          animate={animate}
          exit={exit}
          transition={transition}
          className={`inline-block font-semibold ${splitLevelClassName} ${wordClassName}`}
        >
          {currentWord}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default RotatingText;
