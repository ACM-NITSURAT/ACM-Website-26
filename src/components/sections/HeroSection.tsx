'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useAnimationFrame, useMotionValue } from 'framer-motion';
import styles from './HeroSection.module.css';
import FilmReel from './FilmReel';
import CinematicDust from './CinematicDust';

/* ============================================================
   HeroSection — "The First Frame"
   
   The hero is a projection scene, not a webpage section.
   
   A projector exists BEYOND the viewport (upper-left).
   Its beam travels through atmospheric dust and haze,
   illuminating a metal film reel suspended in the space.
   
   The user should perceive the scene first and the UI second.
   
   Layout: Asymmetric
   - Left: Scene indicator, headline, divider, subtext, CTA
   - Right: Film reel sitting inside the projection environment
   - Background: 9-layer atmospheric depth system
   
   Scroll Narrative:
   - Atmosphere evolves (warm → expanded, color shift)
   - Reel gains momentum + parallax (lingers as text exits)
   - Content yields focus (opacity 1→0, Y 0→-60px)
   - Projection beam expands (scale 1→1.3)
   ============================================================ */

export default function HeroSection() {
  const containerRef = useRef<HTMLElement>(null);

  /* ==========================================
     SCENE ESTABLISHMENT
     Projection glow fades in over ~1.2s after mount.
     ========================================== */
  const [sceneEstablished, setSceneEstablished] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setSceneEstablished(true), 50);
    return () => clearTimeout(timer);
  }, []);

  /* ==========================================
     SCROLL TRACKING
     ========================================== */
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"]
  });

  const contentOpacity = useTransform(scrollYProgress, [0.1, 0.7], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0.1, 0.7], [0, -60]);
  const reelY = useTransform(scrollYProgress, [0, 0.8], [0, 20]);
  const glowScale = useTransform(scrollYProgress, [0, 0.8], [1, 1.3]);
  const atmosphereEvolution = useTransform(scrollYProgress, [0.3, 0.9], [0, 0.06]);
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  /* ==========================================
     PROJECTION INSTABILITY — "The projector is running"
     
     Multi-frequency breathing creates organic, non-repeating variation.
     
     Slow thermal pulse (~12s) — lamp temperature cycling
     Medium flicker (~1.6s) — electrical variation
     Fast micro-jitter (~0.25s) — mechanical vibration
     
     Combined, these produce a living, unstable light source
     that never feels frozen or mathematically perfect.
     ========================================== */
  const time = useMotionValue(0);
  
  const breathOpacity = useTransform(time, t => {
    const thermalPulse = Math.sin(t / 2000) * 0.3;      // ±30% slow thermal
    const electricalFlicker = Math.sin(t / 160) * 0.04;  // ±4% medium
    const mechanicalJitter = Math.cos(t / 250) * 0.025 + Math.sin(t / 800) * 0.015; // ±4% fast
    return 0.58 + thermalPulse + electricalFlicker + mechanicalJitter;
  });

  // Micro beam drift — the projection isn't perfectly stable
  const breathX = useTransform(time, t => {
    const primaryDrift = Math.sin(t / 3500) * 5;
    const secondaryWobble = Math.cos(t / 1200) * 1.5;
    return (primaryDrift + secondaryWobble) + "%";
  });
  
  const breathY = useTransform(time, t => {
    const primaryDrift = Math.cos(t / 2800) * 5;
    const secondaryWobble = Math.sin(t / 1500) * 1.2;
    return (primaryDrift + secondaryWobble) + "%";
  });

  useAnimationFrame((t) => {
    time.set(t);
  });

  return (
    <section ref={containerRef} className={styles.hero} id="hero" data-nav-section="hero">
      {/* ========================================
          ATMOSPHERE SYSTEM — The Projection Environment
          ======================================== */}
      <div className={styles.heroBg}>
        {/* Foundational layers */}
        <div className={styles.heroFilmGrain} aria-hidden="true" />
        <div className={styles.heroVignette} aria-hidden="true" />
        
        {/* Atmosphere scales on scroll to simulate widening beam */}
        <motion.div 
          className={`${styles.heroAtmosphereSystem} ${sceneEstablished ? styles.sceneEstablished : ''}`} 
          style={{ scale: glowScale }}
          aria-hidden="true" 
        >
          {/* Depth Band 1: Far Atmosphere — slowest drift (CSS animated) */}
          <div className={styles.farAtmosphere} />

          {/* Rhythm Container: breathes and drifts together
              Simulates projection lamp instability */}
          <motion.div 
            className={styles.atmosphereRhythmContainer} 
            style={{ 
              opacity: breathOpacity, 
              x: breathX, 
              y: breathY 
            }}
          >
            {/* Projection Beam — off-screen source illumination */}
            <div className={styles.projectionBeam}>
              <div className={styles.projectionSourceRays} />
              <div className={styles.beamCore} />
              <div className={styles.beamFlare} />
              <div className={styles.beamScatter} />
              <div className={styles.beamEdge} />
            </div>

            {/* Volumetric Rays — revealed by atmosphere */}
            <div className={styles.volumetricRays}>
              <div className={styles.rayLayer1} />
              <div className={styles.rayLayer2} />
              <div className={styles.rayLayer3} />
            </div>

            {/* Depth Band 2: Mid Atmosphere (CSS animated) */}
            <div className={styles.midAtmosphere} />

            {/* Cinematic Dust — hierarchical particles */}
            <div className={styles.dustContainer}>
              <CinematicDust />
            </div>
          </motion.div>
        </motion.div>

        {/* Depth Band 3: Near Atmosphere / Foreground Haze
            Sits above reel z-index to create depth */}
        <div className={`${styles.nearAtmosphere} ${sceneEstablished ? styles.sceneEstablished : ''}`} />

        {/* Atmosphere Evolution — scroll-driven color shift */}
        <motion.div
          className={styles.heroAtmosphereEvolution}
          style={{ opacity: atmosphereEvolution }}
          aria-hidden="true"
        />
      </div>

      {/* ========================================
          MAIN CONTENT CONTAINER
          ======================================== */}
      <div className={styles.heroInner}>
        {/* --- Left: Content Block --- */}
        <motion.div 
          className={styles.heroContent}
          style={{ opacity: contentOpacity, y: contentY }}
        >
          <div className={styles.sceneIndicator}>
            <span className={styles.sceneDot} />
            <span>SC. 00</span>
            <span className={styles.sceneDash}>—</span>
            <span>ACM NIT SURAT</span>
          </div>

          <h1 className={styles.heroHeadline}>
            <span className={styles.headlineLine}>BUILD THE</span>
            <span className={styles.headlineLine}>NEXT</span>
            <span className={styles.headlineLine}>FRAME</span>
          </h1>

          <div className={styles.heroDivider} aria-hidden="true" />

          <p className={styles.heroSubtext}>
            A community of builders, innovators, and problem-solvers shaping what comes next.
          </p>

          <motion.a 
            href="#about" 
            className={styles.heroCta}
            whileHover={{ 
              boxShadow: "0 0 32px rgba(255, 200, 100, 0.15), inset 0 1px 0 rgba(255, 240, 200, 0.15)",
              borderColor: "rgba(255, 210, 140, 0.3)",
              backgroundColor: "rgba(255, 255, 255, 0.04)"
            }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
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
        <motion.div 
          className={styles.heroReelSide}
          style={{ y: reelY }}
        >
          <FilmReel atmosphereOpacity={breathOpacity} />
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.div 
        className={styles.scrollIndicator} 
        style={{ opacity: scrollIndicatorOpacity }}
        aria-hidden="true"
      >
        <div className={styles.scrollLine} />
      </motion.div>
    </section>
  );
}
