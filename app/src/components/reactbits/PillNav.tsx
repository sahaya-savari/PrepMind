import React from 'react';
import { motion } from 'framer-motion';

export interface NavItem {
  id: string;
  path: string;
  label: string;
  icon?: React.ReactNode;
}

export interface PillNavProps {
  items: NavItem[];
  activeId: string;
  onSelect: (item: NavItem) => void;
  className?: string;
}

/**
 * PillNav Component (React Bits TS-TW variant)
 * Accessible navigation bar with a gliding active pill indicator.
 */
export const PillNav: React.FC<PillNavProps> = ({
  items,
  activeId,
  onSelect,
  className = '',
}) => {
  return (
    <nav
      className={`relative inline-flex items-center gap-1 p-1 rounded-full border border-[var(--border)] bg-[var(--surface)] ${className}`}
      aria-label="Main Navigation"
    >
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className={`relative z-10 flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors duration-150 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent)] ${
              isActive
                ? 'text-[var(--text-primary)] font-semibold'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <motion.div
                layoutId="pillNavIndicator"
                className="absolute inset-0 rounded-full bg-[var(--surface-elevated)] border border-[var(--border-strong)] -z-10 shadow-sm"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
              />
            )}
            {item.icon && <span className="w-3.5 h-3.5 opacity-80">{item.icon}</span>}
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
};
