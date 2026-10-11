import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export interface GlideOption<T extends string = string> {
  value: T;
  label: string;
  badge?: string;
  icon?: React.ReactNode;
}

export interface GlideSelectProps<T extends string = string> {
  options: GlideOption<T>[];
  value: T;
  onChange: (val: T) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * GlideSelect Component (Terminal-Dark Spec)
 * Segmented control with smooth gliding active indicator and keyboard navigation.
 */
export function GlideSelect<T extends string = string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: GlideSelectProps<T>) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [sliderStyle, setSliderStyle] = useState<{ left: number; width: number }>({
    left: 0,
    width: 0,
  });

  const selectedIndex = options.findIndex((opt) => opt.value === value);

  useEffect(() => {
    if (!containerRef.current) return;
    const buttons = containerRef.current.querySelectorAll<HTMLButtonElement>('button[data-option]');
    const activeBtn = buttons[selectedIndex];
    if (activeBtn) {
      setSliderStyle({
        left: activeBtn.offsetLeft,
        width: activeBtn.offsetWidth,
      });
    }
  }, [selectedIndex, options]);

  const sizeClasses = {
    sm: 'text-xs py-1 px-2.5',
    md: 'text-xs sm:text-sm py-1.5 px-3.5',
    lg: 'text-sm sm:text-base py-2 px-4',
  }[size];

  return (
    <div
      ref={containerRef}
      role="radiogroup"
      className={`relative inline-flex items-center p-1 rounded-lg border border-midnight-border bg-midnight-surface select-none max-w-full overflow-x-auto scrollbar-none ${className}`}
    >
      {/* Gliding active pill */}
      <motion.div
        className="absolute top-1 bottom-1 rounded-md bg-midnight-elevated border border-midnight-strongBorder pointer-events-none"
        initial={false}
        animate={{
          left: sliderStyle.left,
          width: sliderStyle.width,
        }}
        transition={{ type: 'spring', stiffness: 450, damping: 35 }}
      />

      {options.map((option) => {
        const isSelected = option.value === value;
        return (
          <button
            key={option.value}
            data-option={option.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(option.value)}
            className={`relative z-10 flex items-center gap-1.5 font-medium whitespace-nowrap transition-colors duration-150 rounded-md cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-midnight-accent ${sizeClasses} ${
              isSelected
                ? 'text-ink-primary font-semibold'
                : 'text-ink-secondary hover:text-ink-primary'
            }`}
          >
            {option.icon && <span className="opacity-80">{option.icon}</span>}
            <span>{option.label}</span>
            {option.badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-midnight-subtle text-midnight-accent border border-midnight-border">
                {option.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export default GlideSelect;
