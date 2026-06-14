'use client';

import React, { useRef } from 'react';
import { motion, useScroll, useTransform, useAnimationFrame, useMotionValue } from 'framer-motion';
import styles from './HeroSection.module.css';
import FilmReel from './FilmReel';

/* ============================================================
   HeroSection — "The First Frame"
   
   Phase 2: Motion & Narrative (Refined)
   
   "The projector has found its film. The reels are loaded.
    This is the first frame."
   
   Layout: Asymmetric
   - Left: Scene indicator, headline, divider, subtext, CTA
   - Right: Film reel with projection glow
   - Background: Layered cinematic atmosphere
   
   Scroll Narrative:
   - Reel physics (momentum)
   - Hero content yields focus (opacity fade 1->0, Y 0->-20px in second half)
   - Projection beam expands (scale 1->1.15)
   ============================================================ */

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);

  // Track scroll progress of the hero section itself
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  // Exit narrative mapping (MotionValues)
  // Content fades and translates up gracefully starting at 20% scroll, finishing at 80%
  const contentOpacity = useTransform(scrollYProgress, [0.2, 0.8], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0.2, 0.8], [0, -30]);

  // Projection atmosphere subtly expands (1 to 1.15) on scroll without getting brighter
  const glowScale = useTransform(scrollYProgress, [0, 0.8], [1, 1.15]);

  // Atmospheric Breathing & Drift (Pure Physics)
  // Very slow cycle: opacity 0.92 -> 1.00 -> 0.92 (10-15s)
  // Background gradient shifts 1-2%
  const time = useMotionValue(0);
  const breathOpacity = useTransform(time, t => 0.96 + Math.sin(t / 2000) * 0.04);
  const breathX = useTransform(time, t => Math.sin(t / 3000) * 1.5 + "%");
  const breathY = useTransform(time, t => Math.cos(t / 2500) * 1.5 + "%");

  useAnimationFrame((t) => {
    time.set(t);
  });

  return (
    <section ref={containerRef} className={styles.hero} id="hero" data-nav-section="hero">
      {/* ========================================
          BACKGROUND LAYER SYSTEM
          Layer 1: Deep black (via CSS)
          Layer 2: Film grain
          Layer 3: Vignette
          Layer 4: Projection glow (from reel)
          ======================================== */}
      <div className={styles.heroBg}>
        <div className={styles.heroFilmGrain} aria-hidden="true" />
        <div className={styles.heroVignette} aria-hidden="true" />
        
        {/* Glow scales smoothly on scroll via Framer Motion without React re-renders */}
        <motion.div 
          className={styles.heroProjectionGlowWrapper} 
          style={{ scale: glowScale }}
          aria-hidden="true" 
        >
          {/* Inner div handles the physical atmospheric drift and breathing */}
          <motion.div 
            className={styles.heroProjectionGlow} 
            style={{ 
              opacity: breathOpacity, 
              x: breathX, 
              y: breathY 
            }}
          />
        </motion.div>
      </div>

      {/* ========================================
          MAIN CONTENT CONTAINER
          Asymmetric: Content left, Reel right
          ======================================== */}
      <div className={styles.heroInner}>
        {/* --- Left: Content Block animated out on scroll --- */}
        <motion.div 
          className={styles.heroContent}
          style={{ opacity: contentOpacity, y: contentY }}
        >
          {/* Scene Indicator */}
          <div className={styles.sceneIndicator}>
            <span className={styles.sceneDot} />
            <span>SC. 00</span>
            <span className={styles.sceneDash}>—</span>
            <span>TITLE CARD</span>
          </div>

          {/* Headline */}
          <h1 className={styles.heroHeadline}>
            <span className={styles.headlineLine}>THE NEXT</span>
            <span className={styles.headlineLine}>FRAME</span>
          </h1>

          {/* Divider */}
          <div className={styles.heroDivider} aria-hidden="true" />

          {/* Supporting Text */}
          <p className={styles.heroSubtext}>
            The premier production house for technology and innovation at NIT Surat.
          </p>

          {/* CTA */}
          <motion.a 
            href="#about" 
            className={styles.heroCta}
            whileHover={{ 
               // Subtle cinematic light response without scaling
               boxShadow: "0 0 20px rgba(255, 255, 255, 0.1) inset, 0 4px 20px rgba(0, 0, 0, 0.4)",
               backgroundColor: "rgba(255, 255, 255, 0.08)"
            }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <svg 
              className={styles.ctaIcon}
              viewBox="0 0 24 24" 
              fill="currentColor"
              aria-hidden="true"
            >
              <polygon points="8,5 19,12 8,19" />
            </svg>
            Explore
          </motion.a>
        </motion.div>

        {/* --- Right: Film Reel --- */}
        <div className={styles.heroReelSide}>
          <FilmReel />
        </div>
      </div>

      {/* ========================================
          SCROLL INDICATOR
          ======================================== */}
      <div className={styles.scrollIndicator} aria-hidden="true">
        <div className={styles.scrollLine} />
      </div>
    </section>
  );
}
