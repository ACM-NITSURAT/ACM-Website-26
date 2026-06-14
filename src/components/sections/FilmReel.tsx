'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useVelocity, useSpring, useAnimationFrame, useMotionValue, useTransform } from 'framer-motion';
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
  atmosphereOpacity?: any; // MotionValue<number>
}

export default function FilmReel({ className, atmosphereOpacity }: FilmReelProps) {
  const CX = 250;
  const CY = 250;
  
  // 6 Classic Reel Cutouts
  const cutoutCount = 6;
  const cutouts = Array.from({ length: cutoutCount }, (_, i) => {
    const angle = i * 60; // 360 / 6
    const rad = angle * Math.PI / 180;
    // R = Distance from center, r = Radius of cutout hole
    const R = 135; 
    const r = 58;  
    
    // Use .toFixed(4) to prevent Server/Client hydration mismatches 
    // due to floating point math differences in Node vs Browser
    return {
      angle,
      cx: Number((CX + R * Math.cos(rad)).toFixed(4)),
      cy: Number((CY + R * Math.sin(rad)).toFixed(4)),
      r
    };
  });

  /* ==========================================
     PHYSICS & MOTION STATE
     
     The reel is a heavy mechanical object.
     It doesn't snap to speeds — it eases into them.
     It doesn't stop instantly — it coasts.
     ========================================== */
  const rotation = useMotionValue(0);
  const time = useMotionValue(0);
  const rotateTransform = useTransform(rotation, (r) => `${r}deg`);
  const isHovered = useRef(false);
  const currentBaseSpeed = useRef(8); // degrees per second (360° / 45s)

  /* ==========================================
     SCROLL-DRIVEN MOMENTUM
     
     The reel responds to scroll velocity with physical inertia.
     
     Previous values (mass:15, damping:120) were so heavy that
     normal scrolling produced zero visible effect.
     
     New values:
     - mass: 4 — heavy but responsive
     - damping: 50 — decays over ~1-2 seconds
     - stiffness: 40 — moderate spring tension
     - multiplier: 0.15 — scroll produces visible acceleration
     
     A normal mouse wheel flick should produce a brief,
     visible speed burst that gradually decays.
     ========================================== */
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);

  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 40,
    mass: 4
  });

  useAnimationFrame((t, delta) => {
    // Prevent huge delta spikes on tab switch
    const safeDelta = Math.min(delta, 100);

    /* 1. Hover acceleration
       Target: 20 deg/s on hover (2.5x idle), 8 deg/s off hover
       Easing: 0.04 per frame → reaches target in ~1.5 seconds
       This feels like a machine responding to proximity. */
    const targetBaseSpeed = isHovered.current ? 20 : 8;
    currentBaseSpeed.current += (targetBaseSpeed - currentBaseSpeed.current) * 0.04;

    /* 2. Scroll momentum injection
       smoothVelocity is pixels per second, damped by the spring.
       Multiplied by 0.15 to convert px/s to meaningful deg/s contribution.
       A fast scroll (~2000 px/s) → ~300 deg/s added → dramatic burst. */
    const scrollDelta = smoothVelocity.get() * 0.15;

    /* 3. Apply total rotation
       delta is milliseconds since last frame. */
    const moveBy = (currentBaseSpeed.current + scrollDelta) * (safeDelta / 1000);
    rotation.set(rotation.get() + moveBy);
    
    /* 4. Sync global time for breathing effects */
    time.set(t);
  });

  /* 5. Sync specular brightness to atmospheric breathing
     We map the exact atmospheric breathing curve to the specular highlight.
     The atmosphere ranges from ~0.24 to ~0.92. 
     We map this to 0.4 -> 1.1 for a strong metallic flash that is perfectly in sync. */
  const localBreathOpacity = useTransform(time, t => 0.8); // Fallback
  
  const syncedOpacity = useTransform(
    atmosphereOpacity || localBreathOpacity,
    [0.24, 0.96],
    [0.4, 1.1]
  );

  return (
    <div 
      className={`${styles.filmReelContainer} ${className || ''}`} 
      aria-hidden="true"
      onMouseEnter={() => (isHovered.current = true)}
      onMouseLeave={() => (isHovered.current = false)}
    >
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
      <div className={styles.filmReelFixedLighting} />
      <motion.div 
        className={styles.reelRimCatchLight} 
        style={{ opacity: syncedOpacity }}
      />
      <div className={styles.reelCoreShadow} />

      {/* The rotating reel — ONLY this spins */}
      <motion.div 
        className={styles.filmReelRotator}
        style={{ rotate: rotateTransform }}
      >
        <svg
          viewBox="0 0 500 500"
          className={styles.filmReelSvg}
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
              {/* Central Axle Cutout */}
              <circle cx={CX} cy={CY} r="18" fill="black" />
            </mask>
          </defs>

          {/* ========================================
              LAYER 1: BACK FLANGE
              Creates physical back depth visible through cutouts
              ======================================== */}
          <circle cx={CX} cy={CY} r="236" fill="#141518" />
          <circle cx={CX} cy={CY} r="236" fill="url(#metal-chrome)" opacity="0.3" />

          {/* ========================================
              LAYER 2: SPOOLED FILM
              Tightly wound strips visible between flanges
              ======================================== */}
          <circle cx={CX} cy={CY} r="215" fill="url(#film-spool)" />
          {/* Subtle Film Texture / Winding lines */}
          {[170, 182, 194, 206, 214].map(r => (
            <circle key={`film-groove-${r}`} cx={CX} cy={CY} r={r} fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1.5" />
          ))}

          {/* ========================================
              LAYER 3: FRONT FLANGE (Solid Plate with Holes)
              ======================================== */}
          <g>
            <g mask="url(#cutout-mask)">
              {/* Main Plate Body */}
              <circle cx={CX} cy={CY} r="236" fill="url(#metal-brushed)" />
              <circle cx={CX} cy={CY} r="236" fill="url(#metal-chrome)" opacity="0.75" style={{ mixBlendMode: 'overlay' }} />
              
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
              LAYER 5: THE CLASSIC 6-HOLE HUB
              ======================================== */}
          <circle cx={CX} cy={CY} r="48" fill="url(#metal-chrome)" stroke="rgba(0,0,0,0.7)" strokeWidth="3" />
          
          {/* 6 authentic drive/ventilation holes */}
          {cutouts.map((hole, i) => {
             const px = Number((CX + 28 * Math.cos(hole.angle * Math.PI / 180)).toFixed(4));
             const py = Number((CY + 28 * Math.sin(hole.angle * Math.PI / 180)).toFixed(4));
             return (
               <g key={`hub-hole-${i}`}>
                 <circle cx={px} cy={py} r="5" fill="#060708" />
                 <circle cx={px} cy={py} r="5" fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth="2" />
                 <circle cx={px} cy={py} r="5" fill="none" stroke="url(#edge-highlight)" strokeWidth="0.8" />
               </g>
             );
          })}

          {/* Central Axle */}
          <circle cx={CX} cy={CY} r="18" fill="none" stroke="rgba(0,0,0,0.9)" strokeWidth="4" />
          <circle cx={CX} cy={CY} r="18" fill="none" stroke="url(#edge-highlight)" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r="13" fill="#0a0a0c" />
          
        </svg>
      </motion.div>
    </div>
  );
}
