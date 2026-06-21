'use client';

import { useState, useRef, useEffect } from "react";
import CinemaLoader from "@/components/loading/CinemaLoader";
import HeroSection from "@/components/sections/HeroSection";
import AboutSection from "@/components/sections/AboutSection";
import ProjectorTransition from "@/components/transitions/ProjectorTransition";
import WalkThroughReel from "@/components/sections/WalkThroughReel";
import { playAccelerationWhir, playLightFlash } from "@/components/loading/ProjectorAudio";

export type TransitionState = 'idle' | 'accel1' | 'accel2' | 'accel3' | 'flash' | 'intro' | 'reverseFlash' | 'reverseFlashHero';

export default function Home() {
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');
  const [isTransitioning, setIsTransitioning] = useState(false);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  // Keep track of latest state for the event listener without causing re-renders
  const stateRef = useRef(transitionState);
  stateRef.current = transitionState;
  const isTransitioningRef = useRef(isTransitioning);
  isTransitioningRef.current = isTransitioning;

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(clearTimeout);
    };
  }, []);

  const handleExploreClick = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setTransitionState('accel1'); // 0ms - 600ms
    playAccelerationWhir(1.8);

    timersRef.current.push(setTimeout(() => {
      setTransitionState('accel2'); // 600ms - 1200ms
    }, 600));

    timersRef.current.push(setTimeout(() => {
      setTransitionState('accel3'); // 1200ms - 1800ms
    }, 1200));

    // Phase 4: The Swap (1800ms)
    timersRef.current.push(setTimeout(() => {
      // Get exact coordinates of the reel hub
      const hub = document.querySelector('[data-reel-hub]');
      if (hub) {
        const rect = hub.getBoundingClientRect();
        const ox = rect.left + rect.width / 2;
        const oy = rect.top + rect.height / 2;
        document.documentElement.style.setProperty('--ox', `${ox}px`);
        document.documentElement.style.setProperty('--oy', `${oy}px`);
      } else {
        // Fallback to center if not found
        document.documentElement.style.setProperty('--ox', '50vw');
        document.documentElement.style.setProperty('--oy', '50vh');
      }
      setTransitionState('flash'); // Removes Hero, triggers intro
      playLightFlash(); // Trigger delicate flash sound
    }, 1800));

    // Intro page is revealed as flash fades over 400ms (1800ms + 500ms flash = 2300ms)
    timersRef.current.push(setTimeout(() => {
      setTransitionState('intro');
      setIsTransitioning(false); 
    }, 2300));
  };

  const handleBackClick = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);

    // Start reverse flash (flash covers screen while reel is visible)
    setTransitionState('reverseFlash');

    // Peak of flash: swap DOM back to Hero (Hero remounts, reel unmounts)
    timersRef.current.push(setTimeout(() => {
      setTransitionState('reverseFlashHero');
    }, 300)); // 300ms is 60% of the 500ms flash

    // Flash ends
    timersRef.current.push(setTimeout(() => {
      setTransitionState('idle');
      setIsTransitioning(false);
    }, 500));
  };

  // Listen for global navbar routing clicks
  useEffect(() => {
    const handleNavRouteClicked = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      // const targetHref = customEvent.detail;
      
      // If we are currently in the reel experience, trigger the reverse flash first
      if (stateRef.current === 'intro') {
        if (isTransitioningRef.current) return; // Prevent concurrent transition
        
        handleBackClick();
        
        // Wait for the reverse flash to finish (500ms) before pretending to scroll
        setTimeout(() => {
          // In a full implementation, we would scroll to the section here.
          // For now, we return to hero.
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 550);
      } else {
        // If already on Hero, just scroll
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };

    window.addEventListener('nav-route-clicked', handleNavRouteClicked);
    return () => window.removeEventListener('nav-route-clicked', handleNavRouteClicked);
  }, []); // Note: handleBackClick is technically a dependency but we rely on the refs inside it to be fresh enough or we can safely omit it because the component is a singleton at the root.

  return (
    <CinemaLoader>
      <main style={{ position: 'relative', width: '100%', minHeight: '100vh', overflowX: 'hidden' }}>
        {transitionState !== 'flash' && transitionState !== 'intro' && transitionState !== 'reverseFlash' && (
          <>
            <HeroSection 
              onExploreClick={handleExploreClick} 
              isTransitioning={isTransitioning}
              transitionState={transitionState}
            />
            <AboutSection />
          </>
        )}
        <ProjectorTransition transitionState={transitionState} />

        {(transitionState === 'flash' || transitionState === 'intro' || transitionState === 'reverseFlash') && (
          <WalkThroughReel
            isVisible={transitionState === 'intro' || transitionState === 'reverseFlash'}
            onBack={handleBackClick}
          />
        )}
      </main>
    </CinemaLoader>
  );
}
