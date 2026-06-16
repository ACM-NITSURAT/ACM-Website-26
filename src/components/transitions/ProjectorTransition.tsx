'use client';

import React from 'react';
import styles from './ProjectorTransition.module.css';
import { TransitionState } from '@/app/page';

interface ProjectorTransitionProps {
  transitionState: TransitionState;
}

export default function ProjectorTransition({ transitionState }: ProjectorTransitionProps) {
  // Flicker starts at phase1? We can remove the flicker if the light surge is taking over.
  // Wait, the user asked for light brightening, they didn't explicitly say remove flicker. Let's keep it or remove it.
  // We'll keep the flicker for ambiance.
  const isFlickerActive = ['accel1', 'accel2', 'accel3', 'flash', 'intro'].includes(transitionState);
  
  // Flash starts at 1800ms and runs for 500ms
  const isFlashActive = ['flash', 'reverseFlash', 'reverseFlashHero'].includes(transitionState);

  return (
    <>
      {/* Highest z-index flicker overlay */}
      <div 
        className={`${styles.flickerOverlay} ${isFlickerActive ? styles.flickerActive : ''}`} 
        aria-hidden="true"
      />

      {/* Cinematic Flash (originates from EXACT reel position) */}
      {isFlashActive && (
        <>
          <div 
            className={`${styles.flashWhiteout} ${styles.flashWhiteoutActive}`} 
            aria-hidden="true"
          />
          <div 
            className={`${styles.cinematicFlash} ${styles.cinematicFlashActive}`} 
            aria-hidden="true"
          />
        </>
      )}
    </>
  );
}
