import React, { useRef, useEffect } from 'react';

export interface ClickSparkProps {
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  children: React.ReactNode;
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  speed: number;
  alpha: number;
  decay: number;
  size: number;
  color: string;
}

/**
 * ClickSpark Component (Terminal-Dark Spec)
 * Subtle click-sparkle canvas micro-interaction with prefers-reduced-motion safety.
 */
export const ClickSpark: React.FC<ClickSparkProps> = ({
  sparkColor = 'var(--accent)',
  sparkSize = 8,
  sparkRadius = 12,
  sparkCount = 6,
  duration = 350,
  children,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sparksRef = useRef<Spark[]>([]);
  const animIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sparksRef.current = sparksRef.current.filter((spark) => spark.alpha > 0.05);

      for (const spark of sparksRef.current) {
        spark.x += Math.cos(spark.angle) * spark.speed;
        spark.y += Math.sin(spark.angle) * spark.speed;
        spark.alpha -= spark.decay;

        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
        ctx.fillStyle = spark.color;
        ctx.globalAlpha = Math.max(0, spark.alpha);
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      if (sparksRef.current.length > 0) {
        animIdRef.current = requestAnimationFrame(animate);
      } else {
        animIdRef.current = null;
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

      // Terminal-dark syntax palette sparks: Lilac, Mint/Sage, Soft Blue, Soft White
      const colors = [sparkColor, '#C792EA', '#D4A9F0', '#C3E88D', '#82AAFF', '#E6E8EB'];

      for (let i = 0; i < sparkCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = (Math.random() * 2 + 1) * (sparkRadius / 10);
        sparksRef.current.push({
          x: e.clientX,
          y: e.clientY,
          angle,
          speed,
          alpha: 1,
          decay: 1000 / (duration * 60),
          size: Math.random() * (sparkSize / 2) + 1.2,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }

      if (!animIdRef.current) {
        animIdRef.current = requestAnimationFrame(animate);
      }
    };

    window.addEventListener('pointerdown', handleClick, { passive: true });

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointerdown', handleClick);
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [sparkColor, sparkSize, sparkRadius, sparkCount, duration]);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-50 select-none"
        aria-hidden="true"
      />
      {children}
    </>
  );
};

export default ClickSpark;
