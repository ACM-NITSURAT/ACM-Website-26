'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import gsap from 'gsap';
import styles from './CinemaLoader.module.css';
import ProjectorLight, { type ProjectorLightRefs } from './ProjectorLight';
import DustParticles, { type DustParticlesHandle } from './DustParticles';
import AcmLogoSvg, { type AcmLogoSvgHandle } from './AcmLogoSvg';
import {
  initAudio,
  resumeAudio,
  setMasterVolume,
  playStartupClunk,
  startProjectorHum,
  startBeamSound,
  startFilmWhir,
  playTechSweep,
  playConstructionTone,
  playLockinResonance,
  playRevealSwell,
  stopProjectorHum,
  stopBeamSound,
  stopFilmWhir,
  disposeAudio,
} from './ProjectorAudio';

/* ============================================================
   CinemaLoader — Master Orchestrator v3
   
   Sequence:
   1. Darkness
   2. Projector body appears, lens glows, startup CLUNK
   3. Light beam fires from projector down to center
   4. Projection surface blooms, dust enters
   5. "acm" drawn in exact logo font
   6. Circle forms around text
   7. Diamond forms around circle
   8. "NIT SURAT" appears
   9. Logo lock-in with brand colors
   10. Cinematic illumination ramp
   11. Website projected into existence
   
   Timeline: ~4.5s (skippable)
   ============================================================ */

interface CinemaLoaderProps {
  children: React.ReactNode;
}

export default function CinemaLoader({ children }: CinemaLoaderProps) {
  const [loaderState, setLoaderState] = useState<'waiting' | 'playing' | 'complete' | 'hidden'>('waiting');
  const [isMuted, setIsMuted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const filmGrainRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const logoContainerRef = useRef<HTMLDivElement>(null);
  const logoSvgRef = useRef<AcmLogoSvgHandle>(null);
  const skipBtnRef = useRef<HTMLButtonElement>(null);
  const muteBtnRef = useRef<HTMLButtonElement>(null);
  const projectorRef = useRef<ProjectorLightRefs>(null);
  const dustRef = useRef<DustParticlesHandle>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const hasSkippedRef = useRef(false);
  const isMutedRef = useRef(false);

  const handleSkip = useCallback(() => {
    if (hasSkippedRef.current) return;
    hasSkippedRef.current = true;

    const tl = timelineRef.current;
    if (!tl) return;

    stopProjectorHum();
    stopBeamSound();
    stopFilmWhir();

    tl.timeScale(3);
    tl.play('illumination');
  }, []);

  const handleMuteToggle = useCallback(() => {
    setIsMuted((prev) => {
      const next = !prev;
      isMutedRef.current = next;
      setMasterVolume(next ? 0 : 1);
      return next;
    });
  }, []);

  const handleEnterWithSound = useCallback(() => {
    setIsMuted(false);
    isMutedRef.current = false;
    initAudio();
    resumeAudio();
    setLoaderState('playing');
  }, []);

  const handleEnterSilently = useCallback(() => {
    setIsMuted(true);
    isMutedRef.current = true;
    initAudio();
    resumeAudio();
    setMasterVolume(0);
    setLoaderState('playing');
  }, []);

  useEffect(() => {
    if (loaderState !== 'playing') return;

    setMasterVolume(isMutedRef.current ? 0 : 1);

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    if (prefersReducedMotion) {
      const overlay = overlayRef.current;
      const logoContainer = logoContainerRef.current;

      if (overlay && logoContainer) {
        gsap.set(logoContainer, { opacity: 1 });
        gsap.set('#logo-diamond', { strokeDashoffset: 0, fillOpacity: 1, stroke: '#4ba5e4' });
        gsap.set('#logo-circle', { strokeDashoffset: 0, stroke: '#ffffff' });
        gsap.set('#logo-acm-text', {
          strokeDashoffset: 0,
          fillOpacity: 1,
          stroke: '#ffffff',
          strokeWidth: 0,
        });
        gsap.set('#logo-nit-surat', {
          opacity: 1,
          fillOpacity: 1,
          strokeDashoffset: 0,
          stroke: 'none',
        });

        setTimeout(() => {
          gsap.to(overlay, {
            opacity: 0,
            duration: 0.5,
            onComplete: () => setLoaderState('hidden'),
          });
        }, 500);
      }
      return;
    }

    // --- Full cinematic animation ---
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({
        onComplete: () => setLoaderState('hidden'),
      });

      timelineRef.current = tl;

      const overlay = overlayRef.current;
      const filmGrain = filmGrainRef.current;
      const vignette = vignetteRef.current;
      const logoContainer = logoContainerRef.current;
      const skipBtn = skipBtnRef.current;
      const muteBtn = muteBtnRef.current;
      const body = projectorRef.current?.body;
      const lens = projectorRef.current?.lens;
      const beam = projectorRef.current?.beam;
      const beamRays = projectorRef.current?.beamRays;
      const ambient = projectorRef.current?.ambient;
      const projection = projectorRef.current?.projection;
      const hotspot = projectorRef.current?.hotspot;
      const dust = dustRef.current;

      if (
        !overlay || !filmGrain || !vignette || !logoContainer ||
        !skipBtn || !muteBtn || !body || !lens || !beam || !beamRays ||
        !ambient || !projection || !hotspot
      ) {
        setLoaderState('hidden');
        return;
      }

      // ==========================================
      // SCENE 1 — Darkness (0.00 - 0.30s)
      // ==========================================
      tl.addLabel('darkness', 0);
      tl.to(filmGrain, { opacity: 0.015, duration: 0.2 }, 0.1);

      // ==========================================
      // SCENE 2 — Projector Powers On (0.30 - 0.80s)
      // ==========================================
      tl.addLabel('projector-on', 0.3);

      // 🔊 Audio: mechanical CLUNK + hum
      tl.call(() => {
        resumeAudio();
        playStartupClunk();
        startProjectorHum();
      }, [], 0.3);

      // Projector body fades in
      tl.to(body, { opacity: 1, duration: 0.15, ease: 'none' }, 0.3);

      // Lens flickers on
      tl.to(lens, { opacity: 0.3, duration: 0.06, ease: 'none' }, 0.32);
      tl.to(lens, { opacity: 0.1, duration: 0.04, ease: 'none' }, 0.38);
      tl.to(lens, { opacity: 0.6, duration: 0.05, ease: 'none' }, 0.42);
      tl.to(lens, { opacity: 0.2, duration: 0.03, ease: 'none' }, 0.47);
      tl.to(lens, { opacity: 1.0, duration: 0.12, ease: 'power1.in' }, 0.50);

      // Vignette
      tl.to(vignette, { opacity: 1, duration: 0.5, ease: 'power1.in' }, 0.4);

      // ==========================================
      // SCENE 3 — Beam Fires (0.60 - 1.00s)
      // Beam extends from projector to center
      // ==========================================
      tl.addLabel('beam-fires', 0.6);

      // 🔊 Audio: beam projection sound starts
      tl.call(() => {
        startBeamSound();
      }, [], 0.6);

      // Beam grows from projector — height increases, width widens
      tl.fromTo(beam, {
        height: 0,
        width: '4px',
        opacity: 0,
      }, {
        height: '55vh',
        width: '40vmin',
        opacity: 1,
        duration: 0.4,
        ease: 'power2.out',
      }, 0.6);

      // Beam rays fade in
      tl.to(beamRays, { opacity: 1, duration: 0.3, ease: 'power1.in' }, 0.7);

      // Ambient wash fades in
      tl.to(ambient, {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: 'power1.in',
      }, 0.65);

      // Show skip & mute buttons
      tl.to([skipBtn, muteBtn], {
        opacity: 1,
        y: 0,
        duration: 0.4,
        ease: 'power2.out',
        stagger: 0.1,
      }, 0.7);

      // ==========================================
      // SCENE 4 — Projection Illuminates (0.90 - 1.30s)
      // ==========================================
      tl.addLabel('illuminate', 0.9);

      // 🔊 Audio: film whir starts
      tl.call(() => {
        startFilmWhir();
      }, [], 0.95);

      // Projection surface flickers then stabilizes
      tl.to(projection, { opacity: 0.1, duration: 0.06, ease: 'none' }, 0.90);
      tl.to(projection, { opacity: 0.03, duration: 0.04, ease: 'none' }, 0.96);
      tl.to(projection, { opacity: 0.25, scale: 0.7, duration: 0.1, ease: 'none' }, 1.00);
      tl.to(projection, {
        opacity: 0.55,
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      }, 1.10);

      // Hotspot
      tl.to(hotspot, { opacity: 0.15, scale: 0.5, duration: 0.1, ease: 'none' }, 0.95);
      tl.to(hotspot, { opacity: 0.05, duration: 0.05, ease: 'none' }, 1.05);
      tl.to(hotspot, {
        opacity: 0.5,
        scale: 0.8,
        duration: 0.3,
        ease: 'power2.out',
      }, 1.10);

      // Film grain increases
      tl.to(filmGrain, { opacity: 0.04, duration: 0.3 }, 1.0);

      // Dust particles
      tl.call(() => {
        dust?.setMaskRadius(Math.min(window.innerWidth, window.innerHeight) * 0.22);
      }, [], 1.0);
      tl.to(`.${styles.dustCanvas}`, {
        opacity: 1,
        duration: 0.4,
        ease: 'power1.in',
      }, 1.0);

      // ==========================================
      // SCENE 5 — "acm" Construction (1.30 - 2.00s)
      // ==========================================
      tl.addLabel('construction', 1.3);

      // 🔊 Audio: construction tone
      tl.call(() => {
        playConstructionTone();
      }, [], 1.35);

      // Logo container fades in
      tl.to(logoContainer, {
        opacity: 1,
        duration: 0.2,
        ease: 'power1.in',
      }, 1.3);

      // "acm" stroke construction
      tl.to('#logo-acm-text', {
        strokeDashoffset: 0,
        duration: 0.55,
        ease: 'power2.inOut',
      }, 1.35);

      // Fill fades in as stroke completes
      tl.to('#logo-acm-text', {
        fillOpacity: 0.85,
        duration: 0.25,
        ease: 'power1.in',
      }, 1.7);

      // Expand dust mask
      tl.call(() => {
        dust?.setMaskRadius(Math.min(window.innerWidth, window.innerHeight) * 0.28);
      }, [], 1.5);

      // ==========================================
      // SCENE 6 — Circle Forms (2.00 - 2.30s)
      // ==========================================
      tl.addLabel('circle', 2.0);

      tl.to('#logo-circle', {
        strokeDashoffset: 0,
        duration: 0.3,
        ease: 'power2.inOut',
      }, 2.0);

      // ==========================================
      // SCENE 7 — Diamond Forms (2.20 - 2.55s)
      // ==========================================
      tl.addLabel('diamond', 2.2);

      tl.to('#logo-diamond', {
        strokeDashoffset: 0,
        duration: 0.35,
        ease: 'power2.inOut',
      }, 2.2);

      // Projection tightens around the assembling logo
      tl.to(projection, { scale: 0.85, duration: 0.4, ease: 'power2.inOut' }, 2.1);
      tl.to(hotspot, { scale: 0.65, duration: 0.4, ease: 'power2.inOut' }, 2.1);

      // ==========================================
      // SCENE 8 — "NIT SURAT" Appears (2.50 - 2.80s)
      // ==========================================
      tl.addLabel('nit-surat', 2.5);

      tl.to('#logo-nit-surat', { opacity: 1, duration: 0.05 }, 2.5);
      tl.to('#logo-nit-surat', {
        strokeDashoffset: 0,
        duration: 0.25,
        ease: 'power2.out',
      }, 2.5);
      tl.to('#logo-nit-surat', {
        fillOpacity: 1,
        duration: 0.2,
        ease: 'power1.in',
      }, 2.65);

      // ==========================================
      // SCENE 9 — Logo Lock-In (2.75 - 3.20s)
      // ==========================================
      tl.addLabel('lockin', 2.75);

      // 🔊 Audio: brand resonance THUD
      tl.call(() => {
        playLockinResonance();
      }, [], 2.8);

      // Diamond fill floods in with blue gradient
      tl.to('#logo-diamond', { fillOpacity: 1, duration: 0.3, ease: 'power1.in' }, 2.8);

      // Shift strokes to final brand colors
      tl.to('#logo-diamond', {
        stroke: '#4ba5e4',
        strokeWidth: 0,
        duration: 0.3,
        ease: 'power1.inOut',
      }, 2.8);
      tl.to('#logo-circle', {
        stroke: '#ffffff',
        duration: 0.25,
        ease: 'power1.inOut',
      }, 2.8);
      tl.to('#logo-acm-text', {
        stroke: '#ffffff',
        strokeWidth: 0,
        fillOpacity: 1,
        duration: 0.25,
        ease: 'power1.inOut',
      }, 2.8);

      // Scale settle — brand moment
      tl.to(logoContainer, { scale: 1.08, duration: 0.15, ease: 'power2.out' }, 3.0);
      tl.to(logoContainer, { scale: 1.0, duration: 0.2, ease: 'power2.inOut' }, 3.15);

      // Glow pulse
      tl.to(hotspot, { opacity: 0.8, duration: 0.15, ease: 'power1.in' }, 3.0);
      tl.to(hotspot, { opacity: 0.5, duration: 0.15, ease: 'power1.out' }, 3.15);

      // ==========================================
      // SCENE 10 — Illumination (3.30 - 3.65s)
      // ==========================================
      tl.addLabel('illumination', 3.3);

      tl.to(projection, {
        opacity: 0.85, scale: 1.2, duration: 0.35, ease: 'power1.in',
      }, 3.3);
      tl.to(hotspot, {
        opacity: 0.9, scale: 1.0, duration: 0.35, ease: 'power1.in',
      }, 3.3);
      tl.to(ambient, {
        opacity: 1, scale: 1.3, duration: 0.35, ease: 'power1.in',
      }, 3.3);

      // Beam brightens
      tl.to(beam, {
        width: '55vmin',
        duration: 0.35,
        ease: 'power1.in',
      }, 3.3);

      tl.to(filmGrain, { opacity: 0.06, duration: 0.25 }, 3.3);

      // Dust burst
      tl.call(() => {
        dust?.setMaskRadius(Math.min(window.innerWidth, window.innerHeight) * 0.45);
        dust?.burst();
      }, [], 3.4);

      // ==========================================
      // SCENE 11 — Projected Into Existence (3.65 - 4.50s)
      // ==========================================
      tl.addLabel('reveal', 3.65);

      // 🔊 Audio: reveal swell + stop continuous sounds
      tl.call(() => {
        stopProjectorHum();
        stopBeamSound();
        stopFilmWhir();
        playRevealSwell();
      }, [], 3.65);

      // Logo recedes upward
      tl.to(logoContainer, {
        scale: 0.5, opacity: 0, y: -40,
        duration: 0.25, ease: 'power2.in',
      }, 3.65);

      // Buttons fade
      tl.to([skipBtn, muteBtn], {
        opacity: 0, y: 8,
        duration: 0.2, ease: 'power2.in',
      }, 3.65);

      // Beam collapses back up
      tl.to(beam, {
        height: 0, opacity: 0,
        duration: 0.4, ease: 'power2.in',
      }, 3.7);

      // Projector body fades
      tl.to(body, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 3.75);

      // Overlay circle-wipes away
      tl.fromTo(overlay, {
        clipPath: 'circle(150% at 50% 50%)',
      }, {
        clipPath: 'circle(0% at 50% 50%)',
        duration: 0.75,
        ease: 'power3.inOut',
      }, 3.75);

      // Fade out projector elements
      tl.to([ambient, projection, hotspot], {
        opacity: 0, duration: 0.35, ease: 'power1.out',
      }, 3.8);
      tl.to(vignette, { opacity: 0, duration: 0.35, ease: 'power1.out' }, 3.8);
      tl.to(filmGrain, { opacity: 0, duration: 0.25 }, 3.8);

      // Dust fades
      tl.call(() => { dust?.fadeOut(); }, [], 3.75);
      tl.to(`.${styles.dustCanvas}`, { opacity: 0, duration: 0.35 }, 3.8);

      // Complete
      tl.call(() => { setLoaderState('complete'); }, [], 4.5);
    });

    // Skip handlers
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        handleSkip();
      }
    };

    const skipTimer = setTimeout(() => {
      document.addEventListener('keydown', handleKeyDown);
    }, 800);

    return () => {
      clearTimeout(skipTimer);
      document.removeEventListener('keydown', handleKeyDown);
      disposeAudio();
      ctx.revert();
      timelineRef.current = null;
    };
  }, [handleSkip, loaderState]);

  if (loaderState === 'hidden') {
    return <>{children}</>;
  }

  return (
    <>
      <div className={styles.contentWrapper}>{children}</div>

      <div
        ref={overlayRef}
        className={`${styles.loaderOverlay} ${
          loaderState === 'complete' ? styles.complete : ''
        }`}
      >
        {/* Start Experience Overlay */}
        <div className={`${styles.startOverlay} ${loaderState !== 'waiting' ? styles.hidden : ''}`}>
          <div className={styles.startTitle}>ACM NIT SURAT</div>
          <div className={styles.startOptions}>
            <button className={`${styles.startBtn} ${styles.primary}`} onClick={handleEnterWithSound}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              </svg>
              Enter With Sound
            </button>
            <button className={styles.startBtn} onClick={handleEnterSilently}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
              Enter Silently
            </button>
          </div>
        </div>



        <div ref={filmGrainRef} className={styles.filmGrain} />
        <div ref={vignetteRef} className={styles.vignette} />
        <ProjectorLight ref={projectorRef} />
        <DustParticles ref={dustRef} />

        <div ref={logoContainerRef} className={styles.logoContainer}>
          <AcmLogoSvg ref={logoSvgRef} className={styles.logoSvg} />
        </div>

        <button
          ref={skipBtnRef}
          className={styles.skipButton}
          onClick={handleSkip}
          aria-label="Skip loading animation"
          type="button"
        >
          <svg
            className={styles.skipIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polygon points="5,4 15,12 5,20" fill="currentColor" />
            <line x1="19" y1="5" x2="19" y2="19" />
          </svg>
          Skip
        </button>

        <button
          ref={muteBtnRef}
          className={styles.muteButton}
          onClick={handleMuteToggle}
          aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
          type="button"
        >
          {isMuted ? (
            <svg className={styles.muteIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
              <line x1="23" y1="9" x2="17" y2="15" />
              <line x1="17" y1="9" x2="23" y2="15" />
            </svg>
          ) : (
            <svg className={styles.muteIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
