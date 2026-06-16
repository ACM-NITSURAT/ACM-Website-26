import React, { RefObject } from 'react';
import styles from './WireframeArtifacts.module.css';

interface WireframeArtifactsProps {
  bgRef: RefObject<HTMLDivElement | null>;
}

export default function WireframeArtifacts({ bgRef }: WireframeArtifactsProps) {
  return (
    <div className={styles.container} aria-hidden="true">
      {/* Wrapper controlled by JS for scroll parallax and opacity */}
      <div ref={bgRef} className={styles.parallaxWrapper}>
        {/* SVG controlled by CSS for ambient continuous drift */}
        <svg className={styles.wireframeSvg} width="100%" height="100%">
          <defs>
            <pattern id="technical-grid" width="120" height="120" patternUnits="userSpaceOnUse">
              {/* Minor Grid Lines (1/4 subdivisions) */}
              <path d="M30,0 L30,120 M60,0 L60,120 M90,0 L90,120" stroke="rgba(110,181,240,0.15)" strokeWidth="0.5" />
              <path d="M0,30 L120,30 M0,60 L120,60 M0,90 L120,90" stroke="rgba(110,181,240,0.15)" strokeWidth="0.5" />
              
              {/* Major Grid Lines */}
              <path d="M0,0 L0,120 M0,0 L120,0" stroke="rgba(110,181,240,0.4)" strokeWidth="1" />
              
              {/* Intersection Crosshairs / Alignment Marks */}
              <path d="M-4,0 L4,0 M0,-4 L0,4" stroke="rgba(255,100,50,0.8)" strokeWidth="1.5" />
              <path d="M116,120 L124,120 M120,116 L120,124" stroke="rgba(255,100,50,0.8)" strokeWidth="1.5" />
              
              {/* Occasional technical markings (only on some tiles) */}
              <circle cx="60" cy="60" r="2" fill="rgba(110,181,240,0.3)" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#technical-grid)" />
        </svg>
      </div>
    </div>
  );
}
