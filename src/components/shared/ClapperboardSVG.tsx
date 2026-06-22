'use client';

import React, { useState } from 'react';

/* ============================================================
   ClapperboardSVG — Reusable inline SVG clapperboard
   
   Open-position film clapperboard with ACM color palette stripes,
   handwritten text via Caveat font, clap-closing entrance animation,
   and hover snap-shut interaction.
   
   Props:
   - revealed: boolean — triggers the clap-closing entrance animation
   - className: string — additional CSS class for positioning
   ============================================================ */

interface ClapperboardSVGProps {
  revealed?: boolean;
  className?: string;
  title?: string;
  scene?: string;
  take?: string;
  colorTheme?: 'blue1' | 'blue2' | 'blue3';
}

export default function ClapperboardSVG({ 
  revealed = false, 
  className = '',
  title = "ABOUT ACM",
  scene = "06",
  take = "01",
  colorTheme = 'blue1'
}: ClapperboardSVGProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [takeCount, setTakeCount] = useState(parseInt(take, 10) || 1);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setTakeCount(prev => prev + 1);
  };

  const displayTake = takeCount.toString().padStart(2, '0');

  // Clapper stick rotation states:
  // Hidden: 45deg (wide open)
  // Revealed resting: 28deg (settled open)
  // Hovered: 2deg (snapped shut)
  const getStickRotation = () => {
    if (!revealed) return 45;
    if (isHovered) return 2;
    return 28;
  };

  const stickRotation = getStickRotation();

  const getThemeRgb = () => {
    switch (colorTheme) {
      case 'blue2': return '45,212,191'; // Neon Teal/Cyan (striking greenish-blue)
      case 'blue3': return '168,85,247'; // Electric Purple (striking purplish-blue)
      case 'blue1': 
      default:
        return '37,99,235'; // Classic Royal Blue
    }
  };
  const themeRgb = getThemeRgb();

  // Create a unique ID for the pattern so multiple clapperboards on the same page don't share the same color pattern
  const patternId = `clapStripes-${colorTheme}`;

  return (
    <div
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={handleMouseLeave}
      style={{ width: 360, height: 280 }}
    >
      <svg
        viewBox="0 0 360 280"
        width="360"
        height="280"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ overflow: 'visible' }}
      >
        <defs>
          {/* Diagonal stripe pattern for clapper stick — ACM palette */}
          <pattern
            id={patternId}
            patternUnits="userSpaceOnUse"
            width="24"
            height="24"
            patternTransform="rotate(-45)"
          >
            <rect width="12" height="24" fill="#0a0916" />
            <rect x="12" width="12" height="24" fill={`rgba(${themeRgb},0.85)`} />
          </pattern>
        </defs>

        {/* ======= BOTTOM BOARD (stationary) ======= */}
        <g>
          {/* Board body */}
          <rect
            x="10"
            y="80"
            width="340"
            height="190"
            rx="6"
            fill="#0a0916"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="1"
          />

          {/* Inner noise texture overlay */}
          <rect
            x="10"
            y="80"
            width="340"
            height="190"
            rx="6"
            fill="url(#boardNoise)"
            opacity="0.08"
          />

          {/* Horizontal rule lines mimicking a real clapperboard */}
          <line x1="30" y1="145" x2="330" y2="145" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1="30" y1="195" x2="330" y2="195" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

          {/* Handwritten "ABOUT ACM" — uses Caveat font via CSS variable */}
          <text
            x="40"
            y="135"
            fontFamily="var(--font-handwritten), 'Caveat', cursive"
            fontSize="36"
            fontWeight="700"
            fill="#ffffff"
            transform="rotate(-2, 40, 135)"
          >
            {title}
          </text>

          {/* Clapperboard fields — smaller handwritten text */}
          <text
            x="42"
            y="175"
            fontFamily="var(--font-handwritten), 'Caveat', cursive"
            fontSize="20"
            fontWeight="400"
            fill="rgba(255,255,255,0.5)"
            transform="rotate(-1, 42, 175)"
          >
            SCENE: {scene}
          </text>
          <text
            x="200"
            y="175"
            fontFamily="var(--font-handwritten), 'Caveat', cursive"
            fontSize="20"
            fontWeight="400"
            fill="rgba(255,255,255,0.5)"
            transform="rotate(-1, 200, 175)"
          >
            TAKE: {displayTake}
          </text>

          {/* Field labels — monospace, mimicking printed labels */}
          <text
            x="42"
            y="230"
            fontFamily="var(--font-geist-mono), 'Courier New', monospace"
            fontSize="9"
            letterSpacing="0.15em"
            fill="rgba(255,255,255,0.25)"
          >
            ACM SVNIT • NIT SURAT
          </text>

          {/* Bottom-right date */}
          <text
            x="260"
            y="250"
            fontFamily="var(--font-handwritten), 'Caveat', cursive"
            fontSize="16"
            fill="rgba(255,255,255,0.35)"
            transform="rotate(-1.5, 260, 250)"
          >
            EST. 2008
          </text>

          {/* Corner L-marks — matching WalkThroughReel film frame marks */}
          <g stroke={`rgba(${themeRgb},0.9)`} strokeWidth="1.5" fill="none">
            {/* Top-left */}
            <path d="M18 88 L18 100 M18 88 L30 88" />
            {/* Top-right */}
            <path d="M342 88 L342 100 M342 88 L330 88" />
            {/* Bottom-left */}
            <path d="M18 262 L18 250 M18 262 L30 262" />
            {/* Bottom-right */}
            <path d="M342 262 L342 250 M342 262 L330 262" />
          </g>
        </g>

        {/* ======= TOP CLAPPER STICK (animated) ======= */}
        <g
          style={{
            transformOrigin: '30px 80px',
            transform: `rotate(-${stickRotation}deg)`,
            transition: revealed
              ? isHovered
                ? 'transform 400ms cubic-bezier(0.34, 1.56, 0.64, 1)'
                : 'transform 500ms cubic-bezier(0.22, 1, 0.36, 1)'
              : 'none',
          }}
        >
          {/* Stick body with stripe pattern */}
          <rect
            x="10"
            y="46"
            width="340"
            height="36"
            rx="3"
            fill={`url(#${patternId})`}
            stroke="rgba(255,255,255,0.12)"
            strokeWidth="1"
          />

          {/* Left hinge plate — solid dark */}
          <rect
            x="10"
            y="46"
            width="50"
            height="36"
            rx="3"
            fill="#0a0916"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />

          {/* Hinge screws */}
          <circle cx="25" cy="56" r="3" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <circle cx="45" cy="56" r="3" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <circle cx="25" cy="72" r="3" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
          <circle cx="45" cy="72" r="3" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.08)" strokeWidth="0.5" />
        </g>

        {/* Bottom clapper stick (stationary, forms the top edge of the board) */}
        <rect
          x="10"
          y="80"
          width="340"
          height="12"
          fill="#0a0916"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="0.5"
        />
        {/* Stripe pattern on bottom stick — opposite diagonal */}
        <rect
          x="60"
          y="80"
          width="290"
          height="12"
          fill={`url(#${patternId})`}
          opacity="0.6"
        />

        {/* Hinge circle (pivot point) */}
        <circle
          cx="30"
          cy="80"
          r="8"
          fill="#0a0916"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
        <circle cx="30" cy="80" r="3" fill={`rgba(${themeRgb},1)`} />
      </svg>
    </div>
  );
}
