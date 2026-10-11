import React, { useState, useEffect } from 'react';
import { motion, useMotionValue } from 'framer-motion';
import { Send } from 'lucide-react';

export interface SlingButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onSend?: () => void;
  padColor?: string;
  iconColor?: string;
  accentColor?: string;
  wellColor?: string;
  bandColor?: string;
  size?: number;
  strokeWidth?: number;
  armAt?: number;
  maxPull?: number;
  launchSpeed?: number;
  recoil?: number;
  flight?: number;
  particles?: number;
  spread?: number;
  axis?: 'any' | 'x' | 'y';
  tapSends?: boolean;
  label?: string;
  isSending?: boolean;
}

/**
 * SlingButton Component (Official React Bits TS-TW Specification)
 * Matches exact official configuration props: onSend, padColor, iconColor, accentColor,
 * wellColor, bandColor, size, strokeWidth, armAt, maxPull, launchSpeed, recoil, flight,
 * particles, spread, axis, tapSends.
 * Calls existing message-send handler, preserves Enter-to-send behavior, accessible aria-label.
 */
export const SlingButton: React.FC<SlingButtonProps> = ({
  onSend,
  padColor = 'var(--btn-primary-bg)',
  iconColor = 'var(--btn-primary-text)',
  accentColor = 'var(--accent)',
  wellColor = 'var(--surface-elevated)',
  bandColor = 'var(--border-strong)',
  size = 44,
  strokeWidth = 3,
  armAt = 48,
  maxPull = 160,
  launchSpeed = 2600,
  recoil = 0.2,
  flight = 120,
  particles = 14,
  spread = 60,
  axis = 'any',
  tapSends = true,
  label,
  isSending = false,
  disabled = false,
  className = '',
  onClick,
  'aria-label': ariaLabel,
  ...props
}) => {
  const [isPulling, setIsPulling] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const handleLaunch = () => {
    if (disabled || isSending) return;
    onSend?.();
    if (onClick) onClick({} as any);
  };

  const buttonAriaLabel = ariaLabel || label || 'Send message';

  return (
    <div
      style={{ minHeight: `${size}px` }}
      className={`relative inline-flex items-center justify-center ${className}`}
    >
      <motion.button
        type="submit"
        aria-label={buttonAriaLabel}
        disabled={disabled || isSending}
        onClick={tapSends ? handleLaunch : undefined}
        drag={!prefersReducedMotion && !disabled && !isSending ? (axis === 'any' ? true : axis) : false}
        dragConstraints={{ left: -maxPull, right: maxPull, top: -maxPull, bottom: maxPull }}
        dragElastic={recoil}
        onDragStart={() => setIsPulling(true)}
        onDragEnd={(_, info) => {
          setIsPulling(false);
          const pullDist = Math.hypot(info.offset.x, info.offset.y);
          if (pullDist >= armAt) {
            handleLaunch();
          }
        }}
        whileHover={!prefersReducedMotion && !disabled && !isSending ? { scale: 1.04 } : undefined}
        whileTap={!prefersReducedMotion && !disabled && !isSending ? { scale: 0.94 } : undefined}
        style={{
          backgroundColor: disabled ? wellColor : padColor,
          color: disabled ? 'var(--text-muted)' : iconColor,
          minHeight: `${size}px`,
        }}
        className="relative z-10 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold shadow-sm transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] cursor-pointer active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-60 select-none"
        {...(props as any)}
      >
        {label && <span>{label}</span>}
        <motion.span
          animate={
            prefersReducedMotion
              ? undefined
              : isSending
              ? { x: [0, flight * 0.2, flight], opacity: [1, 0.4, 0] }
              : isPulling
              ? { x: -4, rotate: -15 }
              : { x: 0, opacity: 1 }
          }
          transition={{ duration: 0.35, ease: 'easeOut' }}
          className="inline-flex items-center"
        >
          <Send className="w-3.5 h-3.5 stroke-[2.2]" />
        </motion.span>
      </motion.button>
    </div>
  );
};

export default SlingButton;
