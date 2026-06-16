'use client';

import React from 'react';
import styles from './IntroSection.module.css';
import Image from 'next/image';

interface IntroSectionProps {
  isEntered: boolean;
  onBackClick: () => void;
}

export default function IntroSection({ isEntered, onBackClick }: IntroSectionProps) {
  // We duplicate the strip items to create a seamless infinite scroll loop
  const stripItems = [
    "500+ ACTIVE MEMBERS",
    "10+ YEARS OF EXCELLENCE",
    "50+ EVENTS ANNUALLY",
    "HACKATHONS & WORKSHOPS",
    "NATIONAL AWARDS WON",
    "ACM NIT SURAT CHAPTER"
  ];
  const duplicatedItems = [...stripItems, ...stripItems];

  return (
    <section className={`${styles.introSection} ${isEntered ? styles.isEntered : ''}`} aria-hidden={!isEntered}>
      {/* Background Effects */}
      <div className={styles.scanLines} />

      {/* Projector Beam */}
      <div className={styles.projectorBeam} />

      {/* Back Button */}
      <button className={styles.backBtn} onClick={onBackClick}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        BACK
      </button>

      {/* Center Content */}
      <div className={styles.centerContent}>
        <span className={styles.tagline}>SC. 01 — WHO WE ARE</span>
        <h1 className={styles.headline}>ACM NIT SURAT</h1>
        <p className={styles.subtitle}>
          The Association for Computing Machinery Student Chapter at NIT Surat.
          We are a community of passionate developers, competitive programmers, and tech enthusiasts.
        </p>

        <div className={styles.statPills}>
          <span className={styles.statPill}>500+ Members</span>
          <span className={styles.statPill}>10+ Years</span>
          <span className={styles.statPill}>50+ Events/yr</span>
        </div>

        <div className={styles.ctaGroup}>
          <button className={styles.btnSecondary}>Our Story →</button>
          <button className={styles.btnPrimary}>Join Us</button>
        </div>
        {/* Photo Frames integrated onto the screen */}
        <div className={styles.photoFrames}>
          <div className={`${styles.frame} ${styles.verticalStrip} ${styles.frame1}`} style={{ '--rot': '-4deg' } as React.CSSProperties}>
            <div className={styles.frameImage}>
              <div className={styles.playIcon}>▷</div>
            </div>
            <div className={styles.frameCaption}>HACKATHON '24</div>
          </div>
          <div className={`${styles.frame} ${styles.frame2}`} style={{ '--rot': '3deg' } as React.CSSProperties}>
            <div className={styles.frameImage} style={{ backgroundImage: "url('/acm-group-photo25.jpg')" }}>
              <div className={styles.playIcon}>▷</div>
            </div>
            <div className={styles.frameCaption}>ICPC REGIONALS</div>
          </div>
          <div className={`${styles.frame} ${styles.verticalStrip} ${styles.frame3}`} style={{ '--rot': '-2deg' } as React.CSSProperties}>
            <div className={styles.frameImage}>
              <div className={styles.playIcon}>▷</div>
            </div>
            <div className={styles.frameCaption}>WORKSHOP SERIES</div>
          </div>
      </div>
      </div>

      {/* Audience Silhouettes */}
      <div className={styles.audienceSilhouettes}>
        <svg viewBox="0 0 1000 100" preserveAspectRatio="none" width="100%" height="100%">
          {/* Left Side Audience */}
          <path d="M50,100 Q40,60 60,40 Q80,20 100,40 Q120,60 110,100 Z" fill="currentColor" />
          <path d="M130,100 Q120,70 140,50 Q160,30 180,50 Q200,70 190,100 Z" fill="currentColor" />
          <path d="M220,100 Q210,65 230,45 Q250,25 270,45 Q290,65 280,100 Z" fill="currentColor" />
          <path d="M310,100 Q300,55 320,35 Q340,15 360,35 Q380,55 370,100 Z" fill="currentColor" />
          <path d="M400,100 Q390,75 410,55 Q430,35 450,55 Q470,75 460,100 Z" fill="currentColor" />

          {/* Right Side Audience */}
          <path d="M550,100 Q540,60 560,40 Q580,20 600,40 Q620,60 610,100 Z" fill="currentColor" />
          <path d="M640,100 Q630,75 650,55 Q670,35 690,55 Q710,75 700,100 Z" fill="currentColor" />
          <path d="M730,100 Q720,55 740,35 Q760,15 780,35 Q800,55 790,100 Z" fill="currentColor" />
          <path d="M820,100 Q810,65 830,45 Q850,25 870,45 Q890,65 880,100 Z" fill="currentColor" />
          <path d="M910,100 Q900,70 920,50 Q940,30 960,50 Q980,70 970,100 Z" fill="currentColor" />
        </svg>
      </div>
    </section>
  );
}
