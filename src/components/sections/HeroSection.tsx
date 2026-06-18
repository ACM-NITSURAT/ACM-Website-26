'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useAnimationFrame, useMotionValue } from 'framer-motion';
import styles from './HeroSection.module.css';
import FilmReel from './FilmReel';
import CinematicDust from './CinematicDust';
import { getMasterVolume } from '../loading/ProjectorAudio';

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

import { TransitionState } from '@/app/page';

export interface HeroSectionProps {
  onExploreClick?: () => void;
  isTransitioning?: boolean;
  transitionState?: TransitionState;
}

export default function HeroSection({ onExploreClick, isTransitioning, transitionState }: HeroSectionProps = {}) {
  const containerRef = useRef<HTMLElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  /* ==========================================
     SCENE ESTABLISHMENT
     Projection glow fades in over ~1.2s after mount.
     ========================================== */
  const [sceneEstablished, setSceneEstablished] = useState(false);
  const [lightningPaths, setLightningPaths] = useState<{
    main: string;
    sparks: { cx: number; cy: number; r: number; opacity: number }[];
    startX: number;
    startY: number;
    endX: number;
    endY: number;
  } | null>(null);

  // Calculate lightning path when transitioning begins
  useEffect(() => {
    if (!isTransitioning || !ctaRef.current) {
      setLightningPaths(null);
      return;
    }

    let animationFrameId: number;
    let lastDraw = 0;

    const drawLightning = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(drawLightning);

      // Throtte to ~24fps for choppy electrical feel
      if (timestamp - lastDraw < 40) return;
      lastDraw = timestamp;

      if (!ctaRef.current) return;

      const ctaRect = ctaRef.current.getBoundingClientRect();
      const hub = document.querySelector('[data-reel-hub]');
      if (!hub) return;

      const hubRect = hub.getBoundingClientRect();
      let startX: number;
      let startY: number;

      // Determine layout based on horizontal positioning
      // If the Reel (hub) is to the right of the CTA button (Desktop)
      if (hubRect.left > ctaRect.right - 40) {
        startX = ctaRect.right; // Right center
        startY = ctaRect.top + ctaRect.height / 2;
      } else {
        // If they are stacked vertically (Mobile)
        startX = ctaRect.left + ctaRect.width / 2; // Top center
        startY = ctaRect.top;
      }

      const endX = hubRect.left + hubRect.width / 2;
      const endY = hubRect.top + hubRect.height / 2;

      const dx = endX - startX;
      const dy = endY - startY;

      const generateMainPathAndSparks = (segments: number, spreadMultiplier: number) => {
        let path = `M ${startX},${startY} `;
        let currentX = startX;
        let currentY = startY;
        const sparks: { cx: number, cy: number, r: number, opacity: number }[] = [];

        for (let i = 1; i <= segments; i++) {
          const t = i / segments;

          const tx = startX + dx * t;
          const ty = startY + dy * t;

          const spread = Math.sin(t * Math.PI) * spreadMultiplier;
          const offsetX = (Math.random() - 0.5) * spread;
          const offsetY = (Math.random() - 0.5) * spread;

          currentX = tx + offsetX;
          currentY = ty + offsetY;

          path += `L ${currentX},${currentY} `;

          // Generate 1-3 tiny sparks around this segment node
          const numSparks = Math.floor(Math.random() * 3) + 1;
          for (let j = 0; j < numSparks; j++) {
            sparks.push({
              cx: currentX + (Math.random() - 0.5) * 25, // Hug the beam tightly
              cy: currentY + (Math.random() - 0.5) * 25,
              r: Math.random() * 1.5 + 0.5, // Tiny radius: 0.5px to 2px
              opacity: Math.random() * 0.8 + 0.2
            });
          }
        }

        path += `L ${endX},${endY}`;
        return { path, sparks };
      };

      const { path: mainPath, sparks } = generateMainPathAndSparks(16, 40);

      setLightningPaths({
        main: mainPath,
        sparks,
        startX,
        startY,
        endX,
        endY
      });
    };

    animationFrameId = requestAnimationFrame(drawLightning);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [isTransitioning]);

  /* ==========================================
     AUDIO EFFECT (ELECTRIC BEAM)
     ========================================== */
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);

  useEffect(() => {
    if (isTransitioning) {
      try {
        // Respect the global "Enter Silently" mute state
        if (getMasterVolume() === 0) return;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;

        const masterGain = ctx.createGain();
        masterGain.gain.value = 0; // Start at 0 for fade in
        masterGain.connect(ctx.destination);
        gainNodeRef.current = masterGain;

        // 120Hz AC mains hum (First harmonic, much more audible on laptop speakers than 60Hz)
        const hum1 = ctx.createOscillator();
        hum1.type = 'sawtooth';
        hum1.frequency.value = 120;
        
        // Slightly detuned hum to create a "throbbing" electric phase effect
        const hum2 = ctx.createOscillator();
        hum2.type = 'sawtooth';
        hum2.frequency.value = 121;
        
        // Lowpass filter: High enough to hear the "buzz" texture, low enough to not be harsh
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900; 

        hum1.connect(filter);
        hum2.connect(filter);
        filter.connect(masterGain);

        hum1.start();
        hum2.start();

        // Fade in gradually over 1.2 seconds so it swells up like a machine powering on
        // rather than hitting the user suddenly
        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.2);

      } catch (e) {
        console.warn("Web Audio API not supported", e);
      }
    } else {
      // Fade out and close
      if (audioCtxRef.current && gainNodeRef.current) {
        const ctx = audioCtxRef.current;
        const gain = gainNodeRef.current;
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        setTimeout(() => {
          if (ctx.state !== 'closed') ctx.close();
          audioCtxRef.current = null;
        }, 300);
      }
    }

    return () => {
      // Cleanup on unmount
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, [isTransitioning]);

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
    <section 
      ref={containerRef} 
      className={styles.hero} 
      id="hero" 
      data-nav-section="hero"
    >
      {/* ========================================
          ATMOSPHERE SYSTEM — The Projection Environment
          ======================================== */}
      <div className={`${styles.heroBg} ${isTransitioning ? styles.heroBgBlue : ''}`}>
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
            <div className={`${styles.projectionBeam} ${transitionState === 'accel1' ? styles.lightSurge : ''}`}>
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
      <div className={`${styles.heroInner} ${transitionState === 'accel3' ? styles.heroShake : ''} ${transitionState === 'flash' || transitionState === 'intro' ? styles.hidden : ''}`}>
        
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
            ref={ctaRef}
            href="#about" 
            className={`${styles.heroCta} ${isTransitioning ? styles.heroCtaActive : ''}`}
            onClick={(e) => {
              e.preventDefault();
              if (onExploreClick && !isTransitioning) onExploreClick();
            }}
            whileHover={!isTransitioning ? { 
              boxShadow: "0 0 32px rgba(255, 200, 100, 0.15), inset 0 1px 0 rgba(255, 240, 200, 0.15)",
              borderColor: "rgba(255, 210, 140, 0.3)",
              backgroundColor: "rgba(255, 255, 255, 0.04)"
            } : undefined}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            style={{ pointerEvents: isTransitioning ? 'none' : 'auto' }}
          >
            {isTransitioning ? (
              <div className={styles.loadingDots}>
                <span>.</span><span>.</span><span>.</span>
              </div>
            ) : (
              <>
                <svg 
                  className={styles.ctaIcon}
                  viewBox="0 0 24 24" 
                  fill="currentColor"
                  aria-hidden="true"
                >
                  <polygon points="8,5 19,12 8,19" />
                </svg>
                Explore
              </>
            )}
          </motion.a>
        </motion.div>

        {/* --- Right: Film Reel --- */}
        <motion.div 
          className={styles.heroReelSide}
          style={{ y: reelY }}
        >
          {/* The Actual Reel Component */}
          <FilmReel transitionState={transitionState} />
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

      {/* Electricity Arc Overlay */}
      <div className={`${styles.lightningOverlay} ${lightningPaths ? styles.active : ''}`}>
        {lightningPaths && (
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="electricityGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur1" />
                <feGaussianBlur stdDeviation="15" result="blur2" />
                <feGaussianBlur stdDeviation="30" result="blur3" />
                <feMerge>
                  <feMergeNode in="blur3" />
                  <feMergeNode in="blur2" />
                  <feMergeNode in="blur1" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            
            {/* Main Arc */}
            <path className={styles.lightningGlow} d={lightningPaths.main} />
            <path className={styles.lightningCoreSecondary} d={lightningPaths.main} />
            <path className={styles.lightningCore} d={lightningPaths.main} />
            
            {/* Microscopic sparks hugging the beam */}
            {lightningPaths.sparks.map((spark, i) => (
              <circle key={i} cx={spark.cx} cy={spark.cy} r={spark.r} fill="#ffffff" opacity={spark.opacity} filter="url(#electricityGlow)" />
            ))}
          </svg>
        )}
      </div>
    </section>
  );
}
