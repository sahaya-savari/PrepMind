import React from 'react';

export interface StarBorderProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  as?: 'button' | 'div' | 'a';
  href?: string;
  className?: string;
  color?: string;
  trailColor?: string;
  duration?: number;
  speed?: string;
  direction?: 'clockwise' | 'counter-clockwise';
  stars?: number;
  trailLength?: number;
  thickness?: number;
  radius?: number;
  glow?: number;
  hover?: 'lap' | 'speed' | 'none' | string;
  sparkle?: boolean;
  clickPulse?: boolean;
  theme?: 'dark' | 'light';
  children: React.ReactNode;
}

/**
 * StarBorder Component (Terminal-Dark Spec)
 * Hairline rotating gradient border without excessive glowing or drop shadows.
 */
export const StarBorder: React.FC<StarBorderProps> = ({
  as: Component = 'button',
  className = '',
  color = 'var(--accent)',
  trailColor,
  duration = 4,
  speed,
  direction = 'clockwise',
  stars = 1,
  trailLength = 0.3,
  thickness = 1,
  radius = 8,
  glow = 0,
  hover = 'lap',
  sparkle = false,
  clickPulse = true,
  theme = 'dark',
  children,
  ...props
}) => {
  const animDuration = speed || `${duration}s`;
  const isClockwise = direction === 'clockwise';
  const effectiveTrail = trailColor || color;

  return (
    <Component
      style={{
        borderRadius: `${radius}px`,
        padding: `${thickness}px`,
      }}
      className={`relative inline-flex items-center justify-center overflow-hidden font-medium transition-all group focus:outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent focus-visible:ring-offset-2 focus-visible:ring-offset-midnight-bg ${
        clickPulse ? 'active:scale-[0.98]' : ''
      } ${className}`}
      {...(props as any)}
    >
      {/* Animated Conic Gradient Beam */}
      <span
        className={`absolute inset-[-1000%] opacity-80 group-hover:opacity-100 motion-reduce:animate-none motion-reduce:opacity-60 pointer-events-none ${
          isClockwise
            ? 'animate-[spin_4s_linear_infinite]'
            : 'animate-[spin_4s_linear_infinite_reverse]'
        }`}
        style={{
          animationDuration: animDuration,
          filter: glow ? `drop-shadow(0 0 ${glow * 4}px ${color})` : undefined,
          background: `conic-gradient(from 90deg at 50% 50%, transparent 0%, ${effectiveTrail} ${
            trailLength * 100
          }%, transparent 100%)`,
        }}
        aria-hidden="true"
      />

      {/* Inner surface container */}
      <span
        style={{
          borderRadius: `${Math.max(0, radius - thickness)}px`,
        }}
        className="relative z-10 inline-flex items-center justify-center w-full h-full px-5 py-2.5 bg-midnight-elevated text-ink-primary font-medium text-xs sm:text-sm transition-colors group-hover:bg-midnight-surface"
      >
        {children}
      </span>
    </Component>
  );
};

export default StarBorder;
