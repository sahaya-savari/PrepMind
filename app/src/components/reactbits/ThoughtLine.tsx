import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ChevronDown, CheckCircle2 } from 'lucide-react';

export interface ThoughtLineProps {
  working?: boolean;
  steps?: string[];
  label?: string;
  doneLabel?: string;
  glyph?: 'sparkle' | 'pulse' | 'dot' | string;
  fontSize?: number;
  breathPeriod?: number;
  breathDepth?: number;
  settleDuration?: number;
  settleBlur?: number;
  collapsible?: boolean;
  collapseOnSettle?: boolean;
  showTimer?: boolean;
  onSettle?: (seconds: number) => void;
  className?: string;
  accentColor?: string;
}

/**
 * ThoughtLine Component (Terminal-Dark Spec)
 * Socratic thought indicator reflecting real application loading states.
 * Uses framer-motion and terminal-dark tokens.
 */
export const ThoughtLine: React.FC<ThoughtLineProps> = ({
  working = true,
  steps = ['Processing request', 'Analyzing concepts', 'Formulating response'],
  label = 'Thinking…',
  doneLabel = 'Completed in',
  glyph = 'sparkle',
  fontSize = 12,
  breathPeriod = 1.6,
  breathDepth = 0.45,
  settleDuration = 350,
  settleBlur = 2,
  collapsible = true,
  collapseOnSettle = false,
  showTimer = true,
  onSettle,
  className = '',
  accentColor = 'var(--accent)',
}) => {
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const startTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!working) {
      if (onSettle) onSettle(secondsElapsed);
      if (collapseOnSettle) setIsCollapsed(true);
      return;
    }

    startTimeRef.current = Date.now();
    setSecondsElapsed(0);

    const timer = setInterval(() => {
      setSecondsElapsed((prev) => prev + 1);
    }, 1000);

    const stepInterval = setInterval(() => {
      setCurrentStepIndex((prev) => (prev + 1) % (steps.length || 1));
    }, 1800);

    return () => {
      clearInterval(timer);
      clearInterval(stepInterval);
    };
  }, [working, steps.length, collapseOnSettle, onSettle, secondsElapsed]);

  const activeStepText = steps[currentStepIndex] || label;

  return (
    <div
      style={{ fontSize: `${fontSize}px` }}
      className={`rounded-lg border border-midnight-border bg-midnight-elevated p-2.5 transition-all text-xs font-mono max-w-fit select-none ${className}`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-2.5">
        {/* Glyph Indicator */}
        <div className="relative flex items-center justify-center shrink-0">
          {working ? (
            <motion.div
              animate={{
                scale: [1 - breathDepth * 0.3, 1 + breathDepth * 0.4, 1 - breathDepth * 0.3],
                opacity: [0.7, 1, 0.7],
              }}
              transition={{
                duration: breathPeriod,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="text-midnight-accent"
            >
              {glyph === 'sparkle' ? (
                <Sparkles className="w-3.5 h-3.5 text-midnight-accent" />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-midnight-accent inline-block" />
              )}
            </motion.div>
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5 text-midnight-positive" />
          )}
        </div>

        {/* Status Text & Step Animation */}
        <div className="flex items-center gap-1.5 text-ink-secondary">
          {working ? (
            <AnimatePresence mode="wait">
              <motion.span
                key={activeStepText}
                initial={{ opacity: 0, y: 3 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -3 }}
                transition={{ duration: 0.15 }}
                className="text-ink-primary font-medium"
              >
                {activeStepText}
              </motion.span>
            </AnimatePresence>
          ) : (
            <span className="text-ink-secondary">
              {doneLabel} {secondsElapsed}s
            </span>
          )}

          {showTimer && working && (
            <span className="text-ink-muted tabular-nums ml-1">
              ({secondsElapsed}s)
            </span>
          )}
        </div>

        {/* Collapsible Trigger if steps available */}
        {collapsible && steps.length > 1 && (
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-0.5 rounded text-ink-muted hover:text-ink-primary ml-1 cursor-pointer"
            aria-label="Toggle thought steps details"
          >
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-150 ${
                isCollapsed ? '-rotate-90' : 'rotate-0'
              }`}
            />
          </button>
        )}
      </div>

      {/* Expanded Steps List */}
      {!isCollapsed && collapsible && steps.length > 1 && (
        <div className="mt-2 pt-2 border-t border-midnight-border space-y-1 pl-5">
          {steps.map((step, idx) => {
            const isCurrent = idx === currentStepIndex && working;
            const isCompleted = idx < currentStepIndex || !working;

            return (
              <div
                key={idx}
                className={`text-[11px] flex items-center gap-2 ${
                  isCurrent
                    ? 'text-midnight-accent font-semibold'
                    : isCompleted
                    ? 'text-ink-muted line-through'
                    : 'text-ink-muted opacity-60'
                }`}
              >
                <span className="w-1 h-1 rounded-full bg-current shrink-0" />
                <span>{step}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ThoughtLine;
