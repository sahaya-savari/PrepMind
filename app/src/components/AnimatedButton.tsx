import { ButtonHTMLAttributes, PropsWithChildren } from 'react';
import { motion } from 'framer-motion';

type AnimatedButtonProps = PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement>> & {
  glow?: boolean;
};

function AnimatedButton({ children, glow = true, className = '', ...rest }: AnimatedButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.01, boxShadow: glow ? '0 8px 20px rgba(59, 130, 246, 0.2)' : undefined }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className={`soft-button px-4 py-3 ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  );
}

export default AnimatedButton;