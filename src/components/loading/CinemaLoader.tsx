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
  playPrecisionClick,
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
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const filmGrainRef = useRef<HTMLDivElement>(null);
  const vignetteRef = useRef<HTMLDivElement>(null);
  const logoContainerRef = useRef<HTMLDivElement>(null);
  const logoSvgRef = useRef<AcmLogoSvgHandle>(null);
  const skipBtnRef = useRef<HTMLButtonElement>(null);
  const muteBtnRef = useRef<HTMLButtonElement>(null);
  const loadingBarRef = useRef<HTMLDivElement>(null);
  const curtainTopRef = useRef<HTMLDivElement>(null);
  const curtainBottomRef = useRef<HTMLDivElement>(null);
  const projectorRef = useRef<ProjectorLightRefs>(null);
  const dustRef = useRef<DustParticlesHandle>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const hasSkippedRef = useRef(false);
  const isMutedRef = useRef(false);

  const [assetsProgress, setAssetsProgress] = useState(0);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const [isWaitingForAssets, setIsWaitingForAssets] = useState(false);
  const assetsLoadedRef = useRef(false);

  // Check sessionStorage after hydration to prevent hydration mismatch
  useEffect(() => {
    const shouldSkip = sessionStorage.getItem('cinema-loaded') === '1';
    if (shouldSkip) {
      setLoaderState('hidden');
      
      // Restore audio preference
      const isMuted = sessionStorage.getItem('cinema-audio-muted') === 'true';
      if (isMuted) {
        setMasterVolume(0);
      } else {
        setMasterVolume(1);
      }
      
      window.dispatchEvent(new CustomEvent('cinema-loader-complete'));
    }
  }, []);

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
      sessionStorage.setItem('cinema-audio-muted', next ? 'true' : 'false');
      return next;
    });
  }, []);

  const handleEnterWithSound = useCallback(() => {
    setIsMuted(false);
    isMutedRef.current = false;
    sessionStorage.setItem('cinema-audio-muted', 'false');
    initAudio();
    resumeAudio();
    setLoaderState('playing');
  }, []);

  const handleEnterSilently = useCallback(() => {
    setIsMuted(true);
    isMutedRef.current = true;
    sessionStorage.setItem('cinema-audio-muted', 'true');
    initAudio();
    resumeAudio();
    setMasterVolume(0);
    setLoaderState('playing');
  }, []);

  useEffect(() => {
    if (loaderState !== 'playing') return;

    // List of heavy assets to preload
    const assetsToLoad = [
      '/film-grain-35mm.avif',
      '/dotslash/videoplayback.webm',
      '/webp/DSC_1274.webp',
      '/webp/DSC_2075.webp',
      '/webp/DSC_2136.webp',
      '/dotslash/DSC_2163 (1).webp',
      '/webp/DSC_6725.webp',
    ];

    let loadedCount = 0;
    let hasFinished = false;

    const complete = () => {
      if (hasFinished) return;
      hasFinished = true;
      setAssetsProgress(100);
      setAssetsLoaded(true);
      assetsLoadedRef.current = true;
    };

    const increment = () => {
      if (hasFinished) return;
      loadedCount++;
      setAssetsProgress(Math.min(99, Math.floor((loadedCount / assetsToLoad.length) * 100)));
      if (loadedCount >= assetsToLoad.length) {
        complete();
      }
    };

    assetsToLoad.forEach(src => {
      if (src.endsWith('.webm')) {
        const req = new XMLHttpRequest();
        req.open('GET', src, true);
        req.responseType = 'blob';
        req.onload = increment;
        req.onerror = increment;
        req.send();
      } else {
        const img = new Image();
        img.onload = increment;
        img.onerror = increment;
        img.src = src;
      }
    });

    // Fallback: forcefully complete after 3.5 seconds so user doesn't get stuck
    const fallback = setTimeout(complete, 3500);

    return () => clearTimeout(fallback);
  }, [loaderState]);

  useEffect(() => {
    if (assetsLoaded && isWaitingForAssets && timelineRef.current) {
      setIsWaitingForAssets(false);
      // Give it a tiny delay so the user sees "100%"
      setTimeout(() => {
        if (timelineRef.current) timelineRef.current.play();
      }, 200);
    }
  }, [assetsLoaded, isWaitingForAssets]);

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
      const contentWrapper = contentWrapperRef.current;
      const filmGrain = filmGrainRef.current;
      const vignette = vignetteRef.current;
      const logoContainer = logoContainerRef.current;
      const skipBtn = skipBtnRef.current;
      const muteBtn = muteBtnRef.current;
      const loadingBar = loadingBarRef.current;
      const body = projectorRef.current?.body;
      const lens = projectorRef.current?.lens;
      const beam = projectorRef.current?.beam;
      const beamRays = projectorRef.current?.beamRays;
      const ambient = projectorRef.current?.ambient;
      const projection = projectorRef.current?.projection;
      const hotspot = projectorRef.current?.hotspot;
      const dust = dustRef.current;

      if (
        !overlay || !contentWrapper || !filmGrain || !vignette || !logoContainer ||
        !skipBtn || !muteBtn || !body || !lens || !beam || !beamRays ||
        !ambient || !projection || !hotspot
      ) {
        setLoaderState('hidden');
        return;
      }

      // Pre-set the hero section to be pushed back and blurred
      gsap.set(contentWrapper, { scale: 0.9, filter: 'blur(15px)' });

      // ==========================================
      // SCENE 1 — Darkness (0.00 - 0.30s)
      // Gate cross-dissolves into darkness
      // ==========================================
      tl.addLabel('darkness', 0);
      tl.to(filmGrain, { opacity: 0.015, duration: 0.2 }, 0.1);

      // ==========================================
      // SCENE 2 — Projector Powers On (0.30 - 0.65s)
      // Motor engages, lamp ignites
      // ==========================================
      tl.addLabel('projector-on', 0.3);

      // 🔊 Audio: relay click → mechanical CLUNK + hum
      tl.call(() => {
        resumeAudio();
        playStartupClunk();
        startProjectorHum();
      }, [], 0.3);

      // Projector body fades in
      tl.to(body, { opacity: 1, duration: 0.15, ease: 'none' }, 0.3);

      // Startup motor tremor — felt not seen
      tl.to(body, { y: -1, duration: 0.03, ease: 'none' }, 0.32);
      tl.to(body, { y: 1, duration: 0.03, ease: 'none' }, 0.35);
      tl.to(body, { y: -0.5, duration: 0.03, ease: 'none' }, 0.38);
      tl.to(body, { y: 0, duration: 0.05, ease: 'power1.out' }, 0.41);

      // Lens flickers on — finding steady state
      tl.to(lens, { opacity: 0.3, duration: 0.06, ease: 'none' }, 0.32);
      tl.to(lens, { opacity: 0.1, duration: 0.04, ease: 'none' }, 0.38);
      tl.to(lens, { opacity: 0.6, duration: 0.05, ease: 'none' }, 0.42);
      tl.to(lens, { opacity: 0.2, duration: 0.03, ease: 'none' }, 0.47);
      tl.to(lens, { opacity: 1.0, duration: 0.12, ease: 'power1.in' }, 0.50);

      // Vignette
      tl.to(vignette, { opacity: 1, duration: 0.5, ease: 'power1.in' }, 0.4);

      // ==========================================
      // SCENE 3 — Beam Fires (0.60 - 1.05s)
      // Light extends from projector to center
      // ==========================================
      tl.addLabel('beam-fires', 0.6);

      // 🔊 Audio: beam projection sound + atmospheric swell
      tl.call(() => {
        startBeamSound();
      }, [], 0.6);

      // Beam grows from projector
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

      // Beam instability — lamp warming up (felt not seen)
      tl.to(beam, { width: '38vmin', duration: 0.1, ease: 'sine.inOut' }, 1.0);
      tl.to(beam, { width: '41vmin', duration: 0.12, ease: 'sine.inOut' }, 1.1);
      tl.to(beam, { width: '40vmin', duration: 0.15, ease: 'power1.out' }, 1.22);

      // ==========================================
      // SCENE 4 — Projection Illuminates (1.05 - 1.45s)
      // Surface flickers, dust enters, beam settles
      // ==========================================
      tl.addLabel('illuminate', 1.05);

      // 🔊 Audio: film whir starts
      tl.call(() => {
        startFilmWhir();
      }, [], 1.05);

      // Projection surface flickers then stabilizes
      tl.to(projection, { opacity: 0.1, duration: 0.06, ease: 'none' }, 1.05);
      tl.to(projection, { opacity: 0.03, duration: 0.04, ease: 'none' }, 1.11);
      tl.to(projection, { opacity: 0.25, scale: 0.7, duration: 0.1, ease: 'none' }, 1.15);
      tl.to(projection, {
        opacity: 0.55,
        scale: 1,
        duration: 0.3,
        ease: 'power2.out',
      }, 1.25);

      // Hotspot
      tl.to(hotspot, { opacity: 0.15, scale: 0.5, duration: 0.1, ease: 'none' }, 1.10);
      tl.to(hotspot, { opacity: 0.05, duration: 0.05, ease: 'none' }, 1.20);
      tl.to(hotspot, {
        opacity: 0.5,
        scale: 0.8,
        duration: 0.3,
        ease: 'power2.out',
      }, 1.25);

      // Film grain increases
      tl.to(filmGrain, { opacity: 0.04, duration: 0.3 }, 1.15);

      // Dust particles
      tl.call(() => {
        dust?.setMaskRadius(Math.min(window.innerWidth, window.innerHeight) * 0.22);
      }, [], 1.15);
      tl.to(`.${styles.dustCanvas}`, {
        opacity: 1,
        duration: 0.4,
        ease: 'power1.in',
      }, 1.15);

      // Subtle brightness fluctuation — bulb finding steady state
      tl.to(projection, { opacity: 0.50, duration: 0.15, ease: 'sine.inOut' }, 1.40);
      tl.to(projection, { opacity: 0.55, duration: 0.1, ease: 'sine.inOut' }, 1.55);

      // ==========================================
      // SCENE 5 — "acm" Construction (1.50 - 2.30s)
      // Deliberate, precise stroke construction
      // ==========================================
      tl.addLabel('construction', 1.50);

      // 🔊 Audio: precision click + construction pad
      tl.call(() => {
        playPrecisionClick();
        playConstructionTone();
      }, [], 1.50);

      // Logo container fades in
      tl.to(logoContainer, {
        opacity: 1,
        duration: 0.2,
        ease: 'power1.in',
      }, 1.50);

      // "acm" stroke construction — deliberate and precise
      tl.to('#logo-acm-text', {
        strokeDashoffset: 0,
        duration: 0.65,
        ease: 'power2.inOut',
      }, 1.55);

      // Fill blooms in as stroke completes
      tl.to('#logo-acm-text', {
        fillOpacity: 0.85,
        duration: 0.25,
        ease: 'power1.in',
      }, 2.05);

      // Expand dust mask
      tl.call(() => {
        dust?.setMaskRadius(Math.min(window.innerWidth, window.innerHeight) * 0.28);
      }, [], 1.75);

      // ==========================================
      // 2.30 - 2.45: Absorb moment
      // Audience sees completed "acm", anticipation builds
      // ==========================================

      // ==========================================
      // SCENE 6 — Circle Forms (2.45 - 2.75s)
      // ==========================================
      tl.addLabel('circle', 2.45);

      // 🔊 Audio: precision click
      tl.call(() => {
        playPrecisionClick();
      }, [], 2.45);

      tl.to('#logo-circle', {
        strokeDashoffset: 0,
        duration: 0.3,
        ease: 'power2.inOut',
      }, 2.45);

      // ==========================================
      // SCENE 7 — Diamond Forms (2.65 - 3.00s)
      // ==========================================
      tl.addLabel('diamond', 2.65);

      // 🔊 Audio: precision click
      tl.call(() => {
        playPrecisionClick();
      }, [], 2.65);

      tl.to('#logo-diamond', {
        strokeDashoffset: 0,
        duration: 0.35,
        ease: 'power2.inOut',
      }, 2.65);

      // Projection tightens around the assembling logo
      tl.to(projection, { scale: 0.85, duration: 0.4, ease: 'power2.inOut' }, 2.55);
      tl.to(hotspot, { scale: 0.65, duration: 0.4, ease: 'power2.inOut' }, 2.55);

      // ==========================================
      // SCENE 8 — "NIT SURAT" Appears (2.90 - 3.15s)
      // ==========================================
      tl.addLabel('nit-surat', 2.90);

      tl.to('#logo-nit-surat', { opacity: 1, duration: 0.05 }, 2.90);
      tl.to('#logo-nit-surat', {
        strokeDashoffset: 0,
        duration: 0.25,
        ease: 'power2.out',
      }, 2.90);
      tl.to('#logo-nit-surat', {
        fillOpacity: 1,
        duration: 0.2,
        ease: 'power1.in',
      }, 3.05);

      // ==========================================
      // FILM-FRAME JITTER (3.12 - 3.18s)
      // Projector finds perfect focus — <100ms
      // ==========================================
      tl.to(logoContainer, { y: -1.5, duration: 0.03, ease: 'none' }, 3.12);
      tl.to(logoContainer, { y: 0, duration: 0.04, ease: 'power2.out' }, 3.15);

      // ==========================================
      // SCENE 9 — Logo Lock-In ★ HERO MOMENT ★ (3.18 - 3.65s)
      // The emotional peak of the entire sequence
      // ==========================================
      tl.addLabel('lockin', 3.18);

      // 🔊 Audio: brand resonance THUD (extended ring + cinematic breath)
      tl.call(() => {
        playLockinResonance();
      }, [], 3.20);

      // Diamond fill floods in with blue gradient
      tl.to('#logo-diamond', { fillOpacity: 1, duration: 0.3, ease: 'power1.in' }, 3.20);

      // Shift strokes to final brand colors
      tl.to('#logo-diamond', {
        stroke: '#4ba5e4',
        strokeWidth: 0,
        duration: 0.3,
        ease: 'power1.inOut',
      }, 3.20);
      tl.to('#logo-circle', {
        stroke: '#ffffff',
        duration: 0.25,
        ease: 'power1.inOut',
      }, 3.20);
      tl.to('#logo-acm-text', {
        stroke: '#ffffff',
        strokeWidth: 0,
        fillOpacity: 1,
        duration: 0.25,
        ease: 'power1.inOut',
      }, 3.20);

      // Luminance pulse — synchronized with thud
      tl.to(hotspot, { opacity: 0.9, duration: 0.08, ease: 'power1.in' }, 3.20);
      tl.to(hotspot, { opacity: 0.5, duration: 0.2, ease: 'power1.out' }, 3.28);
      tl.to(projection, { opacity: 0.7, duration: 0.08, ease: 'power1.in' }, 3.20);
      tl.to(projection, { opacity: 0.55, duration: 0.2, ease: 'power1.out' }, 3.28);

      // Triple settle — "click into place"
      tl.to(logoContainer, { scale: 1.06, duration: 0.1, ease: 'power2.out' }, 3.35);
      tl.to(logoContainer, { scale: 0.98, duration: 0.08, ease: 'power2.inOut' }, 3.45);
      tl.to(logoContainer, { scale: 1.0, duration: 0.12, ease: 'power2.out' }, 3.53);

      // ==========================================
      // SCENE 10 — Illumination (3.70 - 4.00s)
      // ==========================================
      tl.addLabel('illumination', 3.70);

      tl.to(projection, {
        opacity: 0.85, scale: 1.2, duration: 0.3, ease: 'power1.in',
      }, 3.70);
      tl.to(hotspot, {
        opacity: 0.9, scale: 1.0, duration: 0.3, ease: 'power1.in',
      }, 3.70);
      tl.to(ambient, {
        opacity: 1, scale: 1.3, duration: 0.3, ease: 'power1.in',
      }, 3.70);

      // Beam brightens
      tl.to(beam, {
        width: '55vmin',
        duration: 0.3,
        ease: 'power1.in',
      }, 3.70);

      tl.to(filmGrain, { opacity: 0.06, duration: 0.2 }, 3.75);

      // Dust burst
      tl.call(() => {
        dust?.setMaskRadius(Math.min(window.innerWidth, window.innerHeight) * 0.45);
        dust?.burst();
      }, [], 3.80);

      // Pause here to wait for actual asset loading
      tl.add(() => {
        if (!assetsLoadedRef.current && !hasSkippedRef.current) {
          setIsWaitingForAssets(true);
          tl.pause();
        }
      }, 3.90);

      // ==========================================
      // SCENE 11 — Projected Into Existence (4.00 - 4.70s)
      // Website revealed inside projection
      // ==========================================
      tl.addLabel('reveal', 4.00);

      // 🔊 Audio: cinematic impact + reveal swell + stop continuous sounds
      tl.call(() => {
        stopProjectorHum();
        stopBeamSound();
        stopFilmWhir();
        playRevealSwell();
      }, [], 4.00);

      // Logo recedes upward
      tl.to(logoContainer, {
        scale: 0.5, opacity: 0, y: -40,
        duration: 0.2, ease: 'power2.in',
      }, 4.00);

      // Buttons and loading bar fade out
      tl.to([skipBtn, muteBtn, loadingBar], {
        opacity: 0, y: 8,
        duration: 0.15, ease: 'power2.in',
      }, 4.00);

      // Beam collapses back up
      tl.to(beam, {
        height: 0, opacity: 0,
        duration: 0.35, ease: 'power2.in',
      }, 4.05);

      // Projector body fades
      tl.to(body, { opacity: 0, duration: 0.25, ease: 'power1.out' }, 4.10);

      // Hero Section Zoom-In / Parallax Push Forward
      tl.to(contentWrapper, {
        scale: 1,
        filter: 'blur(0px)',
        duration: 1.5,
        ease: 'power3.out',
      }, 4.00);

      // Fade out projector elements right before the curtain splits
      tl.to([ambient, projection, hotspot, vignette, filmGrain], {
        opacity: 0, duration: 0.2, ease: 'power1.out',
      }, 4.00);

      // Dust fades
      tl.call(() => { dust?.fadeOut(); }, [], 4.00);
      tl.to(`.${styles.dustCanvas}`, { opacity: 0, duration: 0.2 }, 4.00);

      // The Curtain Drop Reveal (Physical hardware-accelerated divs, zero lag!)
      tl.to(curtainTopRef.current, {
        yPercent: -100,
        duration: 1.2,
        ease: 'power3.inOut',
      }, 4.05);

      tl.to(curtainBottomRef.current, {
        yPercent: 100,
        duration: 1.2,
        ease: 'power3.inOut',
      }, 4.05);

      // Clean up the overlay container after curtains are fully open
      tl.to(overlay, {
        opacity: 0,
        duration: 0.1,
      }, 5.25);

      // Complete — notify navbar to begin assembly
      tl.call(() => {
        setLoaderState('complete');
        sessionStorage.setItem('cinema-loaded', '1');
        window.dispatchEvent(new CustomEvent('cinema-loader-complete'));
      }, [], 4.70);
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
      <div ref={contentWrapperRef} className={styles.contentWrapper}>{children}</div>

      <div
        ref={overlayRef}
        className={`${styles.loaderOverlay} ${loaderState === 'complete' ? styles.complete : ''
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

        {/* Physical curtains for buttery smooth hardware-accelerated reveal */}
        <div ref={curtainTopRef} className={styles.curtainTop} />
        <div ref={curtainBottomRef} className={styles.curtainBottom} />

        <div ref={filmGrainRef} className={styles.filmGrain} />
        <div ref={vignetteRef} className={styles.vignette} />
        <ProjectorLight ref={projectorRef} />
        <DustParticles ref={dustRef} />

        <div ref={logoContainerRef} className={styles.logoContainer}>
          <AcmLogoSvg ref={logoSvgRef} className={styles.logoSvg} />
        </div>

        {/* Cinematic Loading Bar */}
        <div ref={loadingBarRef} className={`${styles.loadingBarContainer} ${loaderState === 'playing' ? styles.visible : ''}`}>
          <div className={styles.loadingBarTrack}>
            <div className={styles.loadingBarFill} style={{ width: `${assetsProgress}%` }} />
          </div>
          <div className={styles.loadingText}>LOADING ASSETS... {assetsProgress}%</div>
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
