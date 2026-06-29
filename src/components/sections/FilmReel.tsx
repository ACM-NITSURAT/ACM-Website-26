'use client';

import React, { useRef, useMemo } from 'react';
import { motion, useMotionValue, useTransform, useAnimationFrame, useInView } from 'framer-motion';
import styles from './HeroSection.module.css';

/* ============================================================
   FilmReel — The Source Mechanism
   
   A highly accurate, premium execution of the classic 35mm
   cinema reel. Built with rigorous geometry matching real-world
   references (6 large circular cutouts, physical tiered hub, 
   solid outer rim thickness).
   
   Phase 2 Physics:
   - Idle: 8 deg/s (360° in 45 seconds) — slow, alive
   - Hover: accelerates to 20 deg/s over ~1.5s — mechanical response
   - Scroll: gains momentum from scroll velocity, heavy spring
   - All rotation via MotionValues — zero React re-renders
   ============================================================ */

interface FilmReelProps {
  className?: string;
  size?: number; // default 500
  speedMultiplier?: number; // default 1
  direction?: number; // 1 for clockwise, -1 for counter-clockwise
  transitionState?: 'idle' | 'accel1' | 'accel2' | 'accel3' | 'flash' | 'intro' | 'reverseFlash' | 'reverseFlashHero';
}

function FilmReel({
  className,
  transitionState = 'idle',
  size,
  speedMultiplier = 1,
  direction = 1
}: FilmReelProps) {
  const CX = 250;
  const CY = 250;

  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef);

  // Memoize cutout geometry — only recomputed if component remounts
  const cutouts = useMemo(() => {
    const cutoutCount = 6;
    const images = [
      '/dotslash/Dotslash9-team.webp',
      '/webp/DSC_2075.webp',
      '/dotslash/DSC_2163 (1).webp',
      '/webp/DSC_6725.webp',
      '/dotslash/Dotslash9-winners.webp',
      '/webp/IMG_7643.webp',
    ];

    return Array.from({ length: cutoutCount }).map((_, i) => {
      const angle = i * 60;
      const rad = angle * Math.PI / 180;
      const R = 135;
      const r = 58;

      return {
        angle,
        cx: Number((CX + R * Math.cos(rad)).toFixed(4)),
        cy: Number((CY + R * Math.sin(rad)).toFixed(4)),
        r,
        image: images[i]
      };
    });
  }, []);

  /* ==========================================
     PHYSICS & MOTION STATE
     
     The reel is a heavy mechanical object.
     It doesn't snap to speeds — it eases into them.
     It doesn't stop instantly — it coasts.
     ========================================== */
  const rotation = useMotionValue(0);
  const rotateTransform = useTransform(rotation, (r) => `${r}deg`);
  const isHovered = useRef(false);
  const currentBaseSpeed = useRef(8 * speedMultiplier); // Restored to 8 deg/s (360° / 45s)
  const isBlurActive = transitionState === 'accel2' || transitionState === 'accel3';
  const isGlobalBlurActive = transitionState === 'accel3';
  const accelStartTime = useRef<number | null>(null);

  /* ==========================================
     INTERACTIVE SCRUBBING
     
     The heavy scroll-velocity effect was causing scroll lag on
     some devices due to Framer Motion's scroll listener.
     
     Replaced with an interactive Rewind effect:
     When the user hovers over the reel, it smoothly reverses
     direction and accelerates, like scrubbing backward through footage.
     ========================================== */

  useAnimationFrame((t, delta) => {
    if (!isInView) return; // Pause physics when scrolled off-screen

    // Prevent huge delta spikes on tab switch
    const safeDelta = Math.min(delta, 100);

    /* 1. Hover & Spin-up acceleration */
    // Base speed is 8 (forward). On hover, it reverses to -60 (rewind scrub)
    let targetBaseSpeed = (isHovered.current ? -60 : 8) * speedMultiplier;
    let acceleration = 0.03; // Smooth transition

    const isAccelerating = ['accel1', 'accel2', 'accel3', 'flash'].includes(transitionState);

    if (isAccelerating) {
      if (accelStartTime.current === null) {
        accelStartTime.current = t;
      }
      const elapsed = t - accelStartTime.current;
      const maxSpeed = 2250;
      const progress = Math.min(elapsed / 1800, 1);
      // Smooth quartic easing for a deeply physical, heavy spin-up
      const easeInQuart = progress * progress * progress * progress;

      const targetSpeed = (8 * speedMultiplier) + (maxSpeed * easeInQuart);
      // Directly track the mathematical curve for zero-lag smooth acceleration
      currentBaseSpeed.current = targetSpeed;
    } else {
      accelStartTime.current = null;
      currentBaseSpeed.current += (targetBaseSpeed - currentBaseSpeed.current) * acceleration;
    }

    /* 2. Apply total rotation (Removed scrollDelta) */
    const moveBy = (currentBaseSpeed.current) * (safeDelta / 1000) * direction;
    rotation.set(rotation.get() + moveBy);
  });



  return (
    <div
      ref={containerRef}
      className={`${styles.filmReelContainer} ${className || ''}`}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
      onMouseEnter={() => (isHovered.current = true)}
      onMouseLeave={() => (isHovered.current = false)}
    >
      {/* Invisible circular hitbox so the rectangular corners don't trigger hover */}
      <div className={styles.filmReelHitbox} />

      {/* PHYSICAL PROJECTED SHADOW SYSTEM
          Matches the upper-left projection light source */}
      <div className={styles.reelProjectedShadow}>
        <div className={styles.shadowExtension} />
        <div className={styles.shadowCast} />
        <div className={styles.shadowContact} />
      </div>

      {/* FIXED DIRECTIONAL LIGHTING SYSTEM (does NOT rotate)
          These layers sit stationary. As the metal geometry
          rotates beneath them, highlights slide across the surface. */}
      <div className={`${styles.filmReelFixedLighting} ${transitionState !== 'idle' ? styles.blueLightTransition : ''}`} />
      <div className={`${styles.reelRimCatchLight} ${transitionState !== 'idle' ? styles.blueLightTransition : ''}`} />
      <div className={styles.reelCoreShadow} />

      {/* The rotating reel — ONLY this spins */}
      <motion.div
        className={styles.filmReelRotator}
        style={{ rotate: rotateTransform }}
      >
        <svg
          viewBox="0 0 500 500"
          className={`${styles.filmReelSvg} ${isGlobalBlurActive ? styles.reelGlobalBlur : ''}`}
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Shadows moved to CSS to prevent rotation with reel */}            {/* Premium Polished Aluminum / Cinema Chrome Gradients */}
            {/* Higher contrast for more realistic metallic response */}
            <linearGradient id="metal-chrome" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4a4f55" />
              <stop offset="35%" stopColor="#8a8f95" />
              <stop offset="65%" stopColor="#2a2e33" />
              <stop offset="100%" stopColor="#1a1c1e" />
            </linearGradient>

            {/* Radial brushing for the flat flange sections */}
            <radialGradient id="metal-brushed" cx="50%" cy="50%" r="50%">
              <stop offset="20%" stopColor="#2c2e32" />
              <stop offset="60%" stopColor="#41454a" />
              <stop offset="90%" stopColor="#1c1d20" />
              <stop offset="100%" stopColor="#101112" />
            </radialGradient>

            {/* Sharp Specular Edge Highlight */}
            <linearGradient id="edge-highlight" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.7)" />
              <stop offset="15%" stopColor="rgba(255,255,255,0.1)" />
              <stop offset="85%" stopColor="rgba(255,255,255,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.9)" />
            </linearGradient>

            {/* Dark Film Wound Inside */}
            <radialGradient id="film-spool" cx="50%" cy="50%" r="50%">
              <stop offset="40%" stopColor="#0a0e14" />
              <stop offset="85%" stopColor="#161b24" />
              <stop offset="100%" stopColor="#040608" />
            </radialGradient>

            {/* Directional Specular Arc moved to fixed overlay to prevent rotation */}
            {/* Inner shadow for cutout holes — plate thickness illusion */}
            <radialGradient id="hole-inner-shadow" cx="50%" cy="40%" r="50%">
              <stop offset="70%" stopColor="rgba(0,0,0,0)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
            </radialGradient>

            {/* The SVG Mask punching the 6 holes out of the solid plate */}
            <mask id="cutout-mask">
              <circle cx={CX} cy={CY} r="250" fill="white" />
              {cutouts.map((hole, i) => (
                <circle
                  key={`mask-hole-${i}`}
                  cx={hole.cx}
                  cy={hole.cy}
                  r={hole.r}
                  fill="black"
                />
              ))}
              {/* Central Axle Cutout / Arc Reactor Base */}
              <circle cx={CX} cy={CY} r="18" fill="black" />
            </mask>

            {/* Clip path to ensure images stay perfectly inside the holes */}
            <clipPath id="image-clips">
              {cutouts.map((hole, i) => (
                <circle key={`clip-hole-${i}`} cx={hole.cx} cy={hole.cy} r={hole.r} />
              ))}
            </clipPath>
          </defs>

          {/* ========================================
              LAYER 1: BACK FLANGE
              Creates physical back depth visible through cutouts
              ======================================== */}
          <circle cx={CX} cy={CY} r="236" fill="#141518" />
          <circle cx={CX} cy={CY} r="236" fill="url(#metal-chrome)" opacity="0.3" />

          {/* ========================================
              LAYER 2: SPOOLED FILM & VIEW-MASTER IMAGES
              Tightly wound strips visible between flanges
              ======================================== */}
          <circle cx={CX} cy={CY} r="215" fill="url(#film-spool)" />
          {/* Subtle Film Texture / Winding lines */}
          {[170, 182, 194, 206, 214].map(r => (
            <circle key={`film-groove-${r}`} cx={CX} cy={CY} r={r} fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1.5" />
          ))}

          {/* View-Master Event Highlight Photos */}
          <g clipPath="url(#image-clips)">
            {cutouts.map((hole, i) => (
              <image
                key={`img-${i}`}
                href={hole.image}
                x={hole.cx - hole.r}
                y={hole.cy - hole.r}
                width={hole.r * 2}
                height={hole.r * 2}
                preserveAspectRatio="xMidYMid slice"
                opacity="0.85"
                filter="grayscale(100%) contrast(130%) brightness(0.8)"
              />
            ))}
          </g>

          {/* ========================================
              LAYER 3: FRONT FLANGE (Solid Plate with Holes)
              ======================================== */}
          <g>
            <g mask="url(#cutout-mask)">
              {/* Main Plate Body */}
              <circle cx={CX} cy={CY} r="236" fill="url(#metal-brushed)" />
              {/* Removed mix-blend-mode: overlay for massive GPU performance gains */}
              <circle cx={CX} cy={CY} r="236" fill="url(#metal-chrome)" opacity="0.4" />

              {/* Outer Rim Thickness & Ridges */}
              <circle cx={CX} cy={CY} r="234" fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth="4" />
              <circle cx={CX} cy={CY} r="226" fill="none" stroke="url(#metal-chrome)" strokeWidth="14" />
              <circle cx={CX} cy={CY} r="218" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="2" />
              <circle cx={CX} cy={CY} r="226" fill="none" stroke="url(#edge-highlight)" strokeWidth="1.5" />
              <circle cx={CX} cy={CY} r="235.5" fill="none" stroke="url(#edge-highlight)" strokeWidth="1" />
              {/* Directional specular arc moved to fixed overlay */}

              {/* Central Hub Plate Structure */}
              <circle cx={CX} cy={CY} r="65" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="4" />
              <circle cx={CX} cy={CY} r="63" fill="none" stroke="url(#metal-chrome)" strokeWidth="2" />
            </g>

            {/* ========================================
                LAYER 4: MACHINED BEVELS FOR CUTOUTS
                ======================================== */}
            {cutouts.map((hole, i) => (
              <g key={`hole-bevel-${i}`}>
                {/* Inner shadow — plate thickness illusion */}
                <circle cx={hole.cx} cy={hole.cy} r={hole.r - 1} fill="url(#hole-inner-shadow)" opacity="0.7" />
                {/* Thick dark stroke — depth of flange plate */}
                <circle cx={hole.cx} cy={hole.cy} r={hole.r} fill="none" stroke="rgba(0,0,0,0.9)" strokeWidth="6" />
                {/* Sharp machined edge catching the light */}
                <circle cx={hole.cx} cy={hole.cy} r={hole.r} fill="none" stroke="url(#edge-highlight)" strokeWidth="1.5" />
              </g>
            ))}
          </g>

          {/* ========================================
              LAYER 5: ARC REACTOR CORE (ACM Edition)
              ======================================== */}
          {/* Outer Housing Ring (Matches original reel color) */}
          <circle cx={CX} cy={CY} r="50" fill="#060709" stroke="rgba(0,0,0,0.9)" strokeWidth="5" />
          <circle cx={CX} cy={CY} r="48" fill="none" stroke="url(#metal-chrome)" strokeWidth="2" />

          {/* Glowing Inner Reactor Chamber */}
          <circle cx={CX} cy={CY} r="40" fill="#020304" />

          {/* Pure White / Silver Energy Rings */}
          <g style={{ filter: 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.6)) drop-shadow(0 0 16px rgba(220, 230, 240, 0.3))' }}>
            {/* Outer Energy Ring */}
            <circle cx={CX} cy={CY} r="35" fill="none" stroke="rgba(240, 245, 255, 0.8)" strokeWidth="3" />
            <circle cx={CX} cy={CY} r="35" fill="none" stroke="rgba(255, 255, 255, 0.5)" strokeWidth="1" />

            {/* Middle Grid Ring */}
            <circle cx={CX} cy={CY} r="26" fill="none" stroke="rgba(255, 255, 255, 0.9)" strokeWidth="8" strokeDasharray="4 4" />

            {/* Core Lens (Blinding White) */}
            <circle cx={CX} cy={CY} r="16" fill="rgba(255, 255, 255, 1)" />
            <circle cx={CX} cy={CY} r="16" fill="none" stroke="rgba(200, 210, 220, 1)" strokeWidth="2" />
            <circle cx={CX} cy={CY} r="10" fill="#ffffff" style={{ filter: 'drop-shadow(0 0 6px #ffffff)' }} />
          </g>

          {/* Gunmetal Coils and Cage */}
          {cutouts.map((hole, i) => {
            const angle = hole.angle * Math.PI / 180;
            const px = Number((CX + 45 * Math.cos(angle)).toFixed(4));
            const py = Number((CY + 45 * Math.sin(angle)).toFixed(4));

            return (
              <g key={`reactor-coil-${i}`} transform={`rotate(${hole.angle} ${CX} ${CY})`}>
                {/* Titanium Coil Wrap */}
                <rect x={CX + 38} y={CY - 8} width="12" height="16" fill="#4a555e" stroke="#2a3238" strokeWidth="1" />
                {/* Coil wiring lines */}
                {[-6, -3, 0, 3, 6].map((yOffset) => (
                  <line key={`wire-${yOffset}`} x1={CX + 38} y1={CY + yOffset} x2={CX + 50} y2={CY + yOffset} stroke="#687682" strokeWidth="1" />
                ))}
                {/* Metal Cage Bracket */}
                <rect x={CX + 36} y={CY - 2} width="16" height="4" fill="url(#metal-chrome)" stroke="#000" strokeWidth="1" />
                <circle cx={CX + 44} cy={CY} r="1.5" fill="#000" />
              </g>
            );
          })}

          {/* Inner Cage Spokes */}
          {cutouts.map((hole, i) => {
            return (
              <g key={`reactor-spoke-${i}`} transform={`rotate(${hole.angle + 30} ${CX} ${CY})`}>
                {/* Metal spokes reaching into the center */}
                <line x1={CX + 16} y1={CY} x2={CX + 35} y2={CY} stroke="url(#metal-chrome)" strokeWidth="4" />
                <line x1={CX + 16} y1={CY} x2={CX + 35} y2={CY} stroke="#000" strokeWidth="1" strokeDasharray="2 6" />
              </g>
            );
          })}
          {/* Pre-flash cinematic expanding ring (Stage 3) */}
          <circle
            cx="250"
            cy="250"
            r="45"
            fill="none"
            stroke="url(#accentGradient)"
            strokeWidth="2"
            className={`${styles.preFlashRing} ${transitionState === 'accel3' ? styles.preFlashRingActive : ''} ${transitionState !== 'idle' ? styles.blueLightTransition : ''}`}
          />

          {/* Pulsing Gold Glow (Stage 2 and 3) */}
          <circle
            cx="250"
            cy="250"
            r="80"
            fill="url(#accentGradient)"
            className={`${styles.centralGlow} ${transitionState === 'accel2' ? styles.glowStage2 : ''} ${transitionState === 'accel3' ? styles.glowStage3 : ''} ${transitionState !== 'idle' ? styles.blueLightTransition : ''}`}
          />

          {/* Invisible target for the Lightning Strike transition effect */}
          <circle data-reel-hub="true" cx={CX} cy={CY} r="20" fill="transparent" />

        </svg>
      </motion.div>
    </div>
  );
}

export default React.memo(FilmReel);
