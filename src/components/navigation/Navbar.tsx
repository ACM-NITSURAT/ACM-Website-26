'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

/* ============================================================
   NAV SECTIONS — Each section is a "scene" in the production
   ============================================================ */
const NAV_SECTIONS = [
  { label: 'Hero',     scene: 'SC.01', section: 'hero',     href: '/#hero' },
  { label: 'About',    scene: 'SC.02', section: 'about',    href: '/#about' },
  { label: 'Events',   scene: 'SC.03', section: 'events',   href: '/events' },
  { label: 'Projects', scene: 'SC.04', section: 'projects', href: '/projects' },
  { label: 'Team',     scene: 'SC.05', section: 'team',     href: '/team' },
];

/* ============================================================
   TIMECODE — Generate a cinematic timecode from section index
   Each section maps to a "film time". When section changes,
   the timecode scrambles through random digits before settling.
   ============================================================ */
const SECTION_TIMECODES: Record<string, string> = {
  hero:     '00:00:01',
  about:    '00:02:18',
  events:   '00:04:32',
  projects: '00:06:45',
  team:     '00:08:57',
};

/** Linearly interpolate between a and b */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

/* ============================================================
   Navbar — "NOW SHOWING" Cinematic Scene Indicator
   
   Evolved from the original projection-beam navbar.
   
   Split layout:
   LEFT:  ACM brand (always visible, persistent identity)
   RIGHT: NOW SHOWING plate (scene indicator + navigation)
   
   Preserves:
   - Loader integration (cinema-loader-complete)
   - IntersectionObserver section tracking
   - Dual beam architecture (active + hover)
   - Dust particle system
   - Scene number scramble effect
   - Assembly animation sequence
   - Reduced motion respect
   
   Adds:
   - Film timecode counter
   - Projection sweep on section change
   - Hover expansion (max ~450px, horizontal only)
   - Mobile: horizontal scrollable scene strip
   ============================================================ */

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Assembly animation state (preserved from original)
  const [loaderDone, setLoaderDone] = useState(false);
  const [assembled, setAssembled] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [showPlate, setShowPlate] = useState(false);

  // NOW SHOWING state
  const [activeSection, setActiveSection] = useState<string>('hero');
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMobileStripOpen, setIsMobileStripOpen] = useState(false);

  // Section transition animation
  const [sectionTransitionState, setSectionTransitionState] = useState<'visible' | 'exit' | 'enter'>('visible');
  const [displaySection, setDisplaySection] = useState('hero');
  const [isSweeping, setIsSweeping] = useState(false);

  // Beam state (preserved from original)
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [hoverConeStyle, setHoverConeStyle] = useState<React.CSSProperties>({ opacity: 0 });

  // Timecode state
  const [displayTimecode, setDisplayTimecode] = useState('00:00:01');
  const [isTimecodeUpdating, setIsTimecodeUpdating] = useState(false);

  // Scene number scramble (preserved from original)
  const [displaySceneNumber, setDisplaySceneNumber] = useState('SC.01');

  // Refs
  const plateRef = useRef<HTMLDivElement>(null);
  const navItemRefs = useRef<(HTMLElement | null)[]>([]);
  const prevSectionRef = useRef<string>('hero');

  // Global navigation handler for cinematic transitions (preserved)
  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, href: string, section: string) => {
    e.preventDefault();
    
    // If it's a hash link on current page, smooth scroll
    if (href.startsWith('/#')) {
      const targetEl = document.querySelector(`[data-nav-section="${section}"]`);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setIsMobileStripOpen(false);
        setIsExpanded(false);
        return;
      }
    }
    
    // Otherwise dispatch event for page transitions
    window.dispatchEvent(new CustomEvent('nav-route-clicked', { detail: href }));
    setIsMobileStripOpen(false);
    setIsExpanded(false);
  }, []);

  // --- Reduced motion detection (preserved) ---
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // --- Scroll listener with progress interpolation (preserved) ---
  useEffect(() => {
    const heroHeight = typeof window !== 'undefined' ? window.innerHeight * 0.6 : 500;
    const onScroll = () => {
      const y = window.scrollY;
      setIsScrolled(y > 50);
      setScrollProgress(Math.min(1, y / heroHeight));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // --- Scroll-based section detection (replaces IntersectionObserver) ---
  // Picks whichever section's top edge is closest to the viewport top.
  useEffect(() => {
    if (pathname !== '/') return;

    const detectSection = () => {
      const sections = document.querySelectorAll('[data-nav-section]');
      if (sections.length === 0) return;

      let bestSection = 'hero';
      let bestDistance = Infinity;
      const viewportMiddle = window.innerHeight * 0.35; // bias toward upper third

      sections.forEach(el => {
        const rect = el.getBoundingClientRect();
        // Section is "active" if its top is above the viewport middle
        // and it's the closest one to that line
        if (rect.top <= viewportMiddle && rect.bottom > 0) {
          const distance = Math.abs(rect.top - viewportMiddle);
          if (rect.top <= viewportMiddle && distance < bestDistance) {
            bestDistance = distance;
            bestSection = (el as HTMLElement).dataset.navSection || 'hero';
          }
        }
      });

      // Fallback: if scrolled to very top, it's hero
      if (window.scrollY < 100) {
        bestSection = 'hero';
      }

      setActiveSection(bestSection);
    };

    window.addEventListener('scroll', detectSection, { passive: true });
    // Run once on mount to set initial state
    detectSection();

    return () => window.removeEventListener('scroll', detectSection);
  }, [pathname]);

  // --- Section change transition animation ---
  useEffect(() => {
    if (activeSection === prevSectionRef.current) return;
    
    const prevSection = prevSectionRef.current;
    prevSectionRef.current = activeSection;

    if (reducedMotion) {
      setDisplaySection(activeSection);
      setDisplayTimecode(SECTION_TIMECODES[activeSection] || '00:00:00');
      return;
    }

    // 1. Trigger sweep
    setIsSweeping(true);

    // 2. Exit current text
    setSectionTransitionState('exit');

    // 3. After exit, swap text and enter
    const t1 = setTimeout(() => {
      setDisplaySection(activeSection);
      setSectionTransitionState('enter');
      
      // Trigger timecode scramble
      setIsTimecodeUpdating(true);
      scrambleTimecode(activeSection);
      
      // Trigger scene number scramble
      scrambleSceneNumber(activeSection);
    }, 150);

    // 4. Settle to visible
    const t2 = setTimeout(() => {
      setSectionTransitionState('visible');
    }, 300);

    // 5. End sweep
    const t3 = setTimeout(() => {
      setIsSweeping(false);
    }, 500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeSection, reducedMotion]);

  // --- Timecode scramble ---
  const scrambleTimecode = useCallback((section: string) => {
    const target = SECTION_TIMECODES[section] || '00:00:00';
    let frame = 0;
    const totalFrames = 8;
    const digits = '0123456789';

    const interval = setInterval(() => {
      frame++;
      if (frame >= totalFrames) {
        setDisplayTimecode(target);
        setIsTimecodeUpdating(false);
        clearInterval(interval);
        return;
      }
      const scrambled = target.replace(/\d/g, () =>
        digits[Math.floor(Math.random() * digits.length)]
      );
      setDisplayTimecode(scrambled);
    }, 45);
  }, []);

  // --- Scene number scramble (preserved from original) ---
  const scrambleSceneNumber = useCallback((section: string) => {
    const idx = NAV_SECTIONS.findIndex(s => s.section === section);
    const target = idx >= 0 ? NAV_SECTIONS[idx].scene : 'SC.01';
    let frame = 0;
    const totalFrames = 6;
    const chars = '0123456789';

    const interval = setInterval(() => {
      frame++;
      if (frame >= totalFrames) {
        setDisplaySceneNumber(target);
        clearInterval(interval);
        return;
      }
      const scrambled = target.replace(/\d/g, () =>
        chars[Math.floor(Math.random() * chars.length)]
      );
      setDisplaySceneNumber(scrambled);
    }, 50);
  }, []);

  // --- Loader completion listener (preserved) ---
  useEffect(() => {
    const alreadyComplete = !document.querySelector('[class*="loaderOverlay"]');
    if (alreadyComplete) {
      setLoaderDone(true);
      setAssembled(true);
      setShowBrand(true);
      setShowPlate(true);
      return;
    }

    const handleLoaderComplete = () => {
      setLoaderDone(true);
    };

    window.addEventListener('cinema-loader-complete', handleLoaderComplete);
    return () => window.removeEventListener('cinema-loader-complete', handleLoaderComplete);
  }, []);

  // --- Assembly animation sequence (preserved + adapted) ---
  useEffect(() => {
    if (!loaderDone || assembled) return;

    if (reducedMotion) {
      setShowBrand(true);
      setShowPlate(true);
      setAssembled(true);
      return;
    }

    const t1 = setTimeout(() => { setShowBrand(true); }, 100);
    const t2 = setTimeout(() => { setShowPlate(true); }, 350);
    const t3 = setTimeout(() => { setAssembled(true); }, 800);

    return () => { [t1, t2, t3].forEach(clearTimeout); };
  }, [loaderDone, assembled, reducedMotion]);

  // --- Beam property interpolation based on scroll (preserved) ---
  const beamBlur = lerp(12, 6, scrollProgress);
  const beamWidthMult = lerp(1.5, 1.2, scrollProgress);
  const beamPeakOpacity = lerp(0.20, 0.30, scrollProgress);

  // --- Active beam positioning (preserved, adapted for plate) ---
  const computeBeamPosition = useCallback((
    targetIndex: number | null,
    widthMult: number
  ): React.CSSProperties | null => {
    if (targetIndex === null) return null;
    const container = plateRef.current;
    if (!container) return null;

    const targetEl = navItemRefs.current[targetIndex] ?? null;
    if (!targetEl) return null;

    const containerRect = container.getBoundingClientRect();
    const targetRect = targetEl.getBoundingClientRect();
    const left = targetRect.left - containerRect.left;
    const width = targetRect.width * widthMult;
    const offset = left + (targetRect.width / 2) - (width / 2);

    return {
      transform: `translateX(${offset}px)`,
      width: `${width}px`,
    };
  }, []);

  // Active beam tracking (Removed: Only hover glow is shown now)
  const activeNavIndex = NAV_SECTIONS.findIndex(s => s.section === activeSection);

  // Hover beam positioning
  const updateHoverCone = useCallback((index: number | null) => {
    if (index === null || index === activeNavIndex) return;
    const style = computeBeamPosition(index, 1.3);
    if (style) {
      setHoverConeStyle(style);
    }
  }, [activeNavIndex, computeBeamPosition]);

  useEffect(() => {
    updateHoverCone(hoverIndex);
  }, [hoverIndex, updateHoverCone]);

  // Resize handler
  useEffect(() => {
    const handleResize = () => {
      updateHoverCone(hoverIndex);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hoverIndex, updateHoverCone]);

  // --- Hover expand/collapse ---
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handlePlateMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsExpanded(true);
  }, []);

  const handlePlateMouseLeave = useCallback(() => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
      setHoverIndex(null);
    }, 150);
  }, []);

  // --- Mobile: tap plate to toggle strip ---
  const handlePlateTap = useCallback(() => {
    // Only on mobile
    if (window.innerWidth > 768) return;
    setIsMobileStripOpen(prev => !prev);
  }, []);

  // Close mobile strip on outside click
  useEffect(() => {
    if (!isMobileStripOpen) return;
    const handleClick = (e: MouseEvent) => {
      const strip = document.querySelector(`.${styles.mobileSceneStrip}`);
      const plate = plateRef.current;
      if (strip && !strip.contains(e.target as Node) && plate && !plate.contains(e.target as Node)) {
        setIsMobileStripOpen(false);
      }
    };
    document.addEventListener('click', handleClick, { capture: true });
    return () => document.removeEventListener('click', handleClick, { capture: true });
  }, [isMobileStripOpen]);

  // Section name for display
  const activeSectionData = NAV_SECTIONS.find(s => s.section === displaySection);
  const sectionLabel = activeSectionData?.label?.toUpperCase() || 'HERO';

  // Section transition class
  const sectionNameClass = sectionTransitionState === 'exit'
    ? styles.sectionNameExit
    : sectionTransitionState === 'enter'
    ? styles.sectionNameEnter
    : styles.sectionNameVisible;

  return (
    <header
      className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}
      role="banner"
    >
      <nav 
        className={`${styles.nav} ${
          activeSection && activeSection !== 'hero' ? styles[`theme${activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}`] || '' : ''
        }`}
        aria-label="Main navigation"
      >
        {/* ============================================================
            LEFT: ACM Brand — Always visible
            ============================================================ */}
        <Link
          href="/"
          className={`${styles.brandBlock} ${
            !showBrand ? styles.assembleHidden : styles.assembleFade
          }`}
          aria-label="ACM NIT SURAT — Home"
          onClick={(e) => handleNavClick(e, '/', 'hero')}
        >
          <svg viewBox="0 0 200 200" className={styles.brandLogo} aria-hidden="true">
            <defs>
              <linearGradient id="nav-acm-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#73bdf0" />
                <stop offset="50%" stopColor="#4ba5e4" />
                <stop offset="100%" stopColor="#2a82ca" />
              </linearGradient>
            </defs>
            <path d="M 100,0 L 200,100 L 100,200 L 0,100 Z" fill="url(#nav-acm-gradient)" />
            <circle cx="100" cy="100" r="58" fill="none" stroke="#ffffff" strokeWidth="5" />
            <text
              x="100" y="108"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="44" fontWeight="900"
              fill="#ffffff" textAnchor="middle"
              letterSpacing="-1.5"
            >acm</text>
            <text
              x="100" y="130"
              fontFamily="Arial, Helvetica, sans-serif"
              fontSize="11" fontWeight="bold"
              fill="#ffffff" textAnchor="middle"
              letterSpacing="0.5"
            >NIT SURAT</text>
          </svg>
          <div className={styles.brandText}>
            <span className={styles.brandName}>ACM</span>
            <span className={styles.brandSubtitle}>NIT SURAT</span>
          </div>

          <div className={styles.brandDivider} aria-hidden="true" />

          <div className={styles.brandLogoSvnit}>
            <Image 
              src="/NIT_Surat_Logo.svg.png" 
              alt="SVNIT Logo" 
              width={34} 
              height={34} 
              className={styles.svnitImg}
            />
          </div>
        </Link>

        {/* ============================================================
            RIGHT: NOW SHOWING Plate — Cinematic scene indicator
            ============================================================ */}
        <div className={styles.plateWrapper}>
          <div
            ref={plateRef}
          className={`${styles.plate} ${isExpanded ? styles.expanded : ''} ${
            !showPlate ? styles.plateAssembleHidden : styles.plateAssembleFade
          }`}
          onMouseEnter={handlePlateMouseEnter}
          onMouseLeave={handlePlateMouseLeave}
          onClick={handlePlateTap}
          role="navigation"
          aria-label="Scene indicator"
        >
          {/* Registration marks */}
          <div className={`${styles.registrationMark} ${styles.registrationLeft}`} aria-hidden="true" />
          <div className={`${styles.registrationMark} ${styles.registrationRight}`} aria-hidden="true" />

          {/* Hover beam cone (visible in expanded state on hover) */}
          <div
            className={`${styles.hoverCone} ${
              hoverIndex !== null && hoverIndex !== activeNavIndex
                ? styles.hoverVisible
                : styles.hoverFadeOut
            }`}
            style={hoverConeStyle}
            aria-hidden="true"
          />

          {/* Film grain texture overlay */}
          <div className={styles.plateGrain} aria-hidden="true" />

          {/* Ambient projection sweep — periodic light pass */}
          <div className={styles.plateAmbientSweep} aria-hidden="true" />

          {/* Projection sweep — amber light pass on section change */}
          <div
            className={`${styles.projectionSweep} ${isSweeping ? styles.projectionSweepActive : ''}`}
            aria-hidden="true"
          />

          {/* Dust motes drifting through projection light */}
          <div className={styles.plateDustField} aria-hidden="true">
            <span className={`${styles.plateDustMote} ${styles.plateDustMote1}`} />
            <span className={`${styles.plateDustMote} ${styles.plateDustMote2}`} />
            <span className={`${styles.plateDustMote} ${styles.plateDustMote3}`} />
            <span className={`${styles.plateDustMote} ${styles.plateDustMote4}`} />
            <span className={`${styles.plateDustMote} ${styles.plateDustMote5}`} />
          </div>

          {/* --- Collapsed content: SC.02 · NOW SHOWING — ABOUT · 00:02:18 --- */}
          <div className={styles.plateContent}>
            <span className={styles.sceneNumber}>{displaySceneNumber}</span>
            <span className={styles.nowShowingLabel}>NOW SHOWING</span>
            <span className={styles.separator}>—</span>
            <span className={`${styles.sectionName} ${sectionNameClass}`}>
              {sectionLabel}
            </span>
            <span className={`${styles.timecode} ${isTimecodeUpdating ? styles.timecodeUpdating : ''}`}>
              {displayTimecode}
            </span>
          </div>

          {/* --- Expanded content: Navigation items --- */}
          <div className={styles.navItemsContainer}>
            {NAV_SECTIONS.map((item, i) => {
              const isActive = item.section === activeSection;
              return (
                <a
                  key={item.section}
                  href={item.href}
                  ref={(el) => { navItemRefs.current[i] = el; }}
                  className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onClick={(e) => handleNavClick(e, item.href, item.section)}
                >
                  <span className={styles.navItemScene}>{item.scene}</span>
                  <span className={styles.navItemLabel}>{item.label}</span>


                  {/* Hover dust */}
                  <span className={styles.hoverDustField} aria-hidden="true">
                    <span className={`${styles.hoverDustMote} ${styles.hoverDustMote1}`} />
                    <span className={`${styles.hoverDustMote} ${styles.hoverDustMote2}`} />
                    <span className={`${styles.hoverDustMote} ${styles.hoverDustMote3}`} />
                  </span>
                </a>
              );
            })}
            {/* Join Us — last item */}
            <a
              href="/join"
              className={`${styles.navItem} ${styles.navItemJoin}`}
              ref={(el) => { navItemRefs.current[NAV_SECTIONS.length] = el; }}
              onMouseEnter={() => setHoverIndex(NAV_SECTIONS.length)}
              onMouseLeave={() => setHoverIndex(null)}
              onClick={(e) => {
                e.preventDefault();
                window.dispatchEvent(new CustomEvent('nav-route-clicked', { detail: '/join' }));
                setIsExpanded(false);
              }}
            >
              <span className={styles.navItemScene}>&nbsp;</span>
              <span className={styles.navItemLabel}>Join Us</span>
            </a>
          </div>
        </div>

        {/* Hover hint — positioned absolutely below plate */}
        <span className={styles.hoverHint} aria-hidden="true">
          hover to navigate
        </span>
      </div>

        {/* ============================================================
            MOBILE: Horizontal scrollable scene strip
            ============================================================ */}
        <div className={`${styles.mobileSceneStrip} ${isMobileStripOpen ? styles.mobileStripOpen : ''}`}>
          {NAV_SECTIONS.map((item) => {
            const isActive = item.section === activeSection;
            return (
              <a
                key={item.section}
                href={item.href}
                className={`${styles.mobileSceneItem} ${isActive ? styles.mobileSceneActive : ''}`}
                onClick={(e) => handleNavClick(e, item.href, item.section)}
              >
                <span className={styles.mobileSceneCode}>{item.scene}</span>
                <span className={styles.mobileSceneLabel}>{item.label}</span>
              </a>
            );
          })}
          <a
            href="/join"
            className={styles.mobileSceneItem}
            onClick={(e) => {
              e.preventDefault();
              window.dispatchEvent(new CustomEvent('nav-route-clicked', { detail: '/join' }));
              setIsMobileStripOpen(false);
            }}
          >
            <span className={styles.mobileSceneCode}>&nbsp;</span>
            <span className={styles.mobileSceneLabel}>Join</span>
          </a>
        </div>
      </nav>
    </header>
  );
}
