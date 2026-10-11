import { PropsWithChildren } from 'react';
import { motion, type MotionProps } from 'framer-motion';

type AnimatedCardProps = PropsWithChildren<{
  className?: string;
  hover?: boolean;
}> & MotionProps;

function AnimatedCard({ children, className = '', hover = true, ...rest }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: 'easeOut' }}
      whileHover={hover ? { translateY: -2 } : undefined}
      className={`rounded-xl border border-midnight-border bg-midnight-surface p-5 sm:p-6 transition-colors ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedCard;