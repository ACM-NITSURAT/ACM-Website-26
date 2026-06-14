'use client';

import React, { useRef, useEffect } from 'react';
import styles from './HeroSection.module.css';

/* ============================================================
   CinematicDust — Hierarchical Particle System
   
   Simulates dust suspended in a projection beam.
   
   Particle Classes:
   1. Atmospheric (many, tiny, low alpha) — ambient air particulate
   2. Drifting (fewer, medium) — visible floating motes
   3. Large Motes (handful) — occasional bright catches
   4. Hero Particles (1-3 at any time) — rare, bright, attention-catching
   
   Visibility Rules:
   - Particles near the beam center (upper-left to center-right) are brighter
   - Particles far from the beam are dimmer or invisible
   - This creates the illusion of "dust visible only in the light"
   
   Motion:
   - Very slow drift + Brownian micro-turbulence
   - Particles feel suspended, not animated
   - Phase-based twinkling (not uniform)
   ============================================================ */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  // Brownian turbulence
  turbX: number;
  turbY: number;
  turbPhase: number;
  turbSpeed: number;
  // Visual
  size: number;
  baseAlpha: number;
  phase: number;
  phaseSpeed: number;
  // Class: 0=atmospheric, 1=drifting, 2=large, 3=hero
  particleClass: number;
  // Color temperature (0=warm near beam, 1=cool far from beam)
  warmth: number;
}

// The projection path spans from the off-screen source (upper-left) 
// to the film reel (center-right). Dust is illuminated along this corridor.
const SOURCE_X = 0.15;
const SOURCE_Y = 0.25;
const REEL_X = 0.75;
const REEL_Y = 0.50;
const BEAM_RADIUS_START = 0.35; // Tighter near source
const BEAM_RADIUS_END = 0.55;   // Wider near reel

function getIllumination(nx: number, ny: number): number {
  // Vector from source to reel
  const dx = REEL_X - SOURCE_X;
  const dy = REEL_Y - SOURCE_Y;
  const lenSq = dx * dx + dy * dy;
  
  // Project particle position onto the projection path (0 to 1)
  const t = Math.max(0, Math.min(1, ((nx - SOURCE_X) * dx + (ny - SOURCE_Y) * dy) / lenSq));
  
  // Closest point on the projection center-line
  const closestX = SOURCE_X + t * dx;
  const closestY = SOURCE_Y + t * dy;
  
  // Distance from particle to the center-line
  const distX = nx - closestX;
  const distY = ny - closestY;
  const dist = Math.sqrt(distX * distX + distY * distY);
  
  // Beam widens as it travels towards the reel
  const localRadius = BEAM_RADIUS_START + t * (BEAM_RADIUS_END - BEAM_RADIUS_START);
  
  // Smooth falloff: full brightness at center-line, 0 at localRadius
  const falloff = Math.max(0, 1 - dist / localRadius);
  
  // Quadratic falloff for more natural light decay
  // Also slightly boost brightness near the reel (t approaching 1) to anchor it
  const intensity = falloff * falloff * (0.8 + 0.3 * t);
  
  return Math.min(1, intensity);
}

export default function CinematicDust() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let particles: Particle[] = [];
    let animationFrameId: number;

    // Particle counts by class
    const ATMOSPHERIC_COUNT = 50;
    const DRIFTING_COUNT = 20;
    const LARGE_COUNT = 7;
    const HERO_COUNT = 3;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    const createParticle = (particleClass: number, w: number, h: number): Particle => {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const nx = x / w;
      const ny = y / h;
      
      // Distance from beam path affects warmth
      const warmth = getIllumination(nx, ny);

      let size: number, baseAlpha: number, speed: number, phaseSpeed: number;

      switch (particleClass) {
        case 0: // Atmospheric — many, tiny, faint
          size = Math.random() * 1.2 + 0.4;
          baseAlpha = Math.random() * 0.25 + 0.05;
          speed = 0.15;
          phaseSpeed = 0.005 + Math.random() * 0.008;
          break;
        case 1: // Drifting — medium
          size = Math.random() * 2 + 1;
          baseAlpha = Math.random() * 0.35 + 0.1;
          speed = 0.2;
          phaseSpeed = 0.008 + Math.random() * 0.01;
          break;
        case 2: // Large motes
          size = Math.random() * 2.5 + 2;
          baseAlpha = Math.random() * 0.4 + 0.15;
          speed = 0.12;
          phaseSpeed = 0.003 + Math.random() * 0.006;
          break;
        case 3: // Hero particles — rare, bright
          size = Math.random() * 2 + 2.5;
          baseAlpha = Math.random() * 0.3 + 0.4;
          speed = 0.08;
          phaseSpeed = 0.002 + Math.random() * 0.004;
          break;
        default:
          size = 1;
          baseAlpha = 0.1;
          speed = 0.15;
          phaseSpeed = 0.006;
      }

      return {
        x,
        y,
        vx: (Math.random() - 0.5) * speed,
        vy: (Math.random() - 0.5) * speed - 0.05, // Slight upward thermal drift
        turbX: 0,
        turbY: 0,
        turbPhase: Math.random() * Math.PI * 2,
        turbSpeed: 0.003 + Math.random() * 0.005,
        size,
        baseAlpha,
        phase: Math.random() * Math.PI * 2,
        phaseSpeed,
        particleClass,
        warmth,
      };
    };

    const initParticles = () => {
      particles = [];
      const w = canvas.width;
      const h = canvas.height;

      for (let i = 0; i < ATMOSPHERIC_COUNT; i++) {
        particles.push(createParticle(0, w, h));
      }
      for (let i = 0; i < DRIFTING_COUNT; i++) {
        particles.push(createParticle(1, w, h));
      }
      for (let i = 0; i < LARGE_COUNT; i++) {
        particles.push(createParticle(2, w, h));
      }
      for (let i = 0; i < HERO_COUNT; i++) {
        particles.push(createParticle(3, w, h));
      }
    };

    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      particles.forEach((p) => {
        // Brownian micro-turbulence — makes particles feel suspended, not sliding
        p.turbPhase += p.turbSpeed;
        p.turbX = Math.sin(p.turbPhase) * 0.3;
        p.turbY = Math.cos(p.turbPhase * 1.3) * 0.25;

        // Update position with drift + turbulence
        p.x += p.vx + p.turbX;
        p.y += p.vy + p.turbY;

        // Wrap around
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Recalculate illumination based on current position
        const nx = p.x / w;
        const ny = p.y / h;
        const illumination = getIllumination(nx, ny);

        // Twinkle (phase oscillation)
        p.phase += p.phaseSpeed;
        const twinkle = 0.4 + 0.6 * Math.sin(p.phase);

        // Final alpha = base × illumination × twinkle
        // Illumination is the key multiplier — particles outside the beam vanish
        const alpha = p.baseAlpha * illumination * twinkle;

        // Skip invisible particles
        if (alpha < 0.005) return;

        // Color: warm near beam center, cooler at edges
        const warmFactor = illumination;
        const r = 255;
        const g = Math.round(210 + warmFactor * 30); // 210-240
        const b = Math.round(160 + (1 - warmFactor) * 60); // 160-220

        // Draw
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
        ctx.fill();

        // Hero particles get a subtle glow
        if (p.particleClass === 3 && alpha > 0.15) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 230, 190, ${(alpha * 0.15).toFixed(3)})`;
          ctx.fill();
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    window.addEventListener('resize', resize);
    resize();
    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className={styles.cinematicDustCanvas}
      aria-hidden="true"
    />
  );
}
