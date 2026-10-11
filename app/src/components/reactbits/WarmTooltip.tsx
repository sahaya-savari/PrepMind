import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface WarmTooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

/**
 * WarmTooltip Component (React Bits TS-TW variant)
 * Contextual accessible tooltip with smooth micro-fade and terminal styling.
 */
export const WarmTooltip: React.FC<WarmTooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const posClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 pointer-events-none px-2.5 py-1 text-[11px] font-mono whitespace-nowrap rounded-md bg-[var(--surface-elevated)] text-[var(--text-primary)] border border-[var(--border-strong)] shadow-lg ${posClasses}`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
