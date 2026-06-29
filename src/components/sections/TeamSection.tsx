'use client';

import React, { useRef, useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import FlashingGrid from './FlashingGrid';
import ClapperboardSVG from '../shared/ClapperboardSVG';
import styles from './TeamSection.module.css';

/* ============================================================
   TeamSection — "The Viewfinder"

   Cards act as cinematic viewfinders with a focus-pull 
   reveal effect on scroll, arranged in a staggered grid.
   Background is extended from the About section.
   ============================================================ */

/* ============================================================
   TEAM DATA — 2026-27 Batch
   ============================================================ */
interface TeamMember {
  name: string;
  role: string;
  image: string;
  socials: { email: boolean; linkedin: boolean; github: boolean };
}

const TEAM: TeamMember[] = [
  { name: 'Ansh Gupta', role: 'Chairperson', image: '/team/2026/Ansh.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Pratham Patadiya', role: 'Vice-Chairperson', image: '/team/2026/Pratham.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Nidhi Arora', role: 'Community Head', image: '/team/2026/Nidhi.webp', socials: { email: true, linkedin: true, github: false } },
  { name: 'Priyansh T', role: 'Secretary', image: '/team/2026/Priyansh.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Arshad Khatib', role: 'Secretary', image: '/team/2026/Arshad.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Rudraksh Fanse', role: 'Treasurer', image: '/team/2026/Rudraksh.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Hatim Kutarwadliwala', role: 'Treasurer', image: '/team/2026/Hatim.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Aayush Prasad', role: 'Developer', image: '/team/2026/Aayush.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Siddharth Sheth', role: 'Developer', image: '/team/2026/Siddharth.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Kartikeya Aryam', role: 'Problem Setter', image: '/team/2026/Kartikeya.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Paida Raja Rathan', role: 'Problem Setter', image: '/team/2026/Rathan.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Nihar Mehta', role: 'Problem Setter', image: '/team/2026/Nihar.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Pal Thakkar', role: 'Designer', image: '/team/2026/Pal.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Naina Jain', role: 'Designer', image: '/team/2026/Naina.webp', socials: { email: true, linkedin: true, github: false } },
  { name: 'Mayank Behera', role: 'Social Media Manager', image: '/team/2026/Mayank.webp', socials: { email: true, linkedin: true, github: false } },
  { name: 'Sarath Chaitanya', role: 'Core Member', image: '/team/2026/Sarath.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Manav Dhamecha', role: 'Core Member', image: '/team/2026/Manav.webp', socials: { email: true, linkedin: true, github: true } },
  { name: 'Rushang Bagada', role: 'Core Member', image: '/team/2026/Rushang.webp', socials: { email: true, linkedin: true, github: true } },
];

/* ============================================================
   SOCIAL ICON SVGs
   ============================================================ */
const EmailIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
  </svg>
);

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const GitHubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

/* ============================================================
   MAIN COMPONENT
   ============================================================ */
export default function TeamSection() {
  /* IntersectionObserver 1 — triggers the focus pull when card enters view */
  const triggeredRef = useRef<Set<string>>(new Set());
  const [visibleBlocks, setVisibleBlocks] = useState<Set<string>>(new Set());

  /* IntersectionObserver 2 — tracks when card is in the middle of the screen for auto-hover on mobile */
  const [focusedBlocks, setFocusedBlocks] = useState<Set<string>>(new Set());

  const observerRef = useRef<IntersectionObserver | null>(null);
  const focusObserverRef = useRef<IntersectionObserver | null>(null);
  const elementsRef = useRef<Set<HTMLDivElement>>(new Set());

  useEffect(() => {
    // Reveal Observer
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
      { threshold: 0.1, rootMargin: '50px 0px' }
    );

    // Focus Observer (Middle of screen)
    focusObserverRef.current = new IntersectionObserver(
      (entries) => {
        if (window.innerWidth > 1024) {
          setFocusedBlocks(new Set());
          return;
        }

        entries.forEach((entry) => {
          const id = entry.target.getAttribute('data-block-id');
          if (!id) return;

          if (entry.isIntersecting) {
            setFocusedBlocks(new Set([id])); // Only one card focused at a time
          } else {
            setFocusedBlocks((prev) => {
              if (prev.has(id)) {
                return new Set();
              }
              return prev;
            });
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px' } // Narrower slice to ensure only one intersects at a time
    );

    elementsRef.current.forEach((el) => {
      observerRef.current?.observe(el);
      focusObserverRef.current?.observe(el);
    });

    return () => {
      observerRef.current?.disconnect();
      focusObserverRef.current?.disconnect();
    };
  }, []);

  const registerBlock = useCallback(
    (el: HTMLDivElement | null) => {
      if (el) {
        elementsRef.current.add(el);
        if (observerRef.current) {
          observerRef.current.observe(el);
        }
        if (focusObserverRef.current) {
          focusObserverRef.current.observe(el);
        }
      }
    },
    []
  );

  const isVisible = (id: string) => visibleBlocks.has(id);
  const isFocused = (id: string) => {
    // Only apply programmatic focus (auto-hover) on mobile devices
    if (typeof window !== 'undefined' && window.innerWidth > 1024) {
      return false;
    }
    return focusedBlocks.has(id);
  };

  return (
    <section className={styles.teamSection} id="team" data-nav-section="team">

      {/* ==========================================
          BACKGROUND ATMOSPHERE: EXTENDED FROM ABOUT SECTION
          ========================================== */}
      <div className={styles.bgAtmosphere} aria-hidden="true">
        <div className={styles.bgGrid} />
        <FlashingGrid />
        <div className={styles.bgGlow1} />
        <div className={styles.bgGlow2} />
      </div>

      <div className={styles.contentWrap}>

        {/* ==========================================
            TITLE BLOCK
            ========================================== */}
        <div
          ref={registerBlock}
          data-block-id="title"
          className={`${styles.titleBlock} ${isVisible('title') ? styles.titleBlockVisible : styles.titleBlockHidden
            }`}
        >
          <div className={`${styles.clapperboardWrap} ${isVisible('title') ? styles.clapperboardVisible : ''}`}>
            <ClapperboardSVG revealed={isVisible('title')} title="THE CAST" scene="12" take="01" colorTheme="bw" />
          </div>

          <div className={styles.titleText}>
            <p className={styles.eyebrow}>CAST & CREW — 2026/27</p>
            <h2 className={styles.heading}>THE TEAM</h2>
          </div>
        </div>

        {/* ==========================================
            STAGGERED VIEWFINDER GRID
            ========================================== */}
        <div className={styles.viewfinderGrid}>
          {TEAM.map((member, i) => {
            const blockId = `member-${i}`;
            const frameNum = String(i + 1).padStart(2, '0');

            return (
              <div
                key={member.name}
                ref={registerBlock}
                data-block-id={blockId}
                className={`${styles.viewfinderCard} ${isVisible(blockId) ? styles.cardVisible : styles.cardHidden
                  } ${isFocused(blockId) ? styles.cardFocused : ''}`}
              >
                {/* ==============================================
                    PREMIUM GLASS ENCLOSURE
                    ============================================== */}
                <div className={styles.glassContainer}>
                  {/* Continuous Scanning Line */}
                  <div className={styles.scanline} aria-hidden="true" />

                  {/* 1. Photo Layer */}
                  <div className={styles.cardPhotoWrap}>
                    <Image
                      src={member.image}
                      alt={member.name}
                      fill
                      sizes="(max-width: 480px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className={styles.cardPhoto}
                      loading="lazy"
                    />
                    {/* Deep Cinematic Duotone Overlay */}
                    <div className={styles.photoOverlay} />
                  </div>

                  {/* 2. Integrated Metadata Header */}
                  <div className={styles.cardHeader}>
                    <span className={styles.metaBadge}>T{frameNum}</span>
                    <div className={styles.recStatus}>
                      <div className={styles.recDot} />
                      REC
                    </div>
                  </div>

                  {/* 3. Viewfinder Technical Markings */}
                  <div className={styles.viewfinderMarkings} aria-hidden="true">
                    <div className={`${styles.cropMark} ${styles.tl}`} />
                    <div className={`${styles.cropMark} ${styles.tr}`} />
                    <div className={`${styles.cropMark} ${styles.bl}`} />
                    <div className={`${styles.cropMark} ${styles.br}`} />
                  </div>

                  {/* 4. Subject Info & Social Shutter (Moved inside glass container) */}
                  <div className={styles.subjectInfo}>
                    <div className={styles.subjectText}>
                      <p className={styles.subjectName}>{member.name}</p>
                      <p className={styles.subjectRole}>{member.role}</p>
                    </div>

                    {/* Slides up mechanically on hover */}
                    <div className={styles.socialShutter}>
                      {member.socials.email && (
                        <a href="#" className={styles.socialIcon} aria-label={`Email ${member.name}`}>
                          <EmailIcon />
                        </a>
                      )}
                      {member.socials.linkedin && (
                        <a href="#" className={styles.socialIcon} aria-label={`${member.name} on LinkedIn`}>
                          <LinkedInIcon />
                        </a>
                      )}
                      {member.socials.github && (
                        <a href="#" className={styles.socialIcon} aria-label={`${member.name} on GitHub`}>
                          <GitHubIcon />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ==========================================
            CLOSING CTA
            ========================================== */}
        <div
          ref={registerBlock}
          data-block-id="cta"
          className={`${styles.closingBlock} ${isVisible('cta')
            ? styles.closingBlockVisible
            : styles.closingBlockHidden
            }`}
        >
          <h2 className={styles.closingHeading}>
            &ldquo;Your credit is waiting.&rdquo;
          </h2>
          <p className={styles.closingSubline}>
            Applications open every academic year. Be part of the next chapter.
          </p>
          <a href="#" className={styles.ctaButton}>
            JOIN THE TEAM →
          </a>
        </div>
      </div>
    </section>
  );
}
