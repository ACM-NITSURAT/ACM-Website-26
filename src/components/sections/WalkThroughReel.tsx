'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import styles from './WalkThroughReel.module.css';
import AcmLogoSvg from '../loading/AcmLogoSvg';
import CinematicDust from './CinematicDust';
import WireframeArtifacts from './WireframeArtifacts';

interface WalkThroughReelProps {
  isVisible: boolean;
  onBack: () => void;
}

type ScrollDirection = 'down' | 'up';

const SCROLL_RANGE = 4200;
const LERP_FACTOR = 0.14;
const WHEEL_SCALE = 0.26;
const TOUCH_SCALE = 0.58;

/** Scene 1 — cinema intro */
const S1_HINT_FADE = 0.04;
const TRAILER_START = 0.075;

/** Trailer bridge — zoom out → teaser 1 → teaser 2 → scene 2 */
const TRAILER_END = 0.28;

/** Scene 2 enters as teaser 2 exits */
const SCENE2_START = 0.236;
const SCENE2_SETTLE = 0.286;
/** Scene 2 beat band ends; Scene 3 overlaps the fade-out */
const SCENE2_END = 0.48;
const SCENE3_START = 0.455;
const SCENE3_END = 0.66;
const DOTSLASH_START = 0.66;
const DOTSLASH_END = 0.88;
const SCENE4_START = 0.88;
const SCENE4_END = 1.0;

/** Scene 3 — 3D Memory */
const S3_MEMORY_FRAMES = Array.from({ length: 24 }).map((_, i) => {
  // 3 rows: 0 (top, back), 1 (middle, mid), 2 (bottom, front)
  const row = i % 3;

  // Parallax speed modifier based on row
  const speed = row === 0 ? 0.65 : row === 1 ? 1.0 : 1.35;

  // Spread horizontally, staggered. 
  // We use 38vw base spacing to prevent overlapping (since images are ~28vw wide).
  // Multiply by speed so the slower back rows are packed tighter, 
  // ensuring we see the same number of images across all rows despite different scroll speeds.
  const rowIdx = Math.floor(i / 3);
  const xOffset = 90 + (rowIdx * 38 * speed) + (Math.sin(i * 4.3) * 3); // in vw

  // Add organic vertical variation
  const yOffset = (Math.cos(i * 3.7) * 3); // in vh

  // Slight rotation
  const rot = Math.sin(i * 2.1) * 8; // -8 to 8 deg

  // Scale variation
  const scale = 0.85 + Math.abs(Math.cos(i * 5.2)) * 0.3;

  // We have 11 images to cycle through
  const imageSources = [
    '/webp/DSC_1274.webp',
    '/webp/DSC_2075.webp',
    '/webp/DSC_2136.webp',
    '/dotslash/DSC_2163 (1).webp',
    '/webp/DSC_6725.webp',
    '/dotslash/Dotslash9-team.webp',
    '/dotslash/Dotslash9-winners.webp',
    '/webp/IMG_6680 (1).webp',
    '/webp/IMG_7643.webp',
    '/webp/IMG_7691.webp',
    '/webp/WhatsAppImage2026-01-10at10.59.47.webp'
  ];
  const imageSrc = imageSources[i % imageSources.length];

  return {
    id: `mem-${i}`,
    label: `RECORD ${String(i + 1).padStart(2, '0')}`,
    row,
    xOffset,
    yOffset,
    rot,
    scale,
    speed,
    imageSrc,
  };
});

const DOTSLASH_IMAGES = [
  '/dotslash/DSC_1937_1_11zon.webp',
  '/dotslash/DSC_1942_2_11zon.webp',
  '/dotslash/DSC_2137_4_11zon.webp',
  '/dotslash/DSC_2163 (1).webp',
  '/dotslash/DSC_2222_5_11zon.webp',
  '/dotslash/DSC_2239_3_11zon.webp',
  '/dotslash/Dotslash9-team.webp',
  '/dotslash/Dotslash9-winners.webp',
];

/** Scene 4 — Mosaic convergence tiles */
const MOSAIC_IMAGES = [
  '/webp/DSC_1274.webp',
  '/webp/DSC_2075.webp',
  '/webp/DSC_2136.webp',
  '/dotslash/DSC_2163 (1).webp',
  '/webp/DSC_6725.webp',
  '/dotslash/Dotslash9-team.webp',
  '/dotslash/Dotslash9-winners.webp',
  '/webp/IMG_6680 (1).webp',
  '/webp/IMG_7643.webp',
  '/webp/IMG_7691.webp',
  '/webp/WhatsAppImage2026-01-10at10.59.47.webp',
];

const MOSAIC_TILES: any[] = [];
let idx = 0;
for (let x = -3; x <= 3; x++) {
  for (let y = -3; y <= 3; y++) {
    if (Math.abs(x) + Math.abs(y) <= 3) {
      // 3.8vw spacing, makes a ~23vw wide diamond
      const gridX = x * 3.8;
      const gridY = y * 3.8;

      const seed = idx * 7.3 + 1.1;
      const scatterX = Math.sin(seed * 1.7) * 45 + Math.cos(seed * 0.3) * 25;
      const scatterY = Math.cos(seed * 2.3) * 40 + Math.sin(seed * 0.9) * 20;
      const scatterRot = Math.sin(seed * 3.1) * 45;
      const scatterScale = 0.25 + Math.abs(Math.cos(seed * 1.5)) * 0.4;

      // Delay so outer tiles arrive slightly later, "drawing" the shape
      const distFromCenter = Math.sqrt(x * x + y * y);
      const delay = distFromCenter / 4.2;

      MOSAIC_TILES.push({
        col: x, row: y, gridX, gridY,
        scatterX, scatterY, scatterRot, scatterScale,
        delay,
        imageSrc: MOSAIC_IMAGES[idx % MOSAIC_IMAGES.length],
      });
      idx++;
    }
  }
}

const BEATS = {
  memory1: { start: 0, dur: 0.145 },
  memory2: { start: 0.145, dur: 0.145 },
  text1: { start: 0.29, dur: 0.12 },
  memory3: { start: 0.41, dur: 0.145 },
  text2: { start: 0.555, dur: 0.12 },
  finale: { start: 0.675, dur: 0.325 },
} as const;

interface BeatState {
  xVw: number;
  opacity: number;
  scale: number;
  blur: number;
  inDwell: boolean;
  t: number;
  enterT: number;
}

function getSceneFromProgress(progress: number): number {
  if (progress >= 1) return 5;
  return Math.min(5, Math.floor(progress * 5) + 1);
}

function clamp01(v: number) {
  return Math.min(1, Math.max(0, v));
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number) {
  return t * t * t;
}

/** -1 … 1 spread for symmetric row/arc items */
function s3SpreadIndex(i: number, count: number) {
  return count <= 1 ? 0 : (i / (count - 1) - 0.5) * 2;
}

function segmentT(value: number, start: number, end: number) {
  return clamp01((value - start) / (end - start));
}

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

function applyTrailerLine(
  el: HTMLElement | null,
  t: number,
  enterStart: number,
  enterEnd: number,
  exitStart: number,
  exitEnd: number
) {
  if (!el) return;

  if (t < enterStart - 0.02 || t > exitEnd + 0.02) {
    el.style.visibility = 'hidden';
    el.style.opacity = '0';
    el.style.clipPath = 'inset(50% 50% 50% 50%)';
    return;
  }

  el.style.visibility = 'visible';
  let scale = 1;
  let y = 0;
  let clip = 100;
  let opacity = 1;

  if (t < enterStart) {
    const p = segmentT(t, enterStart - 0.02, enterStart);
    opacity = p;
    scale = 0.88;
    clip = 0;
  } else if (t < enterEnd) {
    const p = segmentT(t, enterStart, enterEnd);
    const e = easeOutCubic(p);
    scale = 0.72 + e * 0.28;
    y = 48 * (1 - e);
    clip = e * 100;
    opacity = 1;
  } else if (t > exitEnd) {
    const p = segmentT(t, exitEnd, exitEnd + 0.02);
    opacity = 1 - p;
    scale = 1.4;
    y = -72;
    clip = 0;
  } else if (t > exitStart) {
    const p = segmentT(t, exitStart, exitEnd);
    const e = easeInCubic(p);
    scale = 1 + e * 0.4;
    y = -72 * e;
    clip = 100 - e * 100;
    opacity = 1 - e * 0.15;
  }

  const inset = (100 - clip) / 2;
  el.style.opacity = String(opacity);
  el.style.transform = `translate(-50%, -50%) translateY(${y}px) scale(${scale})`;
  el.style.clipPath = `inset(${inset}% ${inset}% ${inset}% ${inset}%)`;
}

function beatT(scene2Progress: number, start: number, dur: number) {
  return clamp01((scene2Progress - start) / dur);
}

/** Soft focus Z-axis push */
function getBeatState(t: number): BeatState {
  const ENTER = 0.12;
  const DWELL = 0.78;

  if (t <= 0) return { xVw: 0, opacity: 0, scale: 1.12, blur: 12, inDwell: false, t, enterT: 0 };

  if (t < ENTER) {
    const p = t / ENTER;
    const e = easeOutCubic(p);
    return { xVw: 0, opacity: e, scale: 1.12 - e * 0.12, blur: 12 * (1 - e), inDwell: false, t, enterT: p };
  }

  if (t < DWELL) {
    return { xVw: 0, opacity: 1, scale: 1, blur: 0, inDwell: true, t, enterT: 1 };
  }

  if (t < 1) {
    const p = (t - DWELL) / (1 - DWELL);
    const e = easeInCubic(p);
    return { xVw: 0, opacity: 1 - e * 0.95, scale: 1 + e * 0.04, blur: e * 6, inDwell: false, t, enterT: 1 };
  }

  return { xVw: 0, opacity: 0, scale: 1.04, blur: 6, inDwell: false, t, enterT: 1 };
}

function applyBeat(
  el: HTMLElement | null,
  scene2Progress: number,
  start: number,
  dur: number,
  rotateDeg = 0,
  yPct = -50
): BeatState {
  const state = getBeatState(beatT(scene2Progress, start, dur));
  if (!el) return state;

  el.style.opacity = String(state.opacity);
  el.style.transform = `translate3d(-50%, ${yPct}%, 0) rotate(${rotateDeg}deg) scale(${state.scale})`;
  // Apply the blur only if we are using the new cinematic push
  el.style.filter = `blur(${state.blur}px)`;
  el.style.visibility = state.opacity > 0.01 ? 'visible' : 'hidden';

  return state;
}

function lockBody() {
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.width = '100%';
  document.body.style.top = '0';
}

function toggleDwellClass(
  el: HTMLElement | null,
  activeRef: { current: boolean },
  inDwell: boolean,
  className: string
) {
  if (!el || inDwell === activeRef.current) return;
  activeRef.current = inDwell;
  el.classList.toggle(className, inDwell);
}

function unlockBody() {
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.width = '';
  document.body.style.top = '';
}

/* P6: Color temperature stops — each is [r, g, b] keyed to progress ranges.
   Colors interpolated linearly between adjacent stops in RAF loop. */
const COLOR_STOPS: [number, [number, number, number]][] = [
  [0, [2, 1, 4]],       // #020104 — Cinema darkness
  [0.075, [6, 5, 10]],      // #06050a — Projector warming start
  [0.28, [8, 6, 16]],      // #080610 — Projector warming end
  [0.35, [6, 10, 24]],     // #060a18 — Cold digital entering Scene 2
  [0.36, [6, 13, 26]],     // #060d1a — memory1: night working blue
  [0.40, [6, 4, 26]],      // #06041a — memory2: competition purple (per feedback, more distinct)
  [0.46, [5, 14, 18]],     // Scene 2 finale
  [0.455, [1, 1, 3]],       // Scene 3 void
  [0.48, [2, 1, 4]],       // Darkness handoff
  [0.54, [4, 8, 22]],      // Giant 500 / constellation
  [0.62, [6, 12, 28]],     // Convergence glow
  [0.68, [8, 10, 24]],     // Punchline emergence
  [0.72, [3, 5, 14]],      // Scene 3 settle
  [1.0, [2, 1, 4]],
];

function getColorAtProgress(progress: number): [number, number, number] {
  // Find surrounding stops
  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const [p0, c0] = COLOR_STOPS[i];
    const [p1, c1] = COLOR_STOPS[i + 1];
    if (progress >= p0 && progress <= p1) {
      const t = (progress - p0) / (p1 - p0);
      return [
        Math.round(c0[0] + (c1[0] - c0[0]) * t),
        Math.round(c0[1] + (c1[1] - c0[1]) * t),
        Math.round(c0[2] + (c1[2] - c0[2]) * t),
      ];
    }
  }
  return COLOR_STOPS[COLOR_STOPS.length - 1][1];
}

export default function WalkThroughReel({ isVisible, onBack }: WalkThroughReelProps) {
  const stickyRef = useRef<HTMLDivElement>(null);
  const scene1Ref = useRef<HTMLDivElement>(null);
  const scrollHintRef = useRef<HTMLDivElement>(null);
  const projectorBeamRef = useRef<HTMLDivElement>(null);
  const hallCameraRef = useRef<HTMLDivElement>(null);
  const theatreRoomRef = useRef<HTMLDivElement>(null);
  const hallCeilingRef = useRef<HTMLDivElement>(null);
  const hallBackWallRef = useRef<HTMLDivElement>(null);
  const hallWallLeftRef = useRef<HTMLDivElement>(null);
  const hallWallRightRef = useRef<HTMLDivElement>(null);
  const hallFloorRef = useRef<HTMLDivElement>(null);
  const projectorBoothRef = useRef<HTMLDivElement>(null);
  const cinemaSeatsRef = useRef<HTMLDivElement>(null);
  const theatreScreenRef = useRef<HTMLDivElement>(null);
  const trailerRef = useRef<HTMLDivElement>(null);
  const trailerLetterboxTopRef = useRef<HTMLDivElement>(null);
  const trailerLetterboxBottomRef = useRef<HTMLDivElement>(null);
  const trailerTeaser1Ref = useRef<HTMLParagraphElement>(null);
  const trailerTeaser2Ref = useRef<HTMLParagraphElement>(null);
  const trailerGrainRef = useRef<HTMLDivElement>(null);
  const trailerSpeedRef = useRef<HTMLDivElement>(null);
  const scene2Ref = useRef<HTMLDivElement>(null);
  const bgParallaxRef = useRef<HTMLDivElement>(null);
  const bgImage1Ref = useRef<HTMLDivElement>(null);
  const bgImage2Ref = useRef<HTMLDivElement>(null);
  const bgImage3Ref = useRef<HTMLDivElement>(null);
  const ghost72Ref = useRef<HTMLDivElement>(null);
  const memory1Ref = useRef<HTMLDivElement>(null);
  const memory2Ref = useRef<HTMLDivElement>(null);
  const memory3Ref = useRef<HTMLDivElement>(null);
  const memory3EchoRef = useRef<HTMLDivElement>(null);
  const text1Ref = useRef<HTMLDivElement>(null);
  const text2Ref = useRef<HTMLDivElement>(null);
  const finaleRef = useRef<HTMLDivElement>(null);
  const finaleRuleRef = useRef<HTMLDivElement>(null);
  const finaleCapturedRef = useRef<HTMLDivElement>(null);
  const finaleHintRef = useRef<HTMLDivElement>(null);
  const mem1CaptionBarRef = useRef<HTMLDivElement>(null);
  const mem2CaptionBarRef = useRef<HTMLDivElement>(null);
  const mem3CaptionBarRef = useRef<HTMLDivElement>(null);
  const text1LineRef = useRef<HTMLParagraphElement>(null);
  const text2LineRef = useRef<HTMLParagraphElement>(null);
  const rippleRefs = useRef<(HTMLDivElement | null)[]>([]);

  const scene3Ref = useRef<HTMLDivElement>(null);
  const scene3DarkRef = useRef<HTMLDivElement>(null);
  const scene3OpenRef = useRef<HTMLParagraphElement>(null);
  const scene3NumInlineRef = useRef<HTMLSpanElement>(null);
  const scene3OpenRestRef = useRef<HTMLSpanElement>(null);
  const scene3GiantNumRef = useRef<HTMLDivElement>(null);
  const scene3Mid1Ref = useRef<HTMLDivElement>(null);
  const scene3Mid2Ref = useRef<HTMLDivElement>(null);
  const memoryStripRef = useRef<HTMLDivElement>(null);
  const row0Ref = useRef<HTMLDivElement>(null);
  const row1Ref = useRef<HTMLDivElement>(null);
  const row2Ref = useRef<HTMLDivElement>(null);
  const scene3PunchRef = useRef<HTMLDivElement>(null);
  const scene3PunchlineRef = useRef<HTMLParagraphElement>(null);
  const scene3Sub1Ref = useRef<HTMLParagraphElement>(null);
  const scene3Sub2Ref = useRef<HTMLParagraphElement>(null);
  const scene3HintRef = useRef<HTMLParagraphElement>(null);

  /* Refs for Dotslash Scene */
  const dotslashRef = useRef<HTMLDivElement>(null);
  const dotslashTeaserRef = useRef<HTMLDivElement>(null);
  const dotslashHeaderRef = useRef<HTMLDivElement>(null);
  const dotslashVideoContainerRef = useRef<HTMLDivElement>(null);
  const dotslashVideoRef = useRef<HTMLVideoElement>(null);
  const dotslashTitleRef = useRef<HTMLDivElement>(null);
  const dotslashSubtitleRef = useRef<HTMLDivElement>(null);
  const dotslashGalleryRef = useRef<HTMLDivElement>(null);
  const dotslashImagesRef = useRef<(HTMLDivElement | null)[]>([]);
  const dotslashHasPlayedRef = useRef<boolean>(false);

  /* P4: Refs for Scene 4 - The Mosaic */
  const scene4Ref = useRef<HTMLDivElement>(null);
  const mosaicTileRefs = useRef<(HTMLDivElement | null)[]>([]);
  const mosaicGlowRef = useRef<HTMLDivElement>(null);
  const mosaicAuraRef = useRef<HTMLDivElement>(null);
  const mosaicLogoRef = useRef<HTMLDivElement>(null);
  const mosaicHeaderRef = useRef<HTMLHeadingElement>(null);
  const mosaicIntermediateTextRef = useRef<HTMLParagraphElement>(null);
  const mosaicTagRef = useRef<HTMLParagraphElement>(null);
  const mosaicCtaRef = useRef<HTMLButtonElement>(null);

  /* Video Mute State */
  const [isDotslashMuted, setIsDotslashMuted] = useState(true);

  /* Selected Image for Overlay */
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const toggleDotslashMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDotslashMuted((prev) => {
      const nextMuted = !prev;
      if (dotslashVideoRef.current) {
        dotslashVideoRef.current.muted = nextMuted;
      }
      return nextMuted;
    });
  };

  /* P2: Refs for trailer enhancements */
  const projectorFlashRef = useRef<HTMLDivElement>(null);
  const teaserFlashedRef = useRef(false); /* P2: flag — fire flash only once */
  const arrowAnimatedRef = useRef(false); /* P2: flag — arrow slides in only once */
  const spliceRef = useRef<HTMLDivElement>(null);
  const spliceFiredRef = useRef(false); /* P2: flag — splice line fires once */

  /* P7: Global grain overlay ref */
  const grainRef = useRef<HTMLDivElement>(null);

  /* P1: Dust mote refs — max 6 elements for dust animation in RAF */
  const dustRefs = useRef<(HTMLSpanElement | null)[]>([]);

  /* P3: Play icon refs for dwell pulse toggling */
  const playIcon1Ref = useRef<HTMLSpanElement>(null);
  const playIcon2Ref = useRef<HTMLSpanElement>(null);
  const playIcon3Ref = useRef<HTMLSpanElement>(null);

  /* P8: Ref for full-bg wireframe engineering artifacts in Scene 3 */
  const wireframeBgRef = useRef<HTMLDivElement>(null);

  const rippled = useRef<Set<string>>(new Set());

  const scrollAccumulator = useRef(0);
  const displayProgress = useRef(0);
  const sceneRef = useRef(0);
  const directionRef = useRef<ScrollDirection>('down');
  const rafIdRef = useRef<number | null>(null);

  const playPulse1Ref = useRef(false);
  const playPulse2Ref = useRef(false);
  const playPulse3Ref = useRef(false);
  const mem1CaptionActiveRef = useRef(false);
  const mem2CaptionActiveRef = useRef(false);
  const mem3CaptionActiveRef = useRef(false);
  const text1ActiveRef = useRef(false);
  const text2ActiveRef = useRef(false);

  const [textEntered, setTextEntered] = useState(false);

  useEffect(() => {
    if (isVisible) setTextEntered(true);
  }, [isVisible]);

  /* P7: Hide navbar during cinematic experience */
  useEffect(() => {
    if (!isVisible) return;

    const navbar = document.querySelector('header');
    if (navbar) {
      (navbar as HTMLElement).style.opacity = '0';
      (navbar as HTMLElement).style.pointerEvents = 'none';
      (navbar as HTMLElement).style.transition = 'opacity 400ms ease';
    }

    return () => {
      if (navbar) {
        (navbar as HTMLElement).style.opacity = '';
        (navbar as HTMLElement).style.pointerEvents = '';
        // Restore after a brief delay so the reverse flash covers the transition
        setTimeout(() => {
          if (navbar) {
            (navbar as HTMLElement).style.transition = '';
          }
        }, 500);
      }
    };
  }, [isVisible]);

  useEffect(() => {
    if (!isVisible) return;

    lockBody();
    scrollAccumulator.current = 0;
    displayProgress.current = 0;
    sceneRef.current = 0;
    playPulse1Ref.current = false;
    playPulse2Ref.current = false;
    playPulse3Ref.current = false;
    mem1CaptionActiveRef.current = false;
    mem2CaptionActiveRef.current = false;
    mem3CaptionActiveRef.current = false;
    text1ActiveRef.current = false;
    text2ActiveRef.current = false;
    rippled.current = new Set();
    teaserFlashedRef.current = false; /* P2: reset flash flag */
    arrowAnimatedRef.current = false; /* P2: reset arrow flag */
    spliceFiredRef.current = false; /* P2: reset splice flag */

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const prev = scrollAccumulator.current;
      /* P5: Reverse scroll resistance — 15% reduction when scrolling up.
         Applied to accumulator delta (not displayProgress) to avoid visual discontinuity. */
      const resistance = directionRef.current === 'up' ? 0.85 : 1.0;
      scrollAccumulator.current = Math.max(
        0,
        Math.min(SCROLL_RANGE, scrollAccumulator.current + e.deltaY * WHEEL_SCALE * resistance)
      );
      if (scrollAccumulator.current > prev) directionRef.current = 'down';
      else if (scrollAccumulator.current < prev) directionRef.current = 'up';
    };

    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const prev = scrollAccumulator.current;
      const delta = touchStartY - e.touches[0].clientY;
      /* P5: Same reverse resistance for touch */
      const resistance = directionRef.current === 'up' ? 0.85 : 1.0;
      scrollAccumulator.current = Math.max(
        0,
        Math.min(SCROLL_RANGE, scrollAccumulator.current + delta * TOUCH_SCALE * resistance)
      );
      touchStartY = e.touches[0].clientY;
      if (scrollAccumulator.current > prev) directionRef.current = 'down';
      else if (scrollAccumulator.current < prev) directionRef.current = 'up';
    };

    const fireRipple = (key: string, index: number) => {
      if (rippled.current.has(key)) return;
      rippled.current.add(key);
      rippleRefs.current[index]?.classList.add(styles.rippleActive);
    };

    const tick = () => {
      const rawProgress = clamp01(scrollAccumulator.current / SCROLL_RANGE);
      const sceneLerp =
        rawProgress >= SCENE3_START ? 0.22 : rawProgress >= SCENE2_START ? 0.22 : LERP_FACTOR;

      displayProgress.current += (rawProgress - displayProgress.current) * sceneLerp;
      const progress =
        rawProgress >= SCENE3_START
          ? clamp01(displayProgress.current * 0.3 + rawProgress * 0.7)
          : rawProgress >= SCENE2_START
            ? clamp01(displayProgress.current * 0.32 + rawProgress * 0.68)
            : clamp01(displayProgress.current * 0.55 + rawProgress * 0.45);

      const trailerT =
        progress >= TRAILER_START
          ? segmentT(progress, TRAILER_START, TRAILER_END)
          : 0;
      const inTrailer = progress >= TRAILER_START && progress < SCENE2_SETTLE;
      const scene3Blend = smoothstep(SCENE3_START, SCENE3_START + 0.05, progress);
      const scene3Exit =
        progress > SCENE3_END - 0.02
          ? clamp01((progress - (SCENE3_END - 0.02)) / 0.04)
          : 0;
      const inScene3 = progress >= SCENE3_START - 0.015;
      const visualScene =
        inScene3
          ? 3
          : progress >= SCENE2_START
            ? 2
            : inTrailer && trailerT >= 0.26
              ? 0
              : 1;

      /* Continuous dolly — linear with scroll, no phase jumps */
      const dolly = smoothstep(0.012, SCENE2_SETTLE, progress);
      const teaser1Dim = inTrailer ? smoothstep(0.28, 0.44, trailerT) : 0;
      const teaser2Dim = inTrailer ? smoothstep(0.52, 0.66, trailerT) : 0;
      const scene1BehindTeaser = Math.min(0.82, teaser1Dim * 0.72 + teaser2Dim * 0.1);
      const scene1Handoff = smoothstep(SCENE2_START - 0.02, SCENE2_SETTLE, progress);
      const scene2Blend = smoothstep(SCENE2_START - 0.02, SCENE2_SETTLE, progress);

      /* P6: Color temperature — interpolated RGB from progress-keyed stops */
      if (stickyRef.current) {
        const [r, g, b] = getColorAtProgress(progress);
        stickyRef.current.style.background = `rgb(${r}, ${g}, ${b})`;
      }

      if (visualScene !== sceneRef.current) {
        sceneRef.current = visualScene;
        const label = visualScene === 0 ? 'Trailer' : visualScene;
        console.log(
          `[REEL] Scene ${label} active | progress: ${progress.toFixed(2)} | direction: ${directionRef.current}`
        );
      }

      const holdDim = smoothstep(0.55, 0.82, trailerT);
      const scene1Opacity = Math.max(0, (1 - scene1BehindTeaser) * (1 - scene1Handoff));
      const scene1Active = scene1Opacity > 0.01;

      if (scene1Active && hallCameraRef.current) {
        const camScale = 1 - dolly * 0.34;
        const camY = dolly * 4.2;
        const perspective = 1200 - dolly * 400; /* P1: 1200 → 800 — real camera pull-back */
        hallCameraRef.current.style.transform = `perspective(${perspective}px) scale(${camScale}) translateY(${camY}vh)`;
      }

      if (scene1Active && scene1Ref.current) {
        scene1Ref.current.style.transform = 'none';
        scene1Ref.current.style.filter = `brightness(${1 - holdDim * 0.3 - scene1Handoff * 0.2})`;
        scene1Ref.current.style.opacity = String(scene1Opacity);
        scene1Ref.current.style.visibility = scene1Opacity > 0.015 ? 'visible' : 'hidden';
        scene1Ref.current.style.pointerEvents =
          progress < TRAILER_START && scene1Opacity > 0.5 ? 'auto' : 'none';

        if (scrollHintRef.current) {
          const hintFade = smoothstep(0.012, 0.012 + S1_HINT_FADE, progress);
          scrollHintRef.current.style.opacity = String((1 - hintFade) * (1 - trailerT));
        }
        if (projectorBeamRef.current) {
          const beamBase = 0.58 - dolly * 0.22 - holdDim * 0.12;
          const beamTeaserFade = teaser1Dim * 0.45 + teaser2Dim * 0.15;
          projectorBeamRef.current.style.opacity = String(
            Math.max(0.06, (beamBase - beamTeaserFade) * (1 - scene1Handoff * 0.85))
          );
        }
      } else if (scene1Ref.current) {
        scene1Ref.current.style.opacity = '0';
        scene1Ref.current.style.visibility = 'hidden';
        scene1Ref.current.style.pointerEvents = 'none';
      }

      if (scene1Active && hallCeilingRef.current) {
        const baseOp = 0.5 + dolly * 0.5;
        hallCeilingRef.current.style.transform = `translateY(${-dolly * 10}vh) scale(${1 + dolly * 0.14})`;
        hallCeilingRef.current.style.opacity = String(baseOp * (1 - scene1Handoff * 0.9));
      }
      if (scene1Active && hallBackWallRef.current) {
        const baseOp = 0.38 + dolly * 0.52;
        hallBackWallRef.current.style.transform = `translateY(${-dolly * 6}vh) scale(${1 + dolly * 0.1})`;
        hallBackWallRef.current.style.opacity = String(baseOp * (1 - scene1Handoff * 0.9));
      }
      if (scene1Active && hallWallLeftRef.current) {
        const spread = dolly * 16;
        const baseOp = 0.48 + dolly * 0.52;
        hallWallLeftRef.current.style.transform = `perspective(900px) rotateY(14deg) translateX(${-spread}vw) scale(${1 + dolly * 0.22})`;
        hallWallLeftRef.current.style.opacity = String(baseOp * (1 - scene1Handoff * 0.9));
      }
      if (scene1Active && hallWallRightRef.current) {
        const spread = dolly * 16;
        const baseOp = 0.48 + dolly * 0.52;
        hallWallRightRef.current.style.transform = `perspective(900px) rotateY(-14deg) translateX(${spread}vw) scale(${1 + dolly * 0.22})`;
        hallWallRightRef.current.style.opacity = String(baseOp * (1 - scene1Handoff * 0.9));
      }
      if (scene1Active && hallFloorRef.current) {
        const baseOp = 0.42 + dolly * 0.58;
        hallFloorRef.current.style.transform = `translateY(${dolly * 14}vh) scale(${1 + dolly * 0.2})`;
        hallFloorRef.current.style.opacity = String(baseOp * (1 - scene1Handoff * 0.85));
      }
      if (scene1Active && theatreRoomRef.current) {
        theatreRoomRef.current.style.transform = `scale(${1 + dolly * 0.06})`;
        theatreRoomRef.current.style.opacity = String(1 - scene1Handoff * 0.95);
      }
      if (scene1Active && projectorBoothRef.current) {
        projectorBoothRef.current.style.transform = `translateX(-50%) translateY(${-dolly * 4}vh) scale(${1 - dolly * 0.06})`;
        projectorBoothRef.current.style.opacity = String(1 - scene1Handoff * 0.9);
      }
      if (scene1Active && cinemaSeatsRef.current) {
        const baseOp = 0.52 + dolly * 0.48;
        cinemaSeatsRef.current.style.transform = `translateX(-50%) perspective(500px) rotateX(32deg) translateY(${-dolly * 42}px) scale(${1 + dolly * 0.14})`;
        cinemaSeatsRef.current.style.opacity = String(baseOp * (1 - scene1Handoff * 0.85));
      }
      if (scene1Active && theatreScreenRef.current) {
        const screenScale = 1 - dolly * 0.1;
        const screenLift = -dolly * 2.5;
        theatreScreenRef.current.style.transform = `translateX(-50%) rotateX(5deg) scale(${screenScale}) translateY(${screenLift}vh)`;
      }

      if (scene1Active && progress < TRAILER_END) {
        const now = Date.now();
        dustRefs.current.forEach((el, i) => {
          if (!el) return;
          const hDrift = Math.sin(now / 800 + i * 1.3) * 3;
          const vDrift = (now / 80 + i * 400) % 60;
          el.style.transform = `translate(${hDrift}px, ${vDrift}px)`;
          el.style.opacity = String(0.3 + Math.sin(now / 600 + i * 2) * 0.4);
        });
      }

      /* --- Dotslash Flagship Event --- */
      const inDotslash = progress >= DOTSLASH_START - 0.05 && progress <= DOTSLASH_END + 0.05;

      if (dotslashRef.current) {
        dotslashRef.current.style.visibility = inDotslash ? 'visible' : 'hidden';
        const dsAlpha = inDotslash ? smoothstep(DOTSLASH_START - 0.05, DOTSLASH_START + 0.02, progress) * (1 - smoothstep(DOTSLASH_END - 0.02, DOTSLASH_END + 0.05, progress)) : 0;
        dotslashRef.current.style.opacity = String(dsAlpha);
      }

      if (inDotslash) {
        const dsProgress = clamp01((progress - DOTSLASH_START) / (DOTSLASH_END - DOTSLASH_START));

        // Teaser text before roll up (0 - 0.10)
        const teaserIn = smoothstep(0.0, 0.04, dsProgress);
        const teaserOut = smoothstep(0.06, 0.10, dsProgress);
        if (dotslashTeaserRef.current) {
          dotslashTeaserRef.current.style.opacity = String(teaserIn * (1 - teaserOut));
          // Cinematic "fly through" the text: scale up dramatically and blur as it fades out
          const teaserScale = 1 + teaserIn * 0.05 + Math.pow(teaserOut, 2) * 5;
          dotslashTeaserRef.current.style.transform = `translate(-50%, -50%) scale(${teaserScale})`;
          dotslashTeaserRef.current.style.filter = `blur(${teaserOut * 20}px)`;
        }

        // Phase 1: Roll Up (0.10 - 0.20)
        const screenScaleIn = smoothstep(0.10, 0.20, dsProgress);
        const videoScale = 0.85 + screenScaleIn * 0.15;
        const rollUpY = (1 - screenScaleIn) * 80;

        // Phase 2: Projector Ignition (0.25 - 0.35)
        const videoProjectionIn = smoothstep(0.25, 0.35, dsProgress);

        // Video Reset Logic
        if (dotslashVideoRef.current) {
          // Play ONLY after the projection has flashed and faded in fully (dsProgress > 0.35)
          if (dsProgress > 0.35 && !dotslashHasPlayedRef.current) {
            dotslashVideoRef.current.currentTime = 0;
            dotslashVideoRef.current.play().catch(() => { });
            dotslashHasPlayedRef.current = true;
          } else if (dsProgress <= 0.35 && dotslashHasPlayedRef.current) {
            dotslashHasPlayedRef.current = false;
            dotslashVideoRef.current.pause();
            dotslashVideoRef.current.currentTime = 0;
          }
          dotslashVideoRef.current.style.opacity = String(videoProjectionIn * 0.95);
          // Stronger flash
          const flash = videoProjectionIn > 0 && videoProjectionIn < 1 ? Math.sin(videoProjectionIn * Math.PI) * 3 : 0;
          dotslashVideoRef.current.style.filter = `brightness(${1 + flash})`;
        }

        // Phase 3: Title Reveal (0.40 - 0.55)
        const titleIn = smoothstep(0.40, 0.55, dsProgress);
        if (dotslashTitleRef.current) {
          dotslashTitleRef.current.style.opacity = String(titleIn);
          dotslashTitleRef.current.style.transform = `translateY(${(1 - titleIn) * 20}px)`;
        }

        // Phase 4: Scroll Up & Gallery Reveal (0.60 - 1.0)
        const scrollUpT = smoothstep(0.60, 1.0, dsProgress);

        // Header moves up out of view at the same speed as the gallery to prevent overlap
        if (dotslashHeaderRef.current) {
          const headerY = rollUpY - (scrollUpT * 200); // from rollUpY down to -200vh
          dotslashHeaderRef.current.style.transform = `translateY(${headerY}vh)`;

          if (dotslashVideoContainerRef.current) {
            // Container scaling without translate(-50%, -50%) because we use flexbox now
            dotslashVideoContainerRef.current.style.transform = `scale(${videoScale})`;
            dotslashVideoContainerRef.current.style.opacity = String(screenScaleIn);
          }
        }

        // Gallery moves up from below into view and scrolls through
        if (dotslashGalleryRef.current) {
          // Starts at 100vh (below screen) and moves up 200vh (to -100vh) to scroll through all 8 images
          const galleryY = 100 - (scrollUpT * 200);
          dotslashGalleryRef.current.style.transform = `translateY(${galleryY}vh)`;
          dotslashGalleryRef.current.style.opacity = String(smoothstep(0.60, 0.65, dsProgress));
        }

        // Slight parallax for gallery images as user scrolls through them
        for (let i = 0; i < DOTSLASH_IMAGES.length; i++) {
          const el = dotslashImagesRef.current[i];
          if (!el) continue;
          const parallax = (0.5 - dsProgress) * 30 * (i % 2 === 0 ? 1 : -0.5);
          el.style.transform = `translateY(${parallax}px)`;
        }
      }

      /* --- Scene 4: The Mosaic --- */
      const inScene4 = progress >= SCENE4_START - 0.05 && progress <= SCENE4_END + 0.05;

      if (scene4Ref.current) {
        scene4Ref.current.style.visibility = inScene4 ? 'visible' : 'hidden';
        // Fade in the background smoothly
        const s4BgAlpha = inScene4 ? smoothstep(SCENE4_START - 0.05, SCENE4_START + 0.05, progress) : 0;
        scene4Ref.current.style.opacity = String(s4BgAlpha);
      }

      if (inScene4) {
        const s4 = clamp01((progress - SCENE4_START) / (SCENE4_END - SCENE4_START));

        // Phase 1: Converge (0 → 0.45)
        // Phase 2: Form Diamond + crossfade to Logo (0.45 → 0.65)
        // Phase 3: Logo hold (0.65 → 0.85)

        const convergeT = smoothstep(0.0, 0.45, s4);
        const dissolveT = smoothstep(0.45, 0.65, s4);
        const logoIn = smoothstep(0.50, 0.65, s4);
        // Delay the aura to ignite only after the logo is revealed
        const auraIn = smoothstep(0.65, 0.75, s4);
        const pulseT = s4 >= 0.40 && s4 <= 0.60 ? Math.sin((s4 - 0.40) / 0.20 * Math.PI) : 0;

        // Mosaic tiles
        for (let i = 0; i < MOSAIC_TILES.length; i++) {
          const el = mosaicTileRefs.current[i];
          if (!el) continue;
          const tile = MOSAIC_TILES[i];

          // Staggered convergence
          const staggeredT = clamp01((convergeT - tile.delay * 0.2) / (1 - tile.delay * 0.2));
          const ease = 1 - Math.pow(1 - staggeredT, 3); // easeOutCubic

          // Interpolate scatter → grid
          const x = tile.scatterX * (1 - ease) + tile.gridX * ease;
          const y = tile.scatterY * (1 - ease) + tile.gridY * ease;

          const rot = tile.scatterRot * (1 - ease);

          // When forming the diamond, scale down to target Grid scale
          const targetGridScale = 0.26;
          // Animate the tiles shrinking into the logo stroke as they dissolve
          const scale = (tile.scatterScale * (1 - ease) + targetGridScale * ease) * (1 - dissolveT * 0.8);

          const opacity = ease * (1 - dissolveT);

          el.style.transform = `translate(${x}vw, ${y}vw) rotate(${rot}deg) scale(${scale})`;

          // Flash blue/white as they dissolve
          el.style.filter = `brightness(${1 + dissolveT * 2}) sepia(${dissolveT}) hue-rotate(180deg) saturate(${1 + dissolveT * 2})`;

          el.style.opacity = String(opacity);
          el.style.visibility = opacity > 0.01 ? 'visible' : 'hidden';
        }

        // Glow pulse behind mosaic
        if (mosaicGlowRef.current) {
          const glowOp = convergeT * 0.4 + pulseT * 0.5;
          mosaicGlowRef.current.style.opacity = String(glowOp * (1 - dissolveT));
          const glowScale = 0.8 + convergeT * 0.4 + pulseT * 0.2;
          mosaicGlowRef.current.style.transform = `translate(-50%, -50%) scale(${glowScale})`;
        }

        // Logo reveal
        if (mosaicLogoRef.current) {
          mosaicLogoRef.current.style.opacity = String(logoIn);
          // A subtle "lock in" pop animation
          const logoScale = 0.95 + logoIn * 0.05;
          mosaicLogoRef.current.style.transform = `translate(-50%, -50%) scale(${logoScale})`;
          mosaicLogoRef.current.style.visibility = logoIn > 0.01 ? 'visible' : 'hidden';
        }

        // Intense background aura reveal
        if (mosaicAuraRef.current) {
          mosaicAuraRef.current.style.opacity = String(auraIn);
          mosaicAuraRef.current.style.visibility = auraIn > 0.01 ? 'visible' : 'hidden';
        }

        // Intermediate Text (appears while photos form diamond)
        if (mosaicIntermediateTextRef.current) {
          const interIn = smoothstep(0.35, 0.45, s4);
          const interOut = smoothstep(0.50, 0.60, s4); // Fades out as the real logo comes in
          mosaicIntermediateTextRef.current.style.opacity = String(interIn * (1 - interOut));
          mosaicIntermediateTextRef.current.style.transform = `translate(-50%, -50%) scale(${0.95 + interIn * 0.05})`;
        }

        // Tagline appears AFTER the logo reveal
        if (mosaicTagRef.current) {
          const tagIn = smoothstep(0.75, 0.85, s4);
          mosaicTagRef.current.style.opacity = String(tagIn);
          mosaicTagRef.current.style.transform = `translateY(${(1 - tagIn) * 30}px)`;
        }

        // Header appears with the tagline
        if (mosaicHeaderRef.current) {
          const headerIn = smoothstep(0.70, 0.80, s4);
          mosaicHeaderRef.current.style.opacity = String(headerIn);
          mosaicHeaderRef.current.style.transform = `translate(-50%, ${(1 - headerIn) * -30}px)`;
        }

        // CTA follows slightly after
        if (mosaicCtaRef.current) {
          const ctaIn = smoothstep(0.80, 0.90, s4);
          mosaicCtaRef.current.style.opacity = String(ctaIn);
          mosaicCtaRef.current.style.transform = `translateY(${(1 - ctaIn) * 30}px)`;
          mosaicCtaRef.current.style.pointerEvents = ctaIn > 0.5 ? 'auto' : 'none';
        }
      }

      /* --- Trailer copy — opacity driven, no hard cuts --- */
      if (trailerRef.current) {
        const trailerIn = smoothstep(0.26, 0.34, trailerT);
        const trailerOut = 1 - smoothstep(SCENE2_START, SCENE2_SETTLE, progress);
        const trailerOp = trailerIn * trailerOut;
        trailerRef.current.style.opacity = String(trailerOp);
        trailerRef.current.style.visibility = trailerOp > 0.01 ? 'visible' : 'hidden';
      }

      if (progress >= TRAILER_START - 0.01) {
        if (trailerLetterboxTopRef.current) trailerLetterboxTopRef.current.style.height = '0';
        if (trailerLetterboxBottomRef.current) trailerLetterboxBottomRef.current.style.height = '0';

        applyTrailerLine(trailerTeaser1Ref.current, trailerT, 0.3, 0.42, 0.5, 0.58);
        applyTrailerLine(trailerTeaser2Ref.current, trailerT, 0.52, 0.64, 0.74, 0.84);

        /* P2: Projector flash — fire once when teaser1 reaches full opacity (enterEnd = 0.42).
           Uses position:fixed div mounted at wrapper root, not inside transformed container. */
        if (!teaserFlashedRef.current && trailerT >= 0.42 && trailerT < 0.50) {
          teaserFlashedRef.current = true;
          projectorFlashRef.current?.classList.add(styles.flashFire);
          // Remove class after animation completes
          setTimeout(() => {
            projectorFlashRef.current?.classList.remove(styles.flashFire);
          }, 100);
        }

        /* P2: Film splice line — fires once in the gap between teaser 1 exit and teaser 2 enter.
           Gap is trailerT 0.58 → 0.52 which is actually teaser1 exits at 0.58, teaser2 enters at 0.52.
           The overlap means splice fires at ~0.50 (after teaser1 starts exiting). */
        if (!spliceFiredRef.current && trailerT >= 0.49 && trailerT < 0.54) {
          spliceFiredRef.current = true;
          spliceRef.current?.classList.add(styles.spliceActive);
          setTimeout(() => {
            spliceRef.current?.classList.remove(styles.spliceActive);
          }, 150);
        }

        /* P2: Arrow animation — slides in only once when teaser2 first becomes visible */
        if (!arrowAnimatedRef.current && trailerT >= 0.58) {
          arrowAnimatedRef.current = true;
          trailerTeaser2Ref.current?.classList.add(styles.arrowVisible);
        }

        if (trailerGrainRef.current) {
          const grainOn =
            smoothstep(0.28, 0.4, trailerT) * (1 - smoothstep(0.82, 0.92, trailerT));
          const grainShift = trailerT * 80;
          trailerGrainRef.current.style.transform = `translate(${grainShift}px, ${grainShift * 0.35}px)`;
          trailerGrainRef.current.style.opacity = String(0.1 + grainOn * 0.18);
        }

        if (trailerSpeedRef.current) {
          const speedT = smoothstep(0.76, 0.95, trailerT);
          trailerSpeedRef.current.style.transform = `translateX(${-speedT * 30}vw) rotate(-6deg)`;
          trailerSpeedRef.current.style.opacity = String(
            speedT * (1 - smoothstep(0.9, 1, trailerT))
          );
        }
      }

      /* --- Scene 2: crossfades with scene 1, no pop-in --- */
      if (scene2Ref.current) {
        const enterE = scene2Blend;
        const scale = 1.18 - enterE * 0.18;
        const pushY = (1 - enterE) * 8;
        const exitFade =
          rawProgress > SCENE2_END - 0.03
            ? clamp01((rawProgress - (SCENE2_END - 0.03)) / 0.06)
            : 0;

        scene2Ref.current.style.visibility =
          enterE > 0.01 && scene3Blend < 0.98 ? 'visible' : 'hidden';
        scene2Ref.current.style.opacity = String(enterE * (1 - exitFade) * (1 - scene3Blend));
        scene2Ref.current.style.transform = `scale(${scale}) translateY(${pushY}vh)`;
        scene2Ref.current.style.pointerEvents = enterE > 0.12 ? 'auto' : 'none';
      }

      if (scene2Blend > 0.01) {
        const scene2Progress = clamp01(
          (progress - SCENE2_SETTLE) / (SCENE2_END - SCENE2_SETTLE)
        );
        const exitFade = clamp01((scene2Progress - 0.94) / 0.06);
        const drift = scene2Progress;
        const scene2Alpha = scene2Blend * (1 - exitFade);

        if (bgParallaxRef.current) {
          const enterParallax = (1 - scene2Blend) * 4;
          const parallaxX = drift * 14 + enterParallax;
          bgParallaxRef.current.style.transform = `translate3d(${parallaxX}vw, ${drift * 2}vh, 0)`;
          bgParallaxRef.current.style.opacity = String(scene2Alpha);
        }

        if (ghost72Ref.current) {
          const ghostT = clamp01((scene2Progress - 0.02) / 0.5);
          const ghostOp =
            ghostT > 0 && ghostT < 1 ? 0.025 + Math.sin(ghostT * Math.PI) * 0.07 : 0;
          ghost72Ref.current.style.opacity = String(ghostOp);
          ghost72Ref.current.style.transform = `translate(-50%, -50%) translateX(${-drift * 6}vw)`;
        }

        const m1 = applyBeat(memory1Ref.current, scene2Progress, BEATS.memory1.start, BEATS.memory1.dur, -1.5);
        if (m1.inDwell && m1.t > 0.14) fireRipple('m1', 0);
        toggleDwellClass(mem1CaptionBarRef.current, mem1CaptionActiveRef, m1.inDwell, styles.frameCaptionBarActive);

        if (bgImage1Ref.current) {
          const op = m1.t > 0 && m1.t < 1 ? Math.sin(m1.t * Math.PI) * 0.6 : 0;
          bgImage1Ref.current.style.opacity = String(op);
          bgImage1Ref.current.style.transform = `scale(${1.05 + m1.t * 0.1})`;
        }

        if (playIcon1Ref.current && m1.inDwell !== playPulse1Ref.current) {
          playPulse1Ref.current = m1.inDwell;
          playIcon1Ref.current.classList.toggle(styles.playIconPulse, m1.inDwell);
        }

        const m2 = applyBeat(memory2Ref.current, scene2Progress, BEATS.memory2.start, BEATS.memory2.dur, 2);
        if (m2.inDwell && m2.t > 0.14) fireRipple('m2', 1);
        toggleDwellClass(mem2CaptionBarRef.current, mem2CaptionActiveRef, m2.inDwell, styles.frameCaptionBarActive);

        if (bgImage2Ref.current) {
          const op = m2.t > 0 && m2.t < 1 ? Math.sin(m2.t * Math.PI) * 0.6 : 0;
          bgImage2Ref.current.style.opacity = String(op);
          bgImage2Ref.current.style.transform = `scale(${1.05 + m2.t * 0.1})`;
        }

        if (playIcon2Ref.current && m2.inDwell !== playPulse2Ref.current) {
          playPulse2Ref.current = m2.inDwell;
          playIcon2Ref.current.classList.toggle(styles.playIconPulse, m2.inDwell);
        }

        const t1 = applyBeat(text1Ref.current, scene2Progress, BEATS.text1.start, BEATS.text1.dur, 0, -50);
        toggleDwellClass(text1LineRef.current, text1ActiveRef, t1.inDwell, styles.beatTextActive);
        if (text1LineRef.current) {
          const tracking = 0.15 - t1.enterT * 0.18;
          text1LineRef.current.style.letterSpacing = `${tracking}em`;
        }

        const m3 = applyBeat(memory3Ref.current, scene2Progress, BEATS.memory3.start, BEATS.memory3.dur, -1);
        if (m3.inDwell && m3.t > 0.14) fireRipple('m3', 2);
        toggleDwellClass(mem3CaptionBarRef.current, mem3CaptionActiveRef, m3.inDwell, styles.frameCaptionBarActive);

        if (bgImage3Ref.current) {
          const op = m3.t > 0 && m3.t < 1 ? Math.sin(m3.t * Math.PI) * 0.6 : 0;
          bgImage3Ref.current.style.opacity = String(op);
          bgImage3Ref.current.style.transform = `scale(${1.05 + m3.t * 0.1})`;
        }

        if (playIcon3Ref.current && m3.inDwell !== playPulse3Ref.current) {
          playPulse3Ref.current = m3.inDwell;
          playIcon3Ref.current.classList.toggle(styles.playIconPulse, m3.inDwell);
        }

        if (memory3EchoRef.current) {
          const echoState = getBeatState(beatT(scene2Progress, BEATS.memory3.start, BEATS.memory3.dur));
          const echoX = echoState.xVw + 3;
          memory3EchoRef.current.style.opacity = String(echoState.opacity * 0.25);
          memory3EchoRef.current.style.transform = `translate(-50%, -46%) translateX(${echoX}vw) rotate(2deg) scale(0.9)`;
          memory3EchoRef.current.style.visibility = echoState.opacity > 0.02 ? 'visible' : 'hidden';
        }

        const t2 = applyBeat(text2Ref.current, scene2Progress, BEATS.text2.start, BEATS.text2.dur, 0, -50);
        toggleDwellClass(text2LineRef.current, text2ActiveRef, t2.inDwell, styles.beatTextActive);
        if (text2LineRef.current) {
          const tracking = 0.15 - t2.enterT * 0.18;
          text2LineRef.current.style.letterSpacing = `${tracking}em`;
        }

        const finaleState = applyBeat(
          finaleRef.current,
          scene2Progress,
          BEATS.finale.start,
          BEATS.finale.dur,
          0,
          -50
        );

        if (finaleRuleRef.current) {
          const ruleT = finaleState.inDwell ? clamp01((finaleState.t - 0.15) / 0.3) : 0;
          finaleRuleRef.current.style.width = `${ruleT * 42}vw`;
          finaleRuleRef.current.style.opacity = String(ruleT);
        }
        if (finaleCapturedRef.current) {
          const capT = finaleState.inDwell ? clamp01((finaleState.t - 0.38) / 0.28) : 0;

          // Cinematic, heavy drop-in: easeOutQuart gives a snappy but settled arrival
          const easeOutQuart = 1 - Math.pow(1 - capT, 4);

          // Opacity fades in slightly faster than the movement settles
          const opacity = clamp01(capT * 1.5);

          // Scale down from 1.15 to 1.0 (feels like a heavy stamp/impact)
          const scale = 1.15 - (easeOutQuart * 0.15);

          // Letter spacing tightens from wide to solid
          const tracking = 0.15 - (easeOutQuart * 0.1); // ends at 0.05em

          finaleCapturedRef.current.style.opacity = String(opacity);
          finaleCapturedRef.current.style.transform = `scale(${scale})`;
          finaleCapturedRef.current.style.letterSpacing = `${tracking}em`;

          // Optional: Add a slight vertical drop for extra weight
          const translateY = 10 * (1 - easeOutQuart);
          finaleCapturedRef.current.style.transform = `translateY(${translateY}px) scale(${scale})`;
        }
        if (finaleHintRef.current) {
          const hintT = finaleState.inDwell ? clamp01((finaleState.t - 0.62) / 0.3) : 0;
          finaleHintRef.current.style.opacity = String(hintT * (1 - scene3Blend));
        }
      }

      /* --- Scene 3: the world opens --- */
      if (scene3Ref.current) {
        const s3Alpha = scene3Blend * (1 - scene3Exit);
        scene3Ref.current.style.visibility = inScene3 ? 'visible' : 'hidden';
        scene3Ref.current.style.opacity = String(Math.max(0.001, s3Alpha));
        scene3Ref.current.style.pointerEvents = scene3Blend > 0.08 ? 'auto' : 'none';
      }

      if (inScene3) {
        const s3 = clamp01((progress - SCENE3_START) / (SCENE3_END - SCENE3_START));
        const darkHold = 1 - smoothstep(0.02, 0.07, s3);
        const openIn = smoothstep(0.05, 0.12, s3);
        const openHold = 1 - smoothstep(0.38, 0.46, s3);
        const growT = smoothstep(0.14, 0.42, s3);
        const growEase = easeOutCubic(growT);
        const inlineFade = 1 - smoothstep(0.14, 0.24, s3);
        const restFade = openIn * (1 - smoothstep(0.18, 0.3, s3));
        const giantIn = smoothstep(0.16, 0.26, s3);
        const convergeT = smoothstep(0.44, 0.68, s3);
        const convergeEase = easeInCubic(convergeT);
        const punchIn = smoothstep(0.72, 0.8, s3) * (1 - scene3Exit);
        const sub1In = smoothstep(0.8, 0.87, s3) * (1 - scene3Exit);
        const sub2In = smoothstep(0.84, 0.91, s3) * (1 - scene3Exit);
        const hintIn = smoothstep(0.9, 0.96, s3) * (1 - scene3Exit);
        const breathe = 1 + Math.sin(s3 * 28) * 0.018 * (1 - growT);

        if (scene3DarkRef.current) {
          scene3DarkRef.current.style.opacity = String(darkHold);
          scene3DarkRef.current.style.visibility = darkHold > 0.02 ? 'visible' : 'hidden';
        }

        if (wireframeBgRef.current) {
          // Fade in behind the scene 3 elements
          const bgOp = smoothstep(0.05, 0.2, s3) * (1 - scene3Exit);
          wireframeBgRef.current.style.opacity = String(bgOp * 0.8); // Base opacity increased; the CSS mask-image handles the top-to-bottom fade
          wireframeBgRef.current.style.transform = `translateY(${s3 * -50}vh)`;
        }

        if (scene3OpenRef.current) {
          const openOp = openIn * openHold;
          scene3OpenRef.current.style.opacity = String(openOp);
          scene3OpenRef.current.style.visibility = openOp > 0.02 ? 'visible' : 'hidden';
        }

        if (scene3NumInlineRef.current) {
          scene3NumInlineRef.current.style.opacity = String(inlineFade);
          scene3NumInlineRef.current.style.transform = `scale(${breathe})`;
        }

        if (scene3OpenRestRef.current) {
          scene3OpenRestRef.current.style.opacity = String(restFade);
        }

        if (scene3GiantNumRef.current) {
          const giantScale = 0.12 + growEase * 0.88;
          const giantBaseOp = giantIn * (0.05 + growEase * 0.1);
          const giantConvergeFade = 1 - smoothstep(0.44, 0.66, s3);
          const giantConvergeScale = 1 - convergeEase * 0.6;
          scene3GiantNumRef.current.style.opacity = String(giantBaseOp * giantConvergeFade);
          scene3GiantNumRef.current.style.transform = `translate(-50%, -50%) scale(${giantScale * giantConvergeScale})`;
        }

        if (memoryStripRef.current) {
          memoryStripRef.current.style.visibility = inScene3 ? 'visible' : 'hidden';
          // Use pure s3 logic for punchOut to prevent it bouncing back when scene3Exit applies
          const purePunchIn = smoothstep(0.72, 0.8, s3);
          const stripOpacity = inScene3 ? (1 - purePunchIn) : 0;
          memoryStripRef.current.style.opacity = String(Math.max(0, stripOpacity));
        }

        // Floating Mid Text 1: NO SHORTCUTS
        if (scene3Mid1Ref.current) {
          const s3Mid1In = smoothstep(0.25, 0.35, s3);
          const s3Mid1Out = smoothstep(0.40, 0.48, s3);
          const s3Mid1Op = s3Mid1In * (1 - s3Mid1Out) * (1 - scene3Exit);
          scene3Mid1Ref.current.style.opacity = String(s3Mid1Op);
          scene3Mid1Ref.current.style.transform = `translate(-50%, -50%) scale(${0.9 + s3Mid1In * 0.1})`;
        }

        // Floating Mid Text 2: ONLY BREAKTHROUGHS
        if (scene3Mid2Ref.current) {
          const s3Mid2In = smoothstep(0.50, 0.58, s3);
          const s3Mid2Out = smoothstep(0.64, 0.70, s3);
          const s3Mid2Op = s3Mid2In * (1 - s3Mid2Out) * (1 - scene3Exit);
          scene3Mid2Ref.current.style.opacity = String(s3Mid2Op);
          scene3Mid2Ref.current.style.transform = `translate(-50%, -50%) scale(${0.9 + s3Mid2In * 0.1})`;
        }

        if (row0Ref.current) {
          row0Ref.current.style.transform = `translateX(${-s3 * 410 * 0.65}vw)`;
        }
        if (row1Ref.current) {
          row1Ref.current.style.transform = `translateX(${-s3 * 410 * 1.0}vw)`;
        }
        if (row2Ref.current) {
          row2Ref.current.style.transform = `translateX(${-s3 * 410 * 1.35}vw)`;
        }

        if (scene3PunchRef.current) {
          scene3PunchRef.current.style.opacity = String(punchIn > 0.02 ? 1 : 0);
          scene3PunchRef.current.style.visibility = punchIn > 0.02 ? 'visible' : 'hidden';
        }

        if (scene3PunchlineRef.current) {
          const punchScale = 0.92 + punchIn * 0.08;
          scene3PunchlineRef.current.style.opacity = String(punchIn);
          scene3PunchlineRef.current.style.transform = `translateY(${(1 - punchIn) * 24}px) scale(${punchScale})`;
        }

        if (scene3Sub1Ref.current) {
          scene3Sub1Ref.current.style.opacity = String(sub1In);
          scene3Sub1Ref.current.style.transform = `translateY(${(1 - sub1In) * 16}px)`;
        }

        if (scene3Sub2Ref.current) {
          scene3Sub2Ref.current.style.opacity = String(sub2In);
          scene3Sub2Ref.current.style.transform = `translateY(${(1 - sub2In) * 16}px)`;
        }

        if (scene3HintRef.current) {
          scene3HintRef.current.style.opacity = String(hintIn);
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      unlockBody();
    };
  }, [isVisible]);

  const handleBackClick = () => {
    onBack();
    window.scrollTo({ top: 0, behavior: 'auto' });
  };

  return (
    <div className={`${styles.wrapper} ${isVisible ? styles.visible : ''}`}>
      {/* P2: Projector flash — position:fixed, mounted at wrapper root OUTSIDE all transformed containers.
          This ensures it covers the full viewport even when parent elements have CSS transforms. */}
      <div ref={projectorFlashRef} className={styles.projectorFlash} />

      {/* P7: Global film grain overlay — uses /film-grain-35mm.avif.
          position:fixed, z-index:150 (below BACK btn/dev overlay, above scenes).
          pointer-events:none is set in CSS to prevent blocking interactions. */}
      <div ref={grainRef} className={styles.globalGrain} aria-hidden="true" />

      <div ref={stickyRef} className={styles.sticky}>

        <button type="button" className={styles.backBtn} onClick={handleBackClick}>
          ← BACK
        </button>

        <div
          ref={scene1Ref}
          className={`${styles.scene1} ${textEntered ? styles.scene1Entered : ''}`}
        >
          <div ref={hallCameraRef} className={styles.hallCamera}>
            <div ref={theatreRoomRef} className={styles.theatreRoom} aria-hidden="true">
              <div ref={hallCeilingRef} className={styles.hallCeiling}>
                <div className={styles.ceilingRidge} />
                <div className={styles.ceilingLights}>
                  <span /><span /><span /><span /><span />
                </div>
              </div>

              <div ref={hallBackWallRef} className={styles.hallBackWall}>
                <div className={styles.backWallPanels} />
              </div>

              <div ref={hallWallLeftRef} className={styles.hallWallLeft}>
                <div className={styles.wallSconce} />
                <div className={styles.wallPanels} />
              </div>
              <div ref={hallWallRightRef} className={styles.hallWallRight}>
                <div className={styles.wallSconce} />
                <div className={styles.wallPanels} />
              </div>

              <div ref={hallFloorRef} className={styles.hallFloor}>
                <div className={styles.floorAisle} />
                <div className={styles.floorCarpet} />
              </div>

              <div className={styles.seatBankLeft} aria-hidden="true">
                <div className={styles.seatBankRow} /><div className={styles.seatBankRow} />
                <div className={styles.seatBankRow} /><div className={styles.seatBankRow} />
              </div>
              <div className={styles.seatBankRight} aria-hidden="true">
                <div className={styles.seatBankRow} /><div className={styles.seatBankRow} />
                <div className={styles.seatBankRow} /><div className={styles.seatBankRow} />
              </div>

              <div ref={cinemaSeatsRef} className={styles.cinemaSeats}>
                <div className={styles.seatRow} />
                <div className={styles.seatRow} />
                <div className={styles.seatRow} />
                <div className={styles.seatRow} />
                <div className={styles.seatRow} />
                <div className={styles.seatRow} />
                <div className={styles.seatRow} />
                <div className={styles.seatRow} />
              </div>

              <div className={styles.exitSignLeft} aria-hidden="true">EXIT</div>
              <div className={styles.exitSignRight} aria-hidden="true">EXIT</div>

              <div className={styles.theatreVignette} />
              <div className={styles.aisleGlow} />
            </div>

            <div ref={projectorBoothRef} className={styles.projectorBooth} aria-hidden="true">
              <div className={styles.projectorHousing} />
              <div className={styles.projectorSource}>
                <div className={styles.projectorLens} />
              </div>
              <div ref={projectorBeamRef} className={styles.projectorBeamSystem}>
                <div className={styles.beamAmbient} />
                <div className={styles.beamBlurWrapper}>
                  <div className={styles.projectorBeamCore}>
                    <div className={styles.beamRays}>
                      <div className={styles.beamRay} style={{ left: '26%', opacity: 0.18 }} />
                      <div className={styles.beamRay} style={{ left: '38%', opacity: 0.28 }} />
                      <div className={styles.beamRay} style={{ left: '50%', opacity: 0.38 }} />
                      <div className={styles.beamRay} style={{ left: '62%', opacity: 0.28 }} />
                      <div className={styles.beamRay} style={{ left: '74%', opacity: 0.18 }} />
                    </div>
                  </div>
                </div>
                {/* P1: Dust motes — capped at 6 particles, animated via RAF Math.sin drift */}
                <div className={styles.beamDust} aria-hidden="true">
                  <span ref={(el) => { dustRefs.current[0] = el; }} />
                  <span ref={(el) => { dustRefs.current[1] = el; }} />
                  <span ref={(el) => { dustRefs.current[2] = el; }} />
                  <span ref={(el) => { dustRefs.current[3] = el; }} />
                  <span ref={(el) => { dustRefs.current[4] = el; }} />
                  <span ref={(el) => { dustRefs.current[5] = el; }} />
                </div>
              </div>
            </div>

            <div ref={theatreScreenRef} className={styles.theatreScreen}>
              <div className={styles.prosceniumFrame} aria-hidden="true" />
              <div className={styles.screenSurface} aria-hidden="true">
                <div className={styles.screenProjection} />
                <div className={styles.screenHotspot} />
                <div className={styles.screenGrain} />
                <div className={styles.screenScanlines} />
                <div className={styles.screenVignette} />
              </div>

              <div className={styles.scene1Content}>
                <div className={styles.projectedText}>
                  <p className={styles.openingLine}>
                    <span className={styles.wordLight}>Since </span>
                    <span className={styles.year}>2008</span>
                    <span className={styles.wordLight}>, we&apos;ve been </span>
                    <span className={styles.wordItalic}>building</span>
                  </p>
                  <p className={styles.openingLine}>
                    <span className={styles.wordLight}>something </span>
                    <span className={styles.wordBold}>worth </span>
                    <span className={styles.wordItalicBold}>staying up for.</span>
                  </p>
                </div>

                <div ref={scrollHintRef} className={styles.scrollHint}>
                  <p className={styles.scrollHintText}>Scroll to explore</p>
                  <span className={styles.scrollHintChevron} aria-hidden="true">∨</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div ref={trailerRef} className={styles.trailerTransition} aria-hidden="true">
          <div ref={trailerLetterboxTopRef} className={styles.trailerLetterboxTop} />
          <div ref={trailerLetterboxBottomRef} className={styles.trailerLetterboxBottom} />
          <div ref={trailerSpeedRef} className={styles.trailerSpeedLines} aria-hidden="true" />
          {/* P2: Film splice line */}
          <div ref={spliceRef} className={styles.trailerSplice} />
          <p ref={trailerTeaser1Ref} className={styles.trailerTeaser1}>
            Want to see something <em>interesting?</em>
          </p>
          <p ref={trailerTeaser2Ref} className={styles.trailerTeaser2}>
            Explore the journey
          </p>
          <div ref={trailerGrainRef} className={styles.trailerGrain} aria-hidden="true" />
        </div>

        <div ref={scene2Ref} className={styles.scene2}>
          <div ref={bgParallaxRef} className={styles.bgParallax} aria-hidden="true">
            <div className={styles.scene2BgImages}>
              <div ref={bgImage1Ref} className={styles.bgImageWrapper}>
                <Image src="/dotslash/Dotslash9-winners.webp" alt="bg1" fill style={{ objectFit: 'cover' }} />
              </div>
              <div ref={bgImage2Ref} className={styles.bgImageWrapper}>
                <Image src="/dotslash/Dotslash9-team.webp" alt="bg2" fill style={{ objectFit: 'cover' }} />
              </div>
              <div ref={bgImage3Ref} className={styles.bgImageWrapper}>
                <Image src="/dotslash/DSC_2163 (1).webp" alt="bg3" fill style={{ objectFit: 'cover' }} />
              </div>
            </div>
            <div className={styles.bgGlow} />
            <div className={styles.bgGridContainer}>
              <div className={styles.bgGridFloor} />
              <div className={styles.bgGridCeiling} />
            </div>
            <div className={styles.bgFar} />
            <div className={styles.bgStreaks} />
          </div>

          <div ref={ghost72Ref} className={styles.ghost72} aria-hidden="true">
            72
          </div>

          {/* Cinematic Light Leak Overlay */}
          <div className={styles.scene2LightLeak} aria-hidden="true" />

          <div ref={memory1Ref} className={`${styles.beatItem} ${styles.beatMemory1}`}>
            <div className={styles.filmFrame}>
              <div className={styles.filmFrameBody}>
                <div className={styles.frameImage}>
                  <Image
                    src="/dotslash/Dotslash9-winners.webp"
                    alt="Dotslash 9 Winners"
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 80vw, 400px"
                  />
                </div>
                <div ref={mem1CaptionBarRef} className={styles.frameCaptionBar}>
                  <p className={styles.captionLine}>
                    <span className={`${styles.captionReveal} ${styles.captionWordBold}`}>HACKATHON</span>
                    <span className={`${styles.captionReveal} ${styles.captionWordAccent}`}>&apos;24</span>
                    <span className={`${styles.captionReveal} ${styles.captionWordDim}`}> · </span>
                    <span className={`${styles.captionReveal} ${styles.captionWordBold}`}>02:47</span>
                    <span className={`${styles.captionReveal} ${styles.captionWordItalic}`}> AM</span>
                  </p>
                  <p className={`${styles.captionSubLine} ${styles.captionReveal}`}>
                    RECORDING // RAW
                  </p>
                </div>
              </div>
              <div ref={(el) => { rippleRefs.current[0] = el; }} className={styles.ripple} />
            </div>
          </div>

          <div ref={memory2Ref} className={`${styles.beatItem} ${styles.beatMemory2}`}>
            <div className={styles.filmFrame}>
              <div className={styles.filmFrameBody}>
                <div className={styles.frameImage}>
                  <Image
                    src="/dotslash/Dotslash9-team.webp"
                    alt="Prototype Iteration 14"
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 80vw, 400px"
                  />
                </div>
                <div ref={mem2CaptionBarRef} className={styles.frameCaptionBar}>
                  <p className={styles.captionLine}>
                    <span className={`${styles.captionReveal} ${styles.captionWordBoldItalic}`}>PROTOTYPE</span>
                    <span className={`${styles.captionReveal} ${styles.captionWordDim}`}> — </span>
                    <span className={`${styles.captionReveal} ${styles.captionWordLight}`}>ITERATION </span>
                    <span className={`${styles.captionReveal} ${styles.captionWordBold}`}>14</span>
                  </p>
                  <p className={`${styles.captionSubLine} ${styles.captionReveal}`}>
                    FILE // NOT_FOUND
                  </p>
                </div>
              </div>
              <div ref={(el) => { rippleRefs.current[1] = el; }} className={styles.ripple} />
            </div>
          </div>

          <div ref={text1Ref} className={`${styles.beatItem} ${styles.beatText}`}>
            <p ref={text1LineRef} className={styles.beatTextLine}>
              <span className={styles.beatWordLight}>WE DON&apos;T JUST </span>
              <span className={styles.beatWordBoldItalic}>CODE.</span>
            </p>
          </div>

          <div ref={memory3EchoRef} className={`${styles.beatItem} ${styles.beatMemory3} ${styles.beatEcho}`}>
            <div className={styles.filmFrame}>
              <div className={styles.filmFrameBody}>
                <div className={styles.frameImage} />
              </div>
            </div>
          </div>
          <div ref={memory3Ref} className={`${styles.beatItem} ${styles.beatMemory3}`}>
            <div className={styles.filmFrame}>
              <div className={styles.filmFrameBody}>
                <div className={styles.frameImage}>
                  <Image
                    src="/webp/icpc.webp"
                    alt="ICPC Regionals"
                    fill
                    style={{ objectFit: 'cover' }}
                    sizes="(max-width: 768px) 80vw, 400px"
                  />
                </div>
                <div ref={mem3CaptionBarRef} className={styles.frameCaptionBar}>
                  <p className={styles.captionLine}>
                    <span className={`${styles.captionReveal} ${styles.captionWordBold}`}>ICPC</span>
                    <span className={`${styles.captionReveal} ${styles.captionWordDim}`}> / </span>
                    <span className={`${styles.captionReveal} ${styles.captionWordLight}`}>REGIONALS</span>
                  </p>
                  <p className={`${styles.captionSubLine} ${styles.captionReveal}`}>
                    STATUS // QUALIFIED
                  </p>
                </div>
              </div>
              <div ref={(el) => { rippleRefs.current[2] = el; }} className={styles.ripple} />
            </div>
          </div>

          <div ref={text2Ref} className={`${styles.beatItem} ${styles.beatText}`}>
            <p ref={text2LineRef} className={styles.beatTextLine}>
              <span className={styles.beatWordLight}>WE ENGINEER THE </span>
              <span className={styles.beatWordAccent}>FUTURE.</span>
            </p>
          </div>

          <div ref={finaleRef} className={`${styles.beatItem} ${styles.beatFinale}`}>
            <div ref={finaleRuleRef} className={styles.finaleRule} />
            <div ref={finaleCapturedRef} className={styles.finaleCaptured}>
              WE ARE <span className={styles.acmBlueText}>ACM.</span>
            </div>
            <div ref={finaleHintRef} className={styles.finaleHint}>
              SCROLL TO CONTINUE →
            </div>
          </div>
        </div>

        <div ref={scene3Ref} className={`${styles.scene3}`}>
          <div ref={scene3DarkRef} className={styles.scene3Dark} />

          <WireframeArtifacts bgRef={wireframeBgRef} />

          <p ref={scene3OpenRef} className={styles.scene3OpenLine}>
            <span ref={scene3NumInlineRef} className={styles.scene3NumInline}>500+</span>
            <span ref={scene3OpenRestRef} className={styles.scene3OpenRest}> ELITE BUILDERS.</span>
          </p>

          <div ref={scene3GiantNumRef} className={styles.scene3GiantNum}>500</div>

          <div ref={scene3Mid1Ref} className={styles.scene3MidText}>
            NO SHORTCUTS.
          </div>

          <div ref={scene3Mid2Ref} className={styles.scene3MidText}>
            ONLY BREAKTHROUGHS.
          </div>

          <div ref={memoryStripRef} className={styles.memoryStripContainer} aria-hidden="true">
            {/* ROW 0: Back (Slowest) */}
            <div ref={row0Ref} className={`${styles.memoryRow} ${styles.memoryRow0}`}>
              {S3_MEMORY_FRAMES.filter(f => f.row === 0).map(frame => (
                <div
                  key={frame.id}
                  className={styles.memoryFrame}
                  style={{
                    left: `${8 + frame.xOffset}vw`,
                    top: `${8 + frame.yOffset}vh`,
                    transform: `scale(${frame.scale * 0.8}) rotate(${frame.rot}deg)`,
                    opacity: 0.3
                  }}
                >
                  <div
                    className={styles.frameContent}
                    onClick={() => setSelectedImage(frame.imageSrc)}
                  >
                    <Image
                      src={frame.imageSrc}
                      alt={frame.label}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 30vw, 320px"
                    />
                    <div className={styles.frameLabelWrapper}>
                      <div className={styles.frameLabel}>{frame.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ROW 1: Middle */}
            <div ref={row1Ref} className={`${styles.memoryRow} ${styles.memoryRow1}`}>
              {S3_MEMORY_FRAMES.filter(f => f.row === 1).map(frame => (
                <div
                  key={frame.id}
                  className={styles.memoryFrame}
                  style={{
                    left: `${8 + frame.xOffset}vw`,
                    top: `${36 + frame.yOffset}vh`,
                    transform: `scale(${frame.scale}) rotate(${frame.rot}deg)`,
                    opacity: 0.6
                  }}
                >
                  <div
                    className={styles.frameContent}
                    onClick={() => setSelectedImage(frame.imageSrc)}
                  >
                    <Image
                      src={frame.imageSrc}
                      alt={frame.label}
                      fill
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 30vw, 320px"
                    />
                    <div className={styles.frameLabelWrapper}>
                      <div className={styles.frameLabel}>{frame.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ROW 2: Front (Fastest) */}
            <div ref={row2Ref} className={`${styles.memoryRow} ${styles.memoryRow2}`}>
              {S3_MEMORY_FRAMES.filter(f => f.row === 2).map(frame => (
                <div
                  key={frame.id}
                  className={styles.memoryFrame}
                  style={{
                    left: `${8 + frame.xOffset}vw`,
                    top: `${64 + frame.yOffset}vh`,
                    transform: `scale(${frame.scale * 1.2}) rotate(${frame.rot}deg)`,
                    opacity: 1.0
                  }}
                >
                  <div
                    className={styles.frameContent}
                    onClick={() => setSelectedImage(frame.imageSrc)}
                  >
                    <Image
                      src={frame.imageSrc}
                      alt={frame.label}
                      fill
                      style={{ objectFit: 'cover', zIndex: 0 }}
                      sizes="(max-width: 768px) 30vw, 320px"
                    />
                    <div className={styles.frameLabelWrapper}>
                      <div className={styles.frameLabel}>{frame.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div ref={scene3PunchRef} className={styles.scene3Punch}>
            <p ref={scene3PunchlineRef} className={styles.scene3Punchline}>
              ONE COLLECTIVE. <span className={styles.scene3PunchAccent}>INFINITE POTENTIAL.</span>
            </p>
            <p ref={scene3Sub1Ref} className={styles.scene3Sub}>
              From competitive programming to deep learning, algorithms to software architecture.
            </p>
            <p ref={scene3Sub2Ref} className={styles.scene3Sub}>
              This is where ambition meets execution. <span className={styles.scene3SubArrow}>↓</span>
            </p>
            <p ref={scene3HintRef} className={styles.scene3Hint}>EXPLORE DOMAINS →</p>
          </div>
        </div>

        {/* DOTSLASH SCENE */}
        <div ref={dotslashRef} className={styles.sceneDotslash}>

          <div ref={dotslashTeaserRef} className={styles.dotslashTeaser}>
            PREPARE FOR THE ULTIMATE HACKATHON.
          </div>

          {/* Phase 1-3: Header & Video */}
          <div ref={dotslashHeaderRef} className={styles.dotslashHeaderGroup}>



            <div ref={dotslashTitleRef} className={styles.dotslashTitleGroup}>
              <h2 className={styles.dotslashTitle}>DOTSLASH.</h2>
              <p ref={dotslashSubtitleRef} className={styles.dotslashSubtitle}>THE FLAGSHIP EXPERIENCE</p>
            </div>

            <div ref={dotslashVideoContainerRef} className={styles.dotslashVideoContainer}>
              <video
                ref={dotslashVideoRef}
                src="/dotslash/dotslash-aftermovie.mp4"
                className={styles.dotslashVideo}
                loop
                muted={isDotslashMuted}
                playsInline
              />
              <button
                className={styles.dotslashMuteBtn}
                onClick={toggleDotslashMute}
                aria-label={isDotslashMuted ? "Unmute video" : "Mute video"}
              >
                {isDotslashMuted ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <line x1="23" y1="9" x2="17" y2="15"></line>
                    <line x1="17" y1="9" x2="23" y2="15"></line>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Phase 4: Image Gallery */}
          <div ref={dotslashGalleryRef} className={styles.dotslashGallery}>
            <div className={styles.dotslashGalleryText}>
              <h3>36 HOURS OF INNOVATION</h3>
              <p>Dotslash is Central India's premier hackathon. A grueling test of endurance, creativity, and code where developers push the boundaries of what's possible. Experience the energy of 1000+ hackers building the future.</p>
            </div>
            {DOTSLASH_IMAGES.map((src, i) => (
              <div
                key={i}
                ref={(el) => { dotslashImagesRef.current[i] = el; }}
                className={styles.dotslashGalleryImgWrapper}
              >
                <Image src={src} alt={`Dotslash ${i}`} fill style={{ objectFit: 'cover' }} />
              </div>
            ))}
          </div>
        </div>

        <div ref={scene4Ref} className={styles.scene4}>
          {/* Cinematic Moving Background */}
          <div className={styles.scene4CinematicBg} aria-hidden="true">
            <div className={styles.scene4Nebula} />
            <div className={styles.scene4LightRay1} />
            <div className={styles.scene4LightRay2} />
            <div className={styles.scene4DustContainer}>
              <CinematicDust />
            </div>
          </div>

          {/* Intermediate Text during photo diamond phase */}
          <p ref={mosaicIntermediateTextRef} className={styles.mosaicIntermediateText}>
            1000+ STORIES. ONE COMMUNITY.
          </p>

          {/* Glow behind the mosaic */}
          <div ref={mosaicGlowRef} className={styles.mosaicGlow} />

          {/* 24 mosaic tiles */}
          {MOSAIC_TILES.map((tile, i) => (
            <div
              key={i}
              ref={(el) => { mosaicTileRefs.current[i] = el; }}
              className={styles.mosaicTile}
            >
              <Image
                src={tile.imageSrc}
                alt={`ACM Memory ${i + 1}`}
                fill
                style={{ objectFit: 'cover' }}
                sizes="14vw"
              />
            </div>
          ))}

          {/* Intense aura that appears behind the logo */}
          <div ref={mosaicAuraRef} className={styles.mosaicAura} />

          {/* Logo reveal */}
          <div ref={mosaicLogoRef} className={styles.mosaicLogo}>
            <AcmLogoSvg
              completed={true}
              animatedBorders={true}
              className={styles.mosaicLogoSvg}
              style={{
                width: '22.8vw',
                height: '22.8vw',
              }}
            />
          </div>

          {/* Header above logo */}
          <h2 ref={mosaicHeaderRef} className={styles.mosaicHeader}>
            WE ARE ACM NIT SURAT.
          </h2>

          {/* Tagline + CTA below logo */}
          <div className={styles.mosaicFooter}>
            <p ref={mosaicTagRef} className={styles.mosaicTag}>
              THE FUTURE BELONGS TO THOSE WHO BUILD IT.
            </p>
            <button ref={mosaicCtaRef} className={styles.mosaicCta}>
              <span>READY TO BUILD? &rarr;</span>
            </button>
          </div>
        </div>

      </div>

      {/* Image Overlay */}
      {selectedImage && (
        <div className={styles.imageOverlay} onClick={() => setSelectedImage(null)}>
          <div className={styles.imageOverlayContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.imageOverlayClose} onClick={() => setSelectedImage(null)}>✕</button>
            <Image src={selectedImage} alt="Fullscreen View" fill style={{ objectFit: 'contain' }} />
          </div>
        </div>
      )}
    </div>
  );
}
