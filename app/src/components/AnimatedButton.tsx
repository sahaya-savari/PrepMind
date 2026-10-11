import { PropsWithChildren } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';

type AnimatedButtonProps = PropsWithChildren<HTMLMotionProps<'button'>> & {
  glow?: boolean;
  variant?: 'primary' | 'secondary' | 'outline';
};

function AnimatedButton({
  children,
  glow = false,
  variant = 'primary',
  className = '',
  disabled,
  ...rest
}: AnimatedButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-bg disabled:opacity-50 disabled:cursor-not-allowed select-none px-4 py-2.5 text-sm min-h-[42px]';

  const variantClasses = {
    primary: 'bg-midnight-accent text-[#0B0D12] hover:bg-midnight-accentHover shadow-sm',
    secondary: 'bg-midnight-subtle border border-midnight-border text-ink-primary hover:bg-midnight-elevated hover:border-midnight-accent/60',
    outline: 'bg-transparent border border-midnight-border text-ink-secondary hover:text-ink-primary hover:border-midnight-accent/60 hover:bg-midnight-subtle/50',
  }[variant];

  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.01 }}
      whileTap={disabled ? undefined : { scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
      className={`${baseClasses} ${variantClasses} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export default AnimatedButton;