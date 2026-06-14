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
   ============================================================ */

interface FilmReelProps {
  className?: string;
}

export default function FilmReel({ className }: FilmReelProps) {
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

  // ==========================================
  // PHYSICS & MOTION STATE
  // ==========================================
  const rotation = useMotionValue(0);
  // Explicitly map to degrees to guarantee browser compatibility
  const rotateTransform = useTransform(rotation, (r) => `${r}deg`);
  const isHovered = useRef(false);
  const currentBaseSpeed = useRef(6); // degrees per second (360deg / 60s)

  // Track global scroll velocity
  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);

  // Apply extreme damping/mass to simulate a heavy physical machine
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 120,
    stiffness: 30,
    mass: 15
  });

  useAnimationFrame((t, delta) => {
    // Prevent huge delta spikes on tab switch
    const safeDelta = Math.min(delta, 100);

    // 1. Manage Hover Speed (Subtle acceleration)
    const targetBaseSpeed = isHovered.current ? 12 : 6;
    // Ease the base speed towards the target so it feels physical, not digital
    currentBaseSpeed.current += (targetBaseSpeed - currentBaseSpeed.current) * 0.01;

    // 2. Manage Scroll Speed
    // smoothVelocity is pixels per second.
    // Increased multiplier to 0.1 so scroll has a stronger but heavier impact
    const scrollDelta = smoothVelocity.get() * 0.1;

    // 3. Apply Total Rotation
    // delta is time since last frame in milliseconds (e.g. 16.6ms)
    const moveBy = (currentBaseSpeed.current + scrollDelta) * (safeDelta / 1000);
    rotation.set(rotation.get() + moveBy);
  });

  return (
    <div 
      className={`${styles.filmReelContainer} ${className || ''}`} 
      aria-hidden="true"
      onMouseEnter={() => (isHovered.current = true)}
      onMouseLeave={() => (isHovered.current = false)}
    >
      {/* Projection glow */}
      <div className={styles.reelProjectionGlow} />

      {/* The rotating reel */}
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
            {/* Shadows */}
            <filter id="shadow-ambient" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="18" stdDeviation="24" floodColor="#000" floodOpacity="0.85" />
            </filter>
            
            <filter id="shadow-film" x="-10%" y="-10%" width="120%" height="120%">
              <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#000" floodOpacity="0.95" />
            </filter>

            {/* Premium Polished Aluminum / Cinema Chrome Gradients */}
            {/* Highly reflective multi-stop linear gradient mapped diagonally */}
            <linearGradient id="metal-chrome" x1="10%" y1="0%" x2="90%" y2="100%">
              <stop offset="0%" stopColor="#555a60" />
              <stop offset="20%" stopColor="#b5bac2" />  {/* Primary Catchlight */}
              <stop offset="35%" stopColor="#1a1c1e" />  {/* Deep Core Shadow */}
              <stop offset="55%" stopColor="#3d4248" />
              <stop offset="80%" stopColor="#8a8e94" />  {/* Secondary Highlight */}
              <stop offset="100%" stopColor="#101112" />
            </linearGradient>

            {/* Subtle radial brushing for the flat flange sections */}
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
          <circle cx={CX} cy={CY} r="215" fill="url(#film-spool)" filter="url(#shadow-film)" />
          {/* Subtle Film Texture / Winding lines */}
          {[170, 182, 194, 206, 214].map(r => (
            <circle key={`film-groove-${r}`} cx={CX} cy={CY} r={r} fill="none" stroke="rgba(255,255,255,0.025)" strokeWidth="1.5" />
          ))}

          {/* ========================================
              LAYER 3: FRONT FLANGE (Solid Plate with Holes)
              ======================================== */}
          <g filter="url(#shadow-ambient)">
            <g mask="url(#cutout-mask)">
              {/* Main Plate Body */}
              <circle cx={CX} cy={CY} r="236" fill="url(#metal-brushed)" />
              <circle cx={CX} cy={CY} r="236" fill="url(#metal-chrome)" opacity="0.75" style={{ mixBlendMode: 'overlay' }} />
              
              {/* Outer Rim Thickness & Ridges */}
              {/* Deep outer dropoff */}
              <circle cx={CX} cy={CY} r="234" fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth="4" />
              {/* Main thick raised rim */}
              <circle cx={CX} cy={CY} r="226" fill="none" stroke="url(#metal-chrome)" strokeWidth="14" />
              {/* Inner rim dropoff */}
              <circle cx={CX} cy={CY} r="218" fill="none" stroke="rgba(0,0,0,0.6)" strokeWidth="2" />
              {/* Bright specular ring catching the light */}
              <circle cx={CX} cy={CY} r="226" fill="none" stroke="url(#edge-highlight)" strokeWidth="1.5" />
              <circle cx={CX} cy={CY} r="235.5" fill="none" stroke="url(#edge-highlight)" strokeWidth="1" />

              {/* Central Hub Plate Structure */}
              <circle cx={CX} cy={CY} r="65" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="4" />
              <circle cx={CX} cy={CY} r="63" fill="none" stroke="url(#metal-chrome)" strokeWidth="2" />
            </g>

            {/* ========================================
                LAYER 4: MACHINED BEVELS FOR CUTOUTS
                Drawn over the mask to create thick physical 
                edges and realistic light interactions inside the holes.
                ======================================== */}
            {cutouts.map((hole, i) => (
              <g key={`hole-bevel-${i}`}>
                {/* Thick dark shadow simulating depth/thickness of the flange plate */}
                <circle cx={hole.cx} cy={hole.cy} r={hole.r} fill="none" stroke="rgba(0,0,0,0.9)" strokeWidth="6" />
                {/* Sharp machined edge catching the light */}
                <circle cx={hole.cx} cy={hole.cy} r={hole.r} fill="none" stroke="url(#edge-highlight)" strokeWidth="1.5" />
              </g>
            ))}
          </g>

          {/* ========================================
              LAYER 5: THE CLASSIC 6-HOLE HUB
              Authentic central mount structure
              ======================================== */}
          {/* Inner Recessed Hub Base */}
          <circle cx={CX} cy={CY} r="48" fill="url(#metal-chrome)" stroke="rgba(0,0,0,0.7)" strokeWidth="3" />
          
          {/* 6 authentic drive/ventilation holes surrounding the axle */}
          {cutouts.map((hole, i) => {
             // Position these perfectly aligned with the main cutouts, inside the hub
             const px = Number((CX + 28 * Math.cos(hole.angle * Math.PI / 180)).toFixed(4));
             const py = Number((CY + 28 * Math.sin(hole.angle * Math.PI / 180)).toFixed(4));
             return (
               <g key={`hub-hole-${i}`}>
                 {/* Dark hole cutting through to back layer */}
                 <circle cx={px} cy={py} r="5" fill="#060708" />
                 {/* Shadows and bevels for the small holes */}
                 <circle cx={px} cy={py} r="5" fill="none" stroke="rgba(0,0,0,0.8)" strokeWidth="2" />
                 <circle cx={px} cy={py} r="5" fill="none" stroke="url(#edge-highlight)" strokeWidth="0.8" />
               </g>
             );
          })}

          {/* Central Axle Cutout Edge */}
          <circle cx={CX} cy={CY} r="18" fill="none" stroke="rgba(0,0,0,0.9)" strokeWidth="4" />
          <circle cx={CX} cy={CY} r="18" fill="none" stroke="url(#edge-highlight)" strokeWidth="1.5" />
          <circle cx={CX} cy={CY} r="13" fill="#0a0a0c" />
          
        </svg>
      </motion.div>
    </div>
  );
}

