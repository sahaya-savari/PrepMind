import { PropsWithChildren } from 'react';
import { motion, type MotionProps } from 'framer-motion';

type AnimatedCardProps = PropsWithChildren<{
  className?: string; // touched for patch
  hover?: boolean;
}> & MotionProps;

function AnimatedCard({ children, className = '', hover = true, ...rest }: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      whileHover={hover ? { scale: 1.01 } : undefined}
      className={`card-surface p-6 ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedCard;