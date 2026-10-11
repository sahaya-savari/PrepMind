import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface AnimatedListProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}

/**
 * AnimatedList Component (Terminal-Dark Spec)
 * Renders list items with smooth staggered entrances and layout transitions.
 * Respects prefers-reduced-motion.
 */
export const AnimatedList: React.FC<AnimatedListProps> = ({
  children,
  className = '',
  delay = 0.04,
}) => {
  return (
    <div className={`space-y-3 ${className}`}>
      <AnimatePresence mode="popLayout">
        {React.Children.map(children, (child, index) => {
          if (!React.isValidElement(child)) return null;
          return (
            <motion.div
              key={child.key || index}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 0.22,
                delay: index * delay,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {child}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default AnimatedList;
