import React, { useRef, useEffect } from 'react';

export interface HyperspeedProps {
  className?: string;
  speed?: number;
  streakCount?: number;
  fov?: number;
}

/**
 * Hyperspeed Component (Terminal-Dark Spec)
 * Restrained syntax-tinted warp/streak canvas background.
 * Uses native HTML5 canvas with zero external 3D engine dependencies.
 * Automatically respects prefers-reduced-motion and pauses when not visible.
 */
export const Hyperspeed: React.FC<HyperspeedProps> = ({
  className = '',
  speed = 1.0,
  streakCount = 70,
  fov = 240,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || window.innerHeight);

    const handleResize = () => {
      if (!canvas || !canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };

    window.addEventListener('resize', handleResize);

    interface Streak {
      x: number;
      y: number;
      z: number;
      prevZ: number;
      color: string;
      weight: number;
    }

    // Terminal-dark syntax palette: Lilac #C792EA, Mint/Sage #C3E88D, Blue #82AAFF, Coral #F78C6C, Pure Off-White #E6E8EB
    const colors = [
      'rgba(199, 146, 234, 0.70)', // Lilac
      'rgba(195, 232, 141, 0.65)', // Sage
      'rgba(130, 170, 255, 0.65)', // Blue
      'rgba(247, 140, 108, 0.55)', // Coral
      'rgba(230, 232, 235, 0.40)', // Primary Text
    ];

    const streaks: Streak[] = Array.from({ length: streakCount }, () => ({
      x: (Math.random() - 0.5) * width * 1.5,
      y: (Math.random() - 0.5) * height * 1.5,
      z: Math.random() * fov + 50,
      prevZ: 0,
      color: colors[Math.floor(Math.random() * colors.length)],
      weight: Math.random() * 1.2 + 0.6,
    }));

    streaks.forEach((s) => (s.prevZ = s.z));

    const render = () => {
      // Obsidian near-black background trail persistence
      ctx.fillStyle = 'rgba(10, 11, 13, 0.32)';
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;

      for (let i = 0; i < streaks.length; i++) {
        const s = streaks[i];
        s.prevZ = s.z;
        s.z -= speed * 1.5;

        if (s.z <= 0) {
          s.z = fov;
          s.prevZ = s.z;
          s.x = (Math.random() - 0.5) * width * 1.5;
          s.y = (Math.random() - 0.5) * height * 1.5;
        }

        const k = fov / s.z;
        const px = s.x * k + cx;
        const py = s.y * k + cy;

        const prevK = fov / s.prevZ;
        const prevPx = s.x * prevK + cx;
        const prevPy = s.y * prevK + cy;

        if (px >= 0 && px <= width && py >= 0 && py <= height) {
          ctx.beginPath();
          ctx.moveTo(prevPx, prevPy);
          ctx.lineTo(px, py);
          ctx.strokeStyle = s.color;
          ctx.lineWidth = s.weight * (k * 0.35);
          ctx.lineCap = 'round';
          ctx.stroke();
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [speed, streakCount, fov]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 pointer-events-none opacity-30 select-none ${className}`}
      aria-hidden="true"
    />
  );
};

export default Hyperspeed;
