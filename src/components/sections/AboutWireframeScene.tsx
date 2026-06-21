'use client';

import React, { useEffect, useRef } from 'react';
import styles from './AboutSection.module.css';

/* ============================================================
   AboutWireframeScene
   
   A scroll-reactive 2D wireframe background system.
   Highly detailed, isometric technical blueprints.
   ============================================================ */

export default function AboutWireframeScene() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Wireframe refs
  const s1Ref = useRef<HTMLDivElement>(null);
  const s2Ref = useRef<HTMLDivElement>(null);
  const s3Ref = useRef<HTMLDivElement>(null);
  const s4Ref = useRef<HTMLDivElement>(null);
  const s5Ref = useRef<HTMLDivElement>(null);
  const s6Ref = useRef<HTMLDivElement>(null);
  const s7Ref = useRef<HTMLDivElement>(null);
  const s8Ref = useRef<HTMLDivElement>(null);

  // Typography refs
  const text1Ref = useRef<HTMLDivElement>(null);
  const text2Ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let animationFrameId: number;

    const updateScene = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const windowHeight = window.innerHeight;

      const totalScrollDistance = rect.height + windowHeight;
      const currentScroll = windowHeight - rect.top;

      let rawProgress = currentScroll / totalScrollDistance;
      const progress = Math.min(Math.max(rawProgress, 0), 1);

      // Helper function to calculate state for each structure
      const calculateState = (
        start: number,
        end: number,
        startXOffset: number,
        scaleStart: number,
        rotateMultiplier: number,
        baseOpacity: number,
        peakOpacity: number
      ) => {
        let p = 0;
        if (progress > end) {
          p = 1;
        } else if (progress > start) {
          p = (progress - start) / (end - start);
        }

        const translateX = startXOffset * (1 - p);
        const scale = scaleStart + ((1 - scaleStart) * p);
        const rotate = progress * rotateMultiplier;

        let opacity = baseOpacity;
        if (progress >= start && progress <= end) {
          opacity = baseOpacity + ((peakOpacity - baseOpacity) * p);
        } else if (progress > end) {
          const fadeOutEnd = end + 0.2;
          if (progress < fadeOutEnd) {
            const fadeP = (progress - end) / 0.2;
            opacity = peakOpacity - ((peakOpacity - baseOpacity) * fadeP);
          } else {
            opacity = baseOpacity;
          }
        }
        return { translateX, scale, rotate, opacity };
      };

      // --- Structure 1: Cube/Server (0.05 to 0.30) ---
      if (s1Ref.current) {
        const { translateX, scale, rotate, opacity } = calculateState(0.05, 0.30, -300, 0.85, 45, 0.2, 0.8);
        s1Ref.current.style.transform = `translateX(${translateX}px) scale(${scale}) rotate(${rotate}deg)`;
        s1Ref.current.style.opacity = opacity.toString();
      }

      // --- Structure 2: Radar/Ring (0.25 to 0.55) ---
      if (s2Ref.current) {
        const { translateX, scale, rotate, opacity } = calculateState(0.25, 0.55, 300, 0.85, -30, 0.2, 0.8);
        s2Ref.current.style.transform = `translateX(${translateX}px) scale(${scale}) rotate(${rotate}deg)`;
        s2Ref.current.style.opacity = opacity.toString();
      }

      // --- Structure 3: Scaffolding Tower (0.50 to 0.80) ---
      if (s3Ref.current) {
        const { translateX, scale, rotate, opacity } = calculateState(0.50, 0.80, 0, 0.9, 20, 0.2, 0.8); // Center, no X translation, just scale/rotate
        s3Ref.current.style.transform = `translateY(${translateX}px) scale(${scale}) rotate(${rotate}deg)`;
        s3Ref.current.style.opacity = opacity.toString();
      }

      // --- Structure 4: Geometric Solid (0.75 to 1.0) ---
      if (s4Ref.current) {
        const { translateX, scale, rotate, opacity } = calculateState(0.75, 1.0, -200, 0.85, 60, 0.2, 0.8);
        s4Ref.current.style.transform = `translateX(${translateX}px) scale(${scale}) rotate(${rotate}deg)`;
        s4Ref.current.style.opacity = opacity.toString();
      }

      // --- Structure 5: Quantum Processor Die (0.05 to 0.35) ---
      if (s5Ref.current) {
        const { translateX, scale, rotate, opacity } = calculateState(0.05, 0.35, 200, 0.85, -20, 0.2, 0.8);
        s5Ref.current.style.transform = `translateY(${translateX}px) scale(${scale}) rotate(${rotate}deg)`;
        s5Ref.current.style.opacity = opacity.toString();
      }

      // --- Structure 6: Data Node Hub (0.30 to 0.60) ---
      if (s6Ref.current) {
        const { translateX, scale, rotate, opacity } = calculateState(0.30, 0.60, -200, 0.85, 30, 0.2, 0.8);
        s6Ref.current.style.transform = `translateX(${translateX}px) scale(${scale}) rotate(${rotate}deg)`;
        s6Ref.current.style.opacity = opacity.toString();
      }

      // --- Structure 7: Architectural Mesh (0.60 to 0.90) ---
      if (s7Ref.current) {
        const { translateX, scale, rotate, opacity } = calculateState(0.60, 0.90, 250, 0.85, -15, 0.2, 0.8);
        s7Ref.current.style.transform = `translateX(${translateX}px) scale(${scale}) rotate(${rotate}deg)`;
        s7Ref.current.style.opacity = opacity.toString();
      }

      // --- Structure 8: Magnetic Torus (0.70 to 1.00) ---
      if (s8Ref.current) {
        const { translateX, scale, rotate, opacity } = calculateState(0.70, 1.00, -150, 0.85, 45, 0.2, 0.8);
        s8Ref.current.style.transform = `translateY(${translateX}px) scale(${scale}) rotate(${rotate}deg)`;
        s8Ref.current.style.opacity = opacity.toString();
      }

      // --- Parallax Typography ---
      // Drifts upwards at a different speed than the normal scroll
      if (text1Ref.current) {
        const y = -50 + (progress * 150);
        text1Ref.current.style.transform = `translateY(${y}px)`;
      }
      if (text2Ref.current) {
        const y = -50 + (progress * 150);
        text2Ref.current.style.transform = `translateY(${y}px)`;
      }
    };

    const onScroll = () => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(updateScene);
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    updateScene();

    return () => {
      window.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Shared highly visible technical stroke color
  const primaryStroke = "rgba(37,99,235,0.35)";
  const secondaryStroke = "rgba(37,99,235,0.15)";
  const textFill = "rgba(37,99,235,0.4)";

  return (
    <div ref={containerRef} className={styles.wireframeSceneContainer} aria-hidden="true">

      {/* ==========================================
          PARALLAX TYPOGRAPHY
          ========================================== */}
      <div
        ref={text1Ref}
        className={styles.bgTypography}
        style={{ top: '38%', right: '5%' }}
      >
        LEGACY
      </div>

      <div
        ref={text2Ref}
        className={styles.bgTypography}
        style={{ top: '55%', left: '5%' }}
      >
        COMMUNITY
      </div>

    </div>
  );
}
