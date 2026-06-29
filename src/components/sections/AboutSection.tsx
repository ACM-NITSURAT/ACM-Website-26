'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import styles from './AboutSection.module.css';
import ClapperboardSVG from '../shared/ClapperboardSVG';

/* ============================================================
   AboutSection — Cinematic tonal contrast
   
   A NORMAL scrolling section — no scroll jacking, no RAF,
   no preventDefault. Uses IntersectionObserver for one-shot
   reveal animations per block.
   
   Reuses the same visual language as WalkThroughReel:
   - Film-frame cards with corner L-marks and sprocket borders
   - Spring-tilt-straighten hover effect on pillar cards
   - Same color palette (#07060a bg, #2563eb accent, #0a0916 cards)
   - Same typography system (Space Grotesk, Inter, monospace)
   - Film grain comes from global .cinemaGrainOverlay in layout.tsx
   ============================================================ */

import AboutWireframeScene from './AboutWireframeScene';
import FlashingGrid from './FlashingGrid';



/* ============================================================
   TIMELINE DATA
   ============================================================ */
const TIMELINE_DATA = [
  { year: '2005', title: 'Founded', desc: 'The ACM Student Chapter at SVNIT was established, becoming a hub for computing enthusiasts to collaborate and learn.' },
  { year: '2016', title: 'Inception Launched', desc: 'Our flagship competitive programming contest began, setting the stage for algorithmic excellence.' },
  { year: '2019', title: 'DotSlash Born', desc: 'The inaugural 30-hour national-level hackathon, "DotSlash: Root to Ideas", was successfully organized.' },
  { year: '2020', title: 'Pandemic Resilience', desc: 'Transitioned to online contests like Inception 5.0 and the ACM Summer Challenge without missing a beat.' },
  { year: '2024', title: 'Continuing the Legacy', desc: "Consistently hosting nationwide events like Epiphany, and staying true to our motto: 'Building technology. Building people.'" },
];

/* ============================================================
   PILLARS DATA
   ============================================================ */
const PILLARS_DATA = [
  {
    num: '01',
    title: 'COMPETE',
    desc: "ICPC, Codeforces, ranked battles. We don't just learn to code — we test ourselves against the best.",
    svg: (
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        {/* Crosshair / Target */}
        <g className={styles.animRotateSlow}>
          <circle cx="50" cy="50" r="40" strokeDasharray="4 4" />
        </g>
        <g className={styles.animPulseSlow}>
          <circle cx="50" cy="50" r="25" />
          <circle cx="50" cy="50" r="6" />
        </g>
        <line x1="50" y1="0" x2="50" y2="35" />
        <line x1="50" y1="65" x2="50" y2="100" />
        <line x1="0" y1="50" x2="35" y2="50" />
        <line x1="65" y1="50" x2="100" y2="50" />
      </svg>
    )
  },
  {
    num: '02',
    title: 'BUILD',
    desc: "Hackathons, real shipped products, open-source contributions. Ideas don't stay ideas here.",
    svg: (
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        {/* Stacked Blocks / Construction */}
        <g className={styles.animFloatTop}>
          <path d="M 50 15 L 85 30 L 50 45 L 15 30 Z" />
          <path d="M 15 30 L 15 50 L 50 65 L 50 45" />
          <path d="M 85 30 L 85 50 L 50 65 L 50 45" />
        </g>

        <g className={styles.animFloatBottom}>
          <path d="M 50 45 L 85 60 L 50 75 L 15 60 Z" />
          <path d="M 15 60 L 15 80 L 50 95 L 50 75" />
          <path d="M 85 60 L 85 80 L 50 95 L 50 75" />
        </g>
      </svg>
    )
  },
  {
    num: '03',
    title: 'CONNECT',
    desc: "A 500+ member network across companies, campuses, and careers. You're never building alone.",
    svg: (
      <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2">
        {/* Network Nodes */}
        <g className={styles.animPulseSlow}>
          <circle cx="50" cy="20" r="8" />
          <circle cx="20" cy="65" r="8" />
          <circle cx="80" cy="65" r="8" />
          <circle cx="50" cy="85" r="5" />
        </g>

        <line x1="43" y1="26" x2="27" y2="59" />
        <line x1="57" y1="26" x2="73" y2="59" />
        <line x1="28" y1="65" x2="72" y2="65" />

        <line x1="26" y1="71" x2="45" y2="83" className={styles.animDashFlow} strokeDasharray="2 2" />
        <line x1="74" y1="71" x2="55" y2="83" className={styles.animDashFlow} strokeDasharray="2 2" />
        <line x1="50" y1="28" x2="50" y2="80" className={styles.animDashFlow} strokeDasharray="2 2" />
      </svg>
    )
  },
];

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function AboutSection() {
  /* ==========================================
     BLOCK VISIBILITY — IntersectionObserver
     One-shot triggers per block ID.
     ========================================== */
  const triggeredRef = useRef<Set<string>>(new Set());
  const [visibleBlocks, setVisibleBlocks] = useState<Set<string>>(new Set());

  const observerRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Set<HTMLDivElement>>(new Set());

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const id = entry.target.getAttribute('data-block-id');
            if (id && !triggeredRef.current.has(id)) {
              triggeredRef.current.add(id);
              setVisibleBlocks((prev) => new Set(prev).add(id));
            }
          }
        });
      },
      // Lower threshold and positive rootMargin ensures it triggers easily even on reload
      { threshold: 0.05, rootMargin: '100px 0px' }
    );

    // Observe any elements that registered before the observer was ready
    elementsRef.current.forEach((el) => observerRef.current?.observe(el));

    return () => {
      observerRef.current?.disconnect();
    };
  }, []);

  const registerBlock = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        elementsRef.current.add(el);
        if (observerRef.current) {
          observerRef.current.observe(el);
        }
      }
    },
    []
  );

  /* ==========================================
     BLOCK 2 — Drag-to-scroll for timeline
     ========================================== */
  const timelineRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const scrollLeftStart = useRef(0);

  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;

    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      startX.current = e.pageX - el.offsetLeft;
      scrollLeftStart.current = el.scrollLeft;
      el.classList.add(styles.grabbing);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
      const x = e.pageX - el.offsetLeft;
      const walk = (x - startX.current) * 1.5;
      el.scrollLeft = scrollLeftStart.current - walk;
    };

    const onMouseUp = () => {
      isDragging.current = false;
      el.classList.remove(styles.grabbing);
    };

    const onMouseLeave = () => {
      isDragging.current = false;
      el.classList.remove(styles.grabbing);
    };

    el.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    el.addEventListener('mouseleave', onMouseLeave);

    return () => {
      el.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      el.removeEventListener('mouseleave', onMouseLeave);
    };
  }, []);

  /* ==========================================
     Block visibility helpers
     ========================================== */
  const isVisible = (id: string) => visibleBlocks.has(id);

  return (
    <section className={styles.aboutSection} id="about" data-nav-section="about">

      {/* ==========================================
          BACKGROUND ATMOSPHERE
          Technical grid, drifting glows, and Living Wireframe Scene.
          All behind content (z-index: 0).
          ========================================== */}
      <div className={styles.bgAtmosphere} aria-hidden="true">
        <div className={styles.bgGrid} />
        <FlashingGrid />
        <AboutWireframeScene />
        <div className={styles.bgGlow1} />
        <div className={styles.bgGlow2} />
      </div>

      <div className={styles.contentWrap}>

        {/* ==========================================
            BLOCK 1 — Title Card
            ========================================== */}
        <div
          ref={registerBlock}
          data-block-id="block1"
          className={`${styles.block1} ${isVisible('block1') ? styles.block1Visible : styles.block1Hidden}`}
        >
          <div className={styles.block1Text}>
            <p className={styles.eyebrow}>SC. 06 — THE FULL STORY</p>
            <h2 className={styles.heading}>ABOUT ACM SVNIT</h2>
            <p className={styles.missionParagraph}>
              The ACM Student Chapter at SVNIT is a prominent technical student organization affiliated with
              the world&apos;s largest computing society. Founded in 2005, we have served as a hub for computing
              enthusiasts to collaborate, learn, and grow for nearly two decades. We don&apos;t just talk about
              technology. We build it, compete with it, and ship it.
            </p>
            <div
              className={`${styles.titleRule} ${isVisible('block1') ? styles.titleRuleVisible : ''}`}
            />
          </div>

          {/* Clapperboard — positioned right side, animates in last */}
          <div
            className={`${styles.clapperboardWrap} ${isVisible('block1') ? styles.clapperboardVisible : ''}`}
          >
            <ClapperboardSVG revealed={isVisible('block1')} colorTheme="blue1" />
          </div>
        </div>

        {/* ==========================================
            BLOCK 1.5 — Mission (Left Clapperboard)
            ========================================== */}
        <div
          ref={registerBlock}
          data-block-id="block1b"
          className={`${styles.block1} ${styles.block1Reverse} ${isVisible('block1b') ? styles.block1Visible : styles.block1Hidden}`}
        >
          {/* Clapperboard — positioned left side */}
          <div
            className={`${styles.clapperboardWrapLeft} ${isVisible('block1b') ? styles.clapperboardVisibleLeft : ''}`}
          >
            <ClapperboardSVG revealed={isVisible('block1b')} title="OUR MISSION" scene="07" take="02" colorTheme="blue2" />
          </div>

          <div className={styles.block1Text}>
            <p className={styles.eyebrow}>SC. 07 — THE OBJECTIVE</p>
            <h2 className={styles.heading}>OUR MISSION</h2>
            <p className={styles.missionParagraph}>
              Our mission is to enhance the coding culture at SVNIT by fostering an environment of learning,
              sharing, and productivity. Guided by our motto — &quot;Building technology. Building people.&quot; — we
              focus on both technical skill development and personal growth.
            </p>
            <div
              className={`${styles.titleRule} ${isVisible('block1b') ? styles.titleRuleVisible : ''}`}
            />
          </div>
        </div>

        {/* ==========================================
            BLOCK 1.6 — Vision (Right Clapperboard)
            ========================================== */}
        <div
          ref={registerBlock}
          data-block-id="block1c"
          className={`${styles.block1} ${isVisible('block1c') ? styles.block1Visible : styles.block1Hidden}`}
        >
          <div className={styles.block1Text}>
            <p className={styles.eyebrow}>SC. 08 — THE FUTURE</p>
            <h2 className={styles.heading}>OUR VISION</h2>
            <p className={styles.missionParagraph}>
              We envision a community where every individual has the resources, mentorship, and opportunities
              to tackle challenges in the field of computing, participate in global standards, and bring their
              most ambitious ideas to life.
            </p>
            <div
              className={`${styles.titleRule} ${isVisible('block1c') ? styles.titleRuleVisible : ''}`}
            />
          </div>

          {/* Clapperboard — positioned right side (alternate tilt) */}
          <div
            className={`${styles.clapperboardWrapAltRight} ${isVisible('block1c') ? styles.clapperboardVisibleAltRight : ''}`}
          >
            <ClapperboardSVG revealed={isVisible('block1c')} title="OUR VISION" scene="08" take="01" colorTheme="blue3" />
          </div>
        </div>

        {/* ==========================================
            BLOCK 2 — The Timeline ("Reel of Years")
            ========================================== */}
        <div className={styles.block2}>
          <p className={styles.block2Label}>THE JOURNEY SO FAR</p>

          <div className={styles.timelineFullBleed}>
            <div
              ref={(el) => {
                timelineRef.current = el;
                registerBlock(el);
              }}
              data-block-id="block2"
              className={styles.timelineStrip}
            >
              {TIMELINE_DATA.map((item, i) => (
                <div
                  key={item.year}
                  className={`${styles.yearCard} ${isVisible('block2') ? styles.yearCardVisible : styles.yearCardHidden
                    }`}
                  style={
                    isVisible('block2')
                      ? { transitionDelay: `${i * 80}ms` }
                      : undefined
                  }
                >
                  {i < TIMELINE_DATA.length - 1 && <div className={styles.cardConnector} />}
                  <div className={styles.yearCardContent}>
                    <p className={styles.yearNumber}>{item.year}</p>
                    <p className={styles.milestoneTitle}>{item.title}</p>
                    <p className={styles.milestoneDesc}>{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ==========================================
            BLOCK 3 — The Pillars ("What We Stand For")
            ========================================== */}
        <div className={styles.block3}>
          <p className={styles.block3Label}>WHAT WE STAND FOR</p>
          <h3 className={styles.block3Heading}>THREE THINGS. ONE COMMUNITY.</h3>

          <div
            ref={registerBlock}
            data-block-id="block3"
            className={styles.pillarsGrid}
          >
            {PILLARS_DATA.map((pillar, i) => (
              <div
                key={pillar.num}
                className={`${styles.pillarCard} ${isVisible('block3') ? styles.pillarCardVisible : styles.pillarCardHidden
                  }`}
                style={
                  isVisible('block3')
                    ? { transitionDelay: `${i * 80}ms` }
                    : undefined
                }
              >
                <div className={styles.pillarScanLine} />
                <div className={styles.pillarBgIcon} aria-hidden="true">
                  {pillar.svg}
                </div>
                <span className={styles.pillarNumeral}>{pillar.num}</span>
                <div className={styles.pillarContent}>
                  <h4 className={styles.pillarTitle}>{pillar.title}</h4>
                  <p className={styles.pillarDesc}>{pillar.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* ==========================================
            BLOCK 4 — Closing Quote & Group Photo
            ========================================== */}
        <div
          ref={registerBlock}
          data-block-id="block4"
          className={`${styles.block4} ${isVisible('block4') ? styles.block4Visible : styles.block4Hidden}`}
          data-exclude-bg="true"
        >
          <div className={styles.block4Bg} aria-hidden="true" />
          
          {/* Group Photo as Cinematic Background */}
          <div className={styles.groupPhotoWrapper}>
            <div className={styles.groupPhotoOverlay} />
            <img 
              src="/acm-group-photo25.jpg" 
              alt="ACM NIT Surat Community" 
              className={styles.groupPhoto}
            />
          </div>

          <div className={styles.quoteRule} />
          <p className={styles.quoteText}>
            &ldquo;Building technology. Building people.&rdquo;
          </p>
          <p className={styles.quoteAttribution}>— ACM SVNIT, Since 2005</p>
        </div>
      </div>
    </section>
  );
}
