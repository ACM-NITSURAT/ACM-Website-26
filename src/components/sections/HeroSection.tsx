'use client';

import React, { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useAnimationFrame, useMotionValue } from 'framer-motion';
import styles from './HeroSection.module.css';
import FilmReel from './FilmReel';
import { getMasterVolume } from '../loading/ProjectorAudio';

/* ============================================================
   HeroSection — "Build The Next Frame"
   
   Reimagined: Typography-dominant, ACM identity first,
   cinematic DNA preserved through reduced atmosphere.
   
   Layout: CSS Grid (2-column)
     Left (1fr): Scene indicator → Headline → Subtext → CTA
     Right (380px): Film reel (350px) secondary focal point
     Bottom: Legend bar with chapter facts
   
   Atmosphere: Reduced ~70%
     Beam core + near haze + film grain + vignette
     Single slow sinusoidal breathing (~8s cycle)
   
   ACM Evidence: Blueprint-style annotations
     DOTSLASH '25, 200+ MEMBERS, AI/WEB/CP/DESIGN, etc.
   ============================================================ */

import { TransitionState } from '@/app/page';

export interface HeroSectionProps {
  onExploreClick?: () => void;
  isTransitioning?: boolean;
  transitionState?: TransitionState;
}

const DUST_MOTE_COUNT = 14;

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

      // Throttle to ~24fps for choppy electrical feel
      if (timestamp - lastDraw < 40) return;
      lastDraw = timestamp;

      if (!ctaRef.current || !containerRef.current) return;

      const ctaRect = ctaRef.current.getBoundingClientRect();
      const containerRect = containerRef.current.getBoundingClientRect();
      const hub = document.querySelector('[data-reel-hub]');
      if (!hub) return;

      const hubRect = hub.getBoundingClientRect();
      let startX: number;
      let startY: number;

      // Determine layout based on horizontal positioning
      if (hubRect.left > ctaRect.right - 40) {
        // Desktop: reel is to the right of CTA
        startX = ctaRect.right - containerRect.left;
        startY = ctaRect.top + ctaRect.height / 2 - containerRect.top;
      } else {
        // Mobile: stacked vertically
        startX = ctaRect.left + ctaRect.width / 2 - containerRect.left;
        startY = ctaRect.top - containerRect.top;
      }

      const endX = hubRect.left + hubRect.width / 2 - containerRect.left;
      const endY = hubRect.top + hubRect.height / 2 - containerRect.top;

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

          const numSparks = Math.floor(Math.random() * 3) + 1;
          for (let j = 0; j < numSparks; j++) {
            sparks.push({
              cx: currentX + (Math.random() - 0.5) * 25,
              cy: currentY + (Math.random() - 0.5) * 25,
              r: Math.random() * 1.5 + 0.5,
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
        if (getMasterVolume() === 0) return;

        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        let ctx = audioCtxRef.current;
        if (!ctx || ctx.state === 'closed') {
          ctx = new AudioContextClass();
          audioCtxRef.current = ctx;
        }

        if (ctx.state === 'suspended') {
          const resumeAudio = () => {
            if (ctx && ctx.state === 'suspended') {
              ctx.resume();
            }
            window.removeEventListener('click', resumeAudio);
            window.removeEventListener('touchstart', resumeAudio);
          };
          window.addEventListener('click', resumeAudio);
          window.addEventListener('touchstart', resumeAudio);
        }

        if (gainNodeRef.current) {
          gainNodeRef.current.disconnect();
        }

        const masterGain = ctx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(ctx.destination);
        gainNodeRef.current = masterGain;

        // 120Hz AC mains hum
        const hum1 = ctx.createOscillator();
        hum1.type = 'sawtooth';
        hum1.frequency.value = 120;

        // Slightly detuned for throbbing phase effect
        const hum2 = ctx.createOscillator();
        hum2.type = 'sawtooth';
        hum2.frequency.value = 121;

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 900;

        hum1.connect(filter);
        hum2.connect(filter);
        filter.connect(masterGain);

        hum1.start();
        hum2.start();

        masterGain.gain.setValueAtTime(0, ctx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 1.2);

      } catch (e) {
        console.warn("Web Audio API not supported", e);
      }
    } else {
      if (audioCtxRef.current && gainNodeRef.current) {
        const ctx = audioCtxRef.current;
        const gain = gainNodeRef.current;

        gain.gain.cancelScheduledValues(ctx.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

        setTimeout(() => {
          gain.disconnect();
          gainNodeRef.current = null;
        }, 350);
      }
    }
  }, [isTransitioning]);

  // Unmount cleanup for AudioContext
  useEffect(() => {
    return () => {
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        audioCtxRef.current.close();
        audioCtxRef.current = null;
      }
    };
  }, []);

  // Scene establishment timer
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
  const scrollIndicatorOpacity = useTransform(scrollYProgress, [0, 0.08], [1, 0]);

  /* ==========================================
     SCROLL-DRIVEN VISUAL EVOLUTION
     
     The projector progressively reveals atmosphere
     and information as the user scrolls.
     
     0%:   Clean, dark — minimal grid
     15%:  Grid lines begin appearing
     30%:  Atmosphere warms — projector fully engaged
     50%:  Scan line sweeps through
     70%:  Everything gracefully fades with content
     ========================================== */
  // Grid lines progressively reveal
  const gridRevealOpacity = useTransform(scrollYProgress, [0, 0.15, 0.35, 0.7], [0, 0.4, 0.6, 0]);
  // Atmosphere warms — color temperature shift
  const atmosphereWarmth = useTransform(scrollYProgress, [0, 0.2, 0.5, 0.75], [0, 0.04, 0.08, 0]);
  // Scan line vertical sweep position
  const scanLineY = useTransform(scrollYProgress, [0.1, 0.55], ['0%', '100%']);
  const scanLineOpacity = useTransform(scrollYProgress, [0.1, 0.15, 0.5, 0.55], [0, 0.6, 0.6, 0]);
  // Beam core intensifies with scroll
  const beamIntensity = useTransform(scrollYProgress, [0, 0.25, 0.5, 0.75], [1, 1.3, 1.5, 0.8]);

  /* ==========================================
     PROJECTION BREATHING — Simplified
     
     Single slow sinusoidal pulse (~8s cycle).
     Creates the feeling of a living projection
     without the GPU cost of multi-frequency oscillation.
     ========================================== */
  const time = useMotionValue(0);

  const breathOpacity = useTransform(time, t => {
    return 0.85 + Math.sin(t / 4000) * 0.15;
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
          BACKGROUND — Scroll-driven visual evolution
          ======================================== */}
      <div className={`${styles.heroBg} ${isTransitioning ? styles.heroBgBlue : ''}`}>
        {/* Alive, filled technical video background */}
        <div className={styles.heroVideoWrapper} aria-hidden="true">
          <video
            key="/hero-bg4.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className={styles.heroVideo}
          >
            <source src="/hero-bg4.webm" type="video/webm" />
            <source src="/hero-bg4.mp4" type="video/mp4" />
          </video>
        </div>

        <div className={styles.heroFilmGrain} aria-hidden="true" />
        <div className={styles.heroVignette} aria-hidden="true" />

        {/* Scroll-revealed grid lines — progressive structure */}
        <motion.div
          className={styles.scrollGrid}
          style={{ opacity: gridRevealOpacity }}
          aria-hidden="true"
        />

        {/* Beam core — intensifies with scroll */}
        <motion.div
          className={`${styles.heroAtmosphere} ${sceneEstablished ? styles.sceneEstablished : ''}`}
          style={{ opacity: breathOpacity, scale: beamIntensity }}
          aria-hidden="true"
        >
          <div className={`${styles.beamCore} ${transitionState === 'accel1' ? styles.lightSurge : ''}`} />
        </motion.div>

        {/* Atmosphere warmth — scroll-driven color temperature shift */}
        <motion.div
          className={styles.atmosphereWarmth}
          style={{ opacity: atmosphereWarmth }}
          aria-hidden="true"
        />

        {/* Scan line — cinematic horizontal sweep */}
        <motion.div
          className={styles.scanLine}
          style={{ top: scanLineY, opacity: scanLineOpacity }}
          aria-hidden="true"
        />

        {/* Near haze — thin foreground atmosphere */}
        <div className={`${styles.nearHaze} ${sceneEstablished ? styles.sceneEstablished : ''}`} />
      </div>

      {/* ========================================
          CSS DUST MOTES — Lightweight replacement
          ======================================== */}
      <div className={styles.dustField} aria-hidden="true">
        {Array.from({ length: DUST_MOTE_COUNT }, (_, i) => (
          <div key={i} className={`${styles.dustMote} ${styles[`dustMote${i + 1}`]}`} />
        ))}
      </div>

      {/* ========================================
          MAIN CONTENT — Strict CSS Grid layout
          ======================================== */}
      <div className={`${styles.heroInner} ${transitionState === 'accel3' ? styles.heroShake : ''} ${transitionState === 'flash' || transitionState === 'intro' ? styles.hidden : ''}`}>

        {/* --- Left Column: Content Block --- */}
        <motion.div
          className={styles.heroContent}
          style={{ opacity: contentOpacity }}
        >
          <div className={styles.sceneIndicator}>
            <span className={styles.sceneDot} />
            <span>SC. 00</span>
            <span className={styles.sceneDash}>—</span>
            <span>ACM NIT SURAT</span>
          </div>

          <h1 className={styles.heroHeadline}>
            <span className={styles.headlineLine}>
              <span className={styles.headlineWord} data-text="SHAPE">SHAPE</span>{' '}
              <span className={styles.headlineWord} data-text="THE">THE</span>
            </span>
            <span className={styles.headlineLine}>
              <span className={styles.headlineWord} data-text="FUTURE">FUTURE</span>{' '}
              <span className={styles.headlineWord} data-text="OF">OF</span>
            </span>
            <span className={`${styles.headlineLine} ${styles.headlineWord} ${styles.headlineAccent}`} data-text="COMPUTING">COMPUTING</span>
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
              boxShadow: "0 0 32px rgba(100, 200, 255, 0.15), inset 0 1px 0 rgba(255, 240, 200, 0.15)",
              borderColor: "rgba(140, 210, 255, 0.3)",
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

        {/* --- Right Column: Film Reel --- */}
        <motion.div
          className={styles.heroReelSide}
        >
          {/* Deep ambient occlusion to ground the reel against the video background */}
          <div className={styles.reelEnvironmentShadow} aria-hidden="true" />

          <FilmReel transitionState={transitionState} />
        </motion.div>

        {/* --- Technical Readout HUD --- */}
        <motion.div className={styles.heroHud} style={{ opacity: contentOpacity }}>
          <div className={styles.hudBlock}>
            <span className={styles.hudLabel}>DOMAINS</span>
            <div className={styles.hudList}>
              <span>AI</span><span className={styles.hudDot}>·</span>
              <span>WEB</span><span className={styles.hudDot}>·</span>
              <span>CP</span><span className={styles.hudDot}>·</span>
              <span>DESIGN</span>
            </div>
          </div>

          <div className={styles.hudBlock}>
            <span className={styles.hudLabel}>TELEMETRY</span>
            <div className={styles.hudList}>
              <span>200+ MEMBERS</span><span className={styles.hudDot}>·</span>
              <span>12+ EVENTS</span>
            </div>
          </div>

          <div className={styles.hudBlock}>
            <span className={styles.hudLabel}>NEXT EVENT</span>
            <span className={styles.hudValueAccent}>DOTSLASH &apos;25</span>
            <span className={styles.hudValue}>48-HR HACKATHON</span>
          </div>
        </motion.div>

        {/* --- Legend Bar --- */}
        <motion.div className={styles.legendBar} style={{ opacity: contentOpacity }}>
          <div className={styles.legendPin}>
            <span>Est. 2008</span>
            <span className={styles.legendSep}>·</span>
            <span>NIT Surat</span>
          </div>
          <div className={styles.legendPin}>
            <span>Builders</span>
            <span className={styles.legendSep}>·</span>
            <span>Innovators</span>
            <span className={styles.legendSep}>·</span>
            <span>Creators</span>
          </div>
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

      {/* Lightning Arc Overlay */}
      <div className={`${styles.lightningOverlay} ${lightningPaths ? styles.active : ''}`}>
        {lightningPaths && (
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="electricityGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="blur1" />
                <feGaussianBlur stdDeviation="12" result="blur2" />
                <feMerge>
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
              <circle key={i} cx={spark.cx} cy={spark.cy} r={spark.r} fill="#ffffff" opacity={spark.opacity} />
            ))}
          </svg>
        )}
      </div>
    </section>
  );
}
