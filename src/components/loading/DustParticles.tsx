'use client';

import React, {
  useRef,
  useEffect,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import styles from './CinemaLoader.module.css';

/* ============================================================
   DustParticles — Canvas 2D Procedural Particle System
   
   Creates floating dust particles that are only visible
   within the projector's illuminated area.
   
   Features:
   - Simplex-noise-like organic drift
   - Projection-area visibility masking
   - Warm white particles matching projector color
   - Batch-drawn for 60fps performance
   ============================================================ */

interface Particle {
  x: number;
  y: number;
  size: number;
  baseOpacity: number;
  speedX: number;
  speedY: number;
  life: number;
  maxLife: number;
  noiseOffsetX: number;
  noiseOffsetY: number;
  phase: number;
}

export interface DustParticlesHandle {
  setMaskRadius: (radius: number) => void;
  burst: () => void;
  fadeOut: () => void;
}

interface DustParticlesProps {
  className?: string;
}

const PARTICLE_COUNT = 35;
const PARTICLE_COLOR_R = 245;
const PARTICLE_COLOR_G = 230;
const PARTICLE_COLOR_B = 200;

/**
 * Simple pseudo-noise function for organic movement.
 * Not true simplex noise, but produces smooth, natural-looking drift
 * without any library dependency.
 */
function smoothNoise(x: number, y: number, t: number): number {
  const val =
    Math.sin(x * 0.7 + t * 0.3) * 0.5 +
    Math.sin(y * 0.8 + t * 0.2) * 0.3 +
    Math.sin((x + y) * 0.5 + t * 0.15) * 0.2;
  return val;
}

function createParticle(canvasW: number, canvasH: number): Particle {
  const centerX = canvasW / 2;
  const centerY = canvasH / 2;
  const spread = Math.min(canvasW, canvasH) * 0.4;

  return {
    x: centerX + (Math.random() - 0.5) * spread,
    y: centerY + (Math.random() - 0.5) * spread,
    size: Math.random() < 0.7 ? 0.8 + Math.random() * 0.7 : 1.5 + Math.random() * 1.5,
    baseOpacity: 0.08 + Math.random() * 0.27,
    speedX: (Math.random() - 0.5) * 0.15,
    speedY: -(0.15 + Math.random() * 0.25), // Upward drift (convection)
    life: 0,
    maxLife: 180 + Math.random() * 300, // 3-8 seconds at 60fps
    noiseOffsetX: Math.random() * 1000,
    noiseOffsetY: Math.random() * 1000,
    phase: Math.random() * Math.PI * 2,
  };
}

const DustParticles = forwardRef<DustParticlesHandle, DustParticlesProps>(
  ({ className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animFrameRef = useRef<number>(0);
    const particlesRef = useRef<Particle[]>([]);
    const maskRadiusRef = useRef<number>(0);
    const fadeMultiplierRef = useRef<number>(1);
    const timeRef = useRef<number>(0);
    const burstActiveRef = useRef<boolean>(false);

    useImperativeHandle(ref, () => ({
      setMaskRadius: (radius: number) => {
        maskRadiusRef.current = radius;
      },
      burst: () => {
        burstActiveRef.current = true;
        // Reset burst after 300ms
        setTimeout(() => {
          burstActiveRef.current = false;
        }, 300);
      },
      fadeOut: () => {
        fadeMultiplierRef.current = 0;
      },
    }));

    const render = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const w = canvas.width;
      const h = canvas.height;
      const centerX = w / 2;
      const centerY = h / 2;
      const maskRadius = maskRadiusRef.current;
      const fadeMul = fadeMultiplierRef.current;

      timeRef.current += 1;
      const t = timeRef.current;

      ctx.clearRect(0, 0, w, h);

      if (maskRadius <= 0 || fadeMul <= 0) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      const particles = particlesRef.current;

      // Batch draw — single beginPath/fill cycle
      ctx.beginPath();

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;

        // Reset particle when it dies
        if (p.life > p.maxLife) {
          const newP = createParticle(w, h);
          particles[i] = newP;
          continue;
        }

        // Noise-based drift
        const noiseX = smoothNoise(
          p.noiseOffsetX + p.x * 0.003,
          p.noiseOffsetY + p.y * 0.003,
          t * 0.01
        );
        const noiseY = smoothNoise(
          p.noiseOffsetX + p.y * 0.003 + 100,
          p.noiseOffsetY + p.x * 0.003 + 100,
          t * 0.01 + 50
        );

        let vx = p.speedX + noiseX * 0.3;
        let vy = p.speedY + noiseY * 0.2;

        // Burst: push particles outward
        if (burstActiveRef.current) {
          const dx = p.x - centerX;
          const dy = p.y - centerY;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          vx += (dx / dist) * 1.5;
          vy += (dy / dist) * 1.5;
        }

        p.x += vx;
        p.y += vy;

        // Fade in/out based on life
        let lifeAlpha = 1;
        const fadeInFrames = 30; // 0.5s
        const fadeOutFrames = 30;
        if (p.life < fadeInFrames) {
          lifeAlpha = p.life / fadeInFrames;
        } else if (p.life > p.maxLife - fadeOutFrames) {
          lifeAlpha = (p.maxLife - p.life) / fadeOutFrames;
        }

        // Distance from center — gaussian falloff
        const dx = p.x - centerX;
        const dy = p.y - centerY;
        const distFromCenter = Math.sqrt(dx * dx + dy * dy);
        const maskAlpha = Math.max(
          0,
          1 - (distFromCenter / maskRadius) * (distFromCenter / maskRadius)
        );

        const finalAlpha = p.baseOpacity * lifeAlpha * maskAlpha * fadeMul;

        if (finalAlpha < 0.01) continue;

        // Draw particle as a circle
        ctx.fillStyle = `rgba(${PARTICLE_COLOR_R}, ${PARTICLE_COLOR_G}, ${PARTICLE_COLOR_B}, ${finalAlpha})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameRef.current = requestAnimationFrame(render);
    }, []);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.scale(dpr, dpr);
      };

      resize();
      window.addEventListener('resize', resize);

      // Initialize particles
      const w = window.innerWidth;
      const h = window.innerHeight;
      particlesRef.current = Array.from({ length: PARTICLE_COUNT }, () =>
        createParticle(w, h)
      );

      // Start render loop
      animFrameRef.current = requestAnimationFrame(render);

      return () => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animFrameRef.current);
      };
    }, [render]);

    return (
      <canvas
        ref={canvasRef}
        className={`${styles.dustCanvas} ${className || ''}`}
        aria-hidden="true"
      />
    );
  }
);

DustParticles.displayName = 'DustParticles';

export default DustParticles;
