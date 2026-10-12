import React, { useRef, useEffect } from 'react';

export interface PixelCardProps {
  className?: string;
  variant?:
    | 'lilac'
    | 'sage'
    | 'blue'
    | 'coral'
    | 'crimson'
    | 'amber'
    | 'indigo'
    | 'periwinkle'
    | 'olive'
    | string;
  pixelSize?: number;
  gap?: number;
  children: React.ReactNode;
  onClick?: () => void;
}

export const VARIANT_COLORS: Record<string, string> = {
  lilac: '#C792EA',     // Primary Terminal-Dark Accent
  sage: '#C3E88D',      // Positive / Strings
  blue: '#82AAFF',      // Info / Functions
  coral: '#F78C6C',     // Warning / Numbers
  crimson: '#F07178',   // Error
  // Aliases from reference
  amber: '#C792EA',
  indigo: '#82AAFF',
  periwinkle: '#82AAFF',
  olive: '#C3E88D',
  default: '#C792EA',
  pink: '#C792EA',
  purple: '#C792EA',
  green: '#C3E88D',
  positive: '#C3E88D',
  neutral: '#82AAFF',
};

/**
 * PixelCard Component (Terminal-Dark Spec)
 * Interactive canvas pixel trails on hover/pointer movement using terminal-dark syntax colors.
 * Respects prefers-reduced-motion. No drop-shadows.
 */
export const PixelCard: React.FC<PixelCardProps> = ({
  className = '',
  variant = 'lilac',
  pixelSize = 6,
  gap = 3,
  children,
  onClick,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: -100, y: -100, active: false });

  const activeColor = VARIANT_COLORS[variant] || variant || VARIANT_COLORS.default;

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = container.offsetWidth);
    let height = (canvas.height = container.offsetHeight);

    const step = pixelSize + gap;
    const cols = Math.ceil(width / step);
    const rows = Math.ceil(height / step);

    const grid: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));

    const handlePointerMove = (e: MouseEvent | TouchEvent) => {
      const rect = container.getBoundingClientRect();
      const clientX = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = 'touches' in e && e.touches.length > 0 ? e.touches[0].clientY : (e as MouseEvent).clientY;
      mouseRef.current = {
        x: clientX - rect.left,
        y: clientY - rect.top,
        active: true,
      };
    };

    const handlePointerLeave = () => {
      mouseRef.current.active = false;
    };

    container.addEventListener('mousemove', handlePointerMove);
    container.addEventListener('mouseleave', handlePointerLeave);
    container.addEventListener('touchmove', handlePointerMove, { passive: true });
    container.addEventListener('touchend', handlePointerLeave);

    const handleResize = () => {
      if (!canvas || !container) return;
      width = canvas.width = container.offsetWidth;
      height = canvas.height = container.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;
      const radius = 75;

      for (let c = 0; c < cols; c++) {
        for (let r = 0; r < rows; r++) {
          const px = c * step;
          const py = r * step;

          if (mouseRef.current.active) {
            const dist = Math.hypot(px - mx, py - my);
            if (dist < radius) {
              const targetAlpha = Math.max(0, 1 - dist / radius);
              grid[c][r] = Math.max(grid[c][r], targetAlpha * 0.7);
            }
          }

          grid[c][r] *= 0.93;

          if (grid[c][r] > 0.02) {
            ctx.fillStyle = activeColor;
            ctx.globalAlpha = grid[c][r];
            ctx.fillRect(px, py, pixelSize, pixelSize);
          }
        }
      }

      ctx.globalAlpha = 1;
      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      container.removeEventListener('mousemove', handlePointerMove);
      container.removeEventListener('mouseleave', handlePointerLeave);
      container.removeEventListener('touchmove', handlePointerMove);
      container.removeEventListener('touchend', handlePointerLeave);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [pixelSize, gap, activeColor]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group relative overflow-hidden rounded-xl border border-midnight-border bg-midnight-surface p-6 transition-all duration-200 hover:border-midnight-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight-accent ${
        onClick ? 'cursor-pointer select-none' : ''
      } ${className}`}
    >
      {/* Top accent line */}
      <div
        className="pointer-events-none absolute top-0 left-0 right-0 h-[2px] opacity-40 transition-opacity duration-200 group-hover:opacity-100"
        style={{
          background: `linear-gradient(90deg, transparent, ${activeColor}, transparent)`,
        }}
        aria-hidden="true"
      />

      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  );
};

export default PixelCard;
