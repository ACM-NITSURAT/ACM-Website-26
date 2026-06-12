'use client';

import React, { forwardRef } from 'react';
import styles from './CinemaLoader.module.css';

/* ============================================================
   ProjectorLight — Detailed Projector + Visible Light Beam
   
   The projector is a recognizable machine at the top of the
   screen. It has a body, a glowing lens, and visible light
   rays extending down to the projection area.
   
   Elements:
   1. Projector body — recognizable silhouette with housing
   2. Projector lens — glowing concentric circles
   3. Lens flare — bright emission point
   4. Light beam — visible cone of light from lens to center
   5. Beam rays — volumetric light lines inside the beam
   6. Ambient wash — wide atmospheric warmth
   7. Projection circle — illuminated "screen" area
   8. Center hotspot — bright center
   ============================================================ */

interface ProjectorLightProps {
  className?: string;
}

export interface ProjectorLightRefs {
  body: HTMLDivElement | null;
  lens: HTMLDivElement | null;
  beam: HTMLDivElement | null;
  beamRays: HTMLDivElement | null;
  ambient: HTMLDivElement | null;
  projection: HTMLDivElement | null;
  hotspot: HTMLDivElement | null;
}

const ProjectorLight = forwardRef<ProjectorLightRefs, ProjectorLightProps>(
  ({ className }, ref) => {
    const bodyRef = React.useRef<HTMLDivElement>(null);
    const lensRef = React.useRef<HTMLDivElement>(null);
    const beamRef = React.useRef<HTMLDivElement>(null);
    const beamRaysRef = React.useRef<HTMLDivElement>(null);
    const ambientRef = React.useRef<HTMLDivElement>(null);
    const projectionRef = React.useRef<HTMLDivElement>(null);
    const hotspotRef = React.useRef<HTMLDivElement>(null);

    React.useImperativeHandle(ref, () => ({
      get body() { return bodyRef.current; },
      get lens() { return lensRef.current; },
      get beam() { return beamRef.current; },
      get beamRays() { return beamRaysRef.current; },
      get ambient() { return ambientRef.current; },
      get projection() { return projectionRef.current; },
      get hotspot() { return hotspotRef.current; },
    }));

    return (
      <div className={`${styles.projectorContainer} ${className || ''}`} aria-hidden="true">
        {/* Projector body — rectangular housing with rounded edges */}
        <div ref={bodyRef} className={styles.projectorBody}>
          {/* Film reels */}
          <div className={styles.projectorReels}>
            <div className={styles.reel} />
            <div className={styles.reel} />
          </div>

          {/* Housing shape */}
          <div className={styles.projectorHousing}>
            {/* Ventilation slits */}
            <div className={styles.ventSlits}>
              <span /><span /><span />
            </div>
          </div>

          {/* Lens assembly — concentric rings */}
          <div ref={lensRef} className={styles.projectorLens}>
            <div className={styles.lensOuter} />
            <div className={styles.lensMiddle} />
            <div className={styles.lensInner} />
            <div className={styles.lensFlare} />
          </div>
        </div>

        {/* Light beam — visible cone from projector to center */}
        <div className={styles.beamBlurWrapper}>
          <div ref={beamRef} className={styles.lightBeam}>
            {/* Volumetric rays inside the beam */}
            <div ref={beamRaysRef} className={styles.beamRays}>
              <div className={styles.beamRay} style={{ left: '30%', opacity: 0.3 }} />
              <div className={styles.beamRay} style={{ left: '45%', opacity: 0.5 }} />
              <div className={styles.beamRay} style={{ left: '50%', opacity: 0.6 }} />
              <div className={styles.beamRay} style={{ left: '55%', opacity: 0.5 }} />
              <div className={styles.beamRay} style={{ left: '70%', opacity: 0.3 }} />
            </div>
          </div>
        </div>

        {/* Ambient wash */}
        <div ref={ambientRef} className={styles.lightAmbient} />

        {/* Projection circle */}
        <div ref={projectionRef} className={styles.lightProjection} />

        {/* Center hotspot */}
        <div ref={hotspotRef} className={styles.lightHotspot} />
      </div>
    );
  }
);

ProjectorLight.displayName = 'ProjectorLight';

export default ProjectorLight;
