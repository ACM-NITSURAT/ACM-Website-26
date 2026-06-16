'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Navbar.module.css';

/* ============================================================
   NAV LINKS — Each page is a "scene" in the production
   ============================================================ */
const NAV_LINKS = [
  { label: 'About',    href: '/about',    scene: 'SC. 01', section: 'about' },
  { label: 'Events',   href: '/events',   scene: 'SC. 02', section: 'events' },
  { label: 'Projects', href: '/projects', scene: 'SC. 03', section: 'projects' },
  { label: 'Team',     href: '/team',     scene: 'SC. 04', section: 'team' },
];

/** Linearly interpolate between a and b */
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * Math.min(1, Math.max(0, t));
}

/* ============================================================
   Navbar — Living Projection System
   
   "The projector is always running."
   
   Dual Beam Architecture:
   - Active Beam: Always on, tracks current section/route.
     Sweeps between links with cinematic easing.
   - Hover Beam: Secondary, dimmer. Shows potential destination.
     Does NOT appear when hovering the active link.
   
   The beam responds to scroll:
   - Hero: wider, softer, atmospheric
   - Scrolled: narrower, sharper, focused
   ============================================================ */

export default function Navbar() {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  // Assembly animation state
  const [loaderDone, setLoaderDone] = useState(false);
  const [assembled, setAssembled] = useState(false);
  const [showLinks, setShowLinks] = useState(false);
  const [showDivider, setShowDivider] = useState(false);
  const [showMarks, setShowMarks] = useState(false);
  const [showScene, setShowScene] = useState(false);
  const [dividerDrawn, setDividerDrawn] = useState(false);
  const [showActiveBeam, setShowActiveBeam] = useState(false);

  // Beam state
  const [activeIndex, setActiveIndex] = useState<number | 'brand' | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [activeConeStyle, setActiveConeStyle] = useState<React.CSSProperties>({ opacity: 0 });
  const [hoverConeStyle, setHoverConeStyle] = useState<React.CSSProperties>({});

  // Global navigation handler for cinematic transitions
  const handleNavClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>, href: string) => {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent('nav-route-clicked', { detail: href }));
  }, []);

  // Refs
  const navRef = useRef<HTMLElement>(null);
  const brandRef = useRef<HTMLAnchorElement>(null);
  const navLinksRef = useRef<HTMLUListElement>(null);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // --- Reduced motion detection ---
  useEffect(() => {
    const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mql.matches);
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, []);

  // --- Scroll listener with progress interpolation ---
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

  // --- Lock body scroll when mobile menu is open ---
  useEffect(() => {
    document.body.style.overflow = isMobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileOpen]);

  // --- Determine active index from route ---
  useEffect(() => {
    const routeIndex = NAV_LINKS.findIndex(l => l.href === pathname);
    if (routeIndex >= 0) {
      setActiveIndex(routeIndex);
    } else if (pathname === '/') {
      setActiveIndex('brand');
    } else {
      setActiveIndex(null);
    }
  }, [pathname]);

  // --- IntersectionObserver for scroll-based section detection ---
  useEffect(() => {
    if (pathname !== '/') return; // Only on home page

    const sections = document.querySelectorAll('[data-nav-section]');
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const sectionName = (entry.target as HTMLElement).dataset.navSection;
            const idx = NAV_LINKS.findIndex(l => l.section === sectionName);
            if (idx >= 0) {
              setActiveIndex(idx);
            }
          }
        }
      },
      { threshold: 0.4, rootMargin: '-10% 0px -50% 0px' }
    );

    sections.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, [pathname]);

  // --- Loader completion listener ---
  useEffect(() => {
    // Check if loader has already completed (no loader on this page)
    const alreadyComplete = !document.querySelector('[class*="loaderOverlay"]');
    if (alreadyComplete) {
      // No loader present — show navbar immediately
      setLoaderDone(true);
      setAssembled(true);
      setShowDivider(true);
      setDividerDrawn(true);
      setShowLinks(true);
      setShowMarks(true);
      setShowScene(true);
      setShowActiveBeam(true);
      return;
    }

    const handleLoaderComplete = () => {
      setLoaderDone(true);
    };

    window.addEventListener('cinema-loader-complete', handleLoaderComplete);
    return () => window.removeEventListener('cinema-loader-complete', handleLoaderComplete);
  }, []);

  // --- Assembly animation sequence ---
  useEffect(() => {
    if (!loaderDone || assembled) return;

    if (reducedMotion) {
      // Skip animation, show everything immediately
      setShowDivider(true);
      setDividerDrawn(true);
      setShowLinks(true);
      setShowMarks(true);
      setShowScene(true);
      setShowActiveBeam(true);
      setAssembled(true);
      return;
    }

    // Staggered assembly: logo is already visible
    // divider → links → beam sweeps to section → marks → scene indicator
    const t1 = setTimeout(() => { setShowDivider(true); }, 100);
    const t2 = setTimeout(() => { setDividerDrawn(true); }, 150);
    const t3 = setTimeout(() => { setShowLinks(true); }, 250);
    const t4 = setTimeout(() => { setShowActiveBeam(true); }, 500);
    const t5 = setTimeout(() => { setShowMarks(true); }, 600);
    const t6 = setTimeout(() => { setShowScene(true); }, 700);
    const t7 = setTimeout(() => { setAssembled(true); }, 900);

    return () => { [t1, t2, t3, t4, t5, t6, t7].forEach(clearTimeout); };
  }, [loaderDone, assembled, reducedMotion]);

  // --- Beam property interpolation based on scroll ---
  const beamBlur = lerp(14, 6, scrollProgress);
  const beamWidthMult = lerp(1.6, 1.2, scrollProgress);
  const beamPeakOpacity = lerp(0.30, 0.40, scrollProgress);

  // --- Active beam positioning ---
  const computeBeamPosition = useCallback((
    targetIndex: number | 'brand' | null,
    widthMult: number
  ): React.CSSProperties | null => {
    if (targetIndex === null) return null;
    const container = navRef.current;
    if (!container) return null;

    let targetEl: HTMLElement | null = null;

    if (targetIndex === 'brand') {
      targetEl = brandRef.current;
    } else {
      targetEl = linkRefs.current[targetIndex] ?? null;
    }

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

  // Update active beam when activeIndex, scroll, or assembly changes
  useEffect(() => {
    if (!showActiveBeam) {
      setActiveConeStyle({ opacity: 0 });
      return;
    }
    const raf = requestAnimationFrame(() => {
      const style = computeBeamPosition(activeIndex, beamWidthMult);
      if (style) {
        setActiveConeStyle({
          ...style,
          opacity: 1,
          '--beam-blur': `${beamBlur}px`,
          '--beam-peak': `${beamPeakOpacity}`,
        } as React.CSSProperties);
      } else {
        setActiveConeStyle({ opacity: 0 });
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [activeIndex, beamWidthMult, beamBlur, beamPeakOpacity, showActiveBeam, computeBeamPosition]);

  // Resize handler for active beam
  useEffect(() => {
    const handleResize = () => {
      if (!showActiveBeam) return;
      const style = computeBeamPosition(activeIndex, beamWidthMult);
      if (style) {
        setActiveConeStyle({
          ...style,
          opacity: 1,
          '--beam-blur': `${beamBlur}px`,
          '--beam-peak': `${beamPeakOpacity}`,
        } as React.CSSProperties);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeIndex, beamWidthMult, beamBlur, beamPeakOpacity, showActiveBeam, computeBeamPosition]);

  // --- Hover beam positioning ---
  const updateHoverCone = useCallback((index: number | null) => {
    // Don't reposition if null or active (CSS classes handle visibility)
    if (index === null || index === activeIndex) return;

    const style = computeBeamPosition(index, 1.3);
    if (style) {
      setHoverConeStyle(style);
    }
  }, [activeIndex, computeBeamPosition]);

  useEffect(() => {
    updateHoverCone(hoverIndex);
  }, [hoverIndex, updateHoverCone]);

  useEffect(() => {
    const handleResize = () => updateHoverCone(hoverIndex);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [hoverIndex, updateHoverCone]);

  // --- Scene indicator scramble effect ---
  const [displayScene, setDisplayScene] = useState('');
  const activeScene = typeof activeIndex === 'number'
    ? NAV_LINKS[activeIndex]?.scene ?? ''
    : '';

  useEffect(() => {
    if (!activeScene) { setDisplayScene(''); return; }
    if (reducedMotion) { setDisplayScene(activeScene); return; }

    let frame = 0;
    const totalFrames = 6;
    const chars = '0123456789';

    const interval = setInterval(() => {
      frame++;
      if (frame >= totalFrames) {
        setDisplayScene(activeScene);
        clearInterval(interval);
        return;
      }
      const scrambled = activeScene.replace(/\d/g, () =>
        chars[Math.floor(Math.random() * chars.length)]
      );
      setDisplayScene(scrambled);
    }, 50);

    return () => clearInterval(interval);
  }, [activeScene, reducedMotion]);

  return (
    <header
      className={`${styles.header} ${isScrolled ? styles.scrolled : ''}`}
      role="banner"
    >
      <nav className={styles.nav} ref={navRef} aria-label="Main navigation">
        {/* --- Registration Marks --- */}
        <div
          className={`${styles.registrationMark} ${styles.registrationLeft} ${
            !showMarks ? styles.assembleHidden : styles.assembleFade
          }`}
          aria-hidden="true"
        />
        <div
          className={`${styles.registrationMark} ${styles.registrationRight} ${
            !showMarks ? styles.assembleHidden : styles.assembleFade
          }`}
          aria-hidden="true"
        />

        {/* --- Active Projection Cone --- */}
        <div
          className={styles.projectionCone}
          style={activeConeStyle}
          aria-hidden="true"
        />

        {/* --- Hover Projection Cone --- */}
        <div
          className={`${styles.hoverCone} ${
            hoverIndex !== null && hoverIndex !== activeIndex
              ? styles.hoverVisible
              : styles.hoverFadeOut
          }`}
          style={hoverConeStyle}
          aria-hidden="true"
        />

        {/* --- Brand Block: The Studio Mark --- */}
        <Link
          href="/"
          className={styles.brandBlock}
          ref={brandRef}
          aria-label="ACM NIT SURAT — Home"
          onClick={(e) => handleNavClick(e, '/')}
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
        </Link>

        {/* --- Divider --- */}
        <div
          className={`${styles.divider} ${
            !showDivider ? styles.assembleHidden : styles.assembleFade
          } ${!dividerDrawn ? styles.dividerDraw : styles.dividerDrawIn}`}
          aria-hidden="true"
        />

        {/* --- Navigation Links --- */}
        <ul
          className={`${styles.navLinks} ${
            !showLinks ? styles.assembleHidden : styles.assembleFade
          }`}
          ref={navLinksRef}
        >
          {NAV_LINKS.map((link, i) => {
            const isActive = activeIndex === i;
            return (
              <li key={link.href} className={styles.navItem}>
                <Link
                  href={link.href}
                  className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                  ref={(el) => { linkRefs.current[i] = el; }}
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onClick={(e) => {
                    handleNavClick(e, link.href);
                    setIsMobileOpen(false);
                  }}
                >
                  {/* Scene Indicator */}
                  <span
                    className={`${styles.sceneIndicator} ${
                      !showScene ? styles.assembleHidden : ''
                    }`}
                    aria-hidden="true"
                  >
                    {isActive ? displayScene : link.scene}
                  </span>

                  {link.label}

                  {/* Active dust — subtle, always in active beam */}
                  <span className={styles.activeDustField} aria-hidden="true">
                    <span className={`${styles.activeDustMote} ${styles.activeDustMote1}`} />
                    <span className={`${styles.activeDustMote} ${styles.activeDustMote2}`} />
                    <span className={`${styles.activeDustMote} ${styles.activeDustMote3}`} />
                  </span>

                  {/* Hover dust — more visible, on non-active hover */}
                  <span className={styles.hoverDustField} aria-hidden="true">
                    <span className={`${styles.hoverDustMote} ${styles.hoverDustMote1}`} />
                    <span className={`${styles.hoverDustMote} ${styles.hoverDustMote2}`} />
                    <span className={`${styles.hoverDustMote} ${styles.hoverDustMote3}`} />
                    <span className={`${styles.hoverDustMote} ${styles.hoverDustMote4}`} />
                    <span className={`${styles.hoverDustMote} ${styles.hoverDustMote5}`} />
                  </span>

                  {/* Registration tick */}
                  <span className={styles.registrationTick} aria-hidden="true" />
                </Link>
              </li>
            );
          })}
        </ul>

        {/* --- Actions --- */}
        <div className={`${styles.actions} ${
          !showLinks ? styles.assembleHidden : styles.assembleFade
        }`}>
          <Link href="/join" className={styles.joinBtn}>Join Us</Link>

          <button
            className={`${styles.mobileToggle} ${isMobileOpen ? styles.open : ''}`}
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            aria-label={isMobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMobileOpen}
          >
            <div className={styles.hamburger}>
              <span />
              <span />
              <span />
            </div>
          </button>
        </div>
      </nav>

      {/* ============================================================
          MOBILE MENU — "The Screening Room"
          ============================================================ */}
      <div
        className={`${styles.mobileMenu} ${isMobileOpen ? styles.mobileOpen : ''}`}
        aria-hidden={!isMobileOpen}
      >
        <div className={styles.mobileBeam} aria-hidden="true" />
        <div className={styles.mobileCenterMark} aria-hidden="true" />

        <ul className={styles.mobileNavLinks}>
          {NAV_LINKS.map((link, i) => {
            const isActive = activeIndex === i;
            return (
              <li
                key={link.href}
                className={styles.mobileNavItem}
                style={{ transitionDelay: isMobileOpen ? `${0.15 + i * 0.08}s` : '0s' }}
              >
                <Link
                  href={link.href}
                  className={`${styles.mobileNavLink} ${isActive ? styles.active : ''}`}
                  onClick={(e) => {
                    handleNavClick(e, link.href);
                    setIsMobileOpen(false);
                  }}
                >
                  <span className={styles.mobileScene}>{link.scene}</span>
                  {link.label}
                </Link>
              </li>
            );
          })}
          <li
            className={styles.mobileNavItem}
            style={{ transitionDelay: isMobileOpen ? `${0.15 + NAV_LINKS.length * 0.08}s` : '0s' }}
          >
            <Link
              href="/join"
              className={`${styles.mobileNavLink} ${styles.mobileJoinLink}`}
              onClick={() => setIsMobileOpen(false)}
            >
              Join Us
            </Link>
          </li>
        </ul>
      </div>
    </header>
  );
}
