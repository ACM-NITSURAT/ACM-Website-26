'use client';

import React, { forwardRef, useEffect, useRef, useImperativeHandle } from 'react';

/**
 * ACM SVNIT Logo — Inline SVG Component
 * 
 * CRITICAL: The final logo state MUST match the provided ACM SVNIT logo exactly.
 * Same proportions, typography, spacing, circle/diamond placement.
 * 
 * Animation strategy:
 * - Uses actual <text> elements (not <path>) for EXACT typography match
 * - Stroke-dashoffset animation on <text> creates "construction" effect
 * - Text length computed at runtime via getComputedTextLength()
 * - Fill starts at 0 opacity, fades in after stroke construction completes
 * 
 * Element order (matching user's provided SVG):
 * - Diamond: M 100,0 L 200,100 L 100,200 L 0,100 Z (with blue gradient)
 * - Circle: cx=100 cy=100 r=58, white stroke, width 5
 * - "acm": x=100 y=108, Arial bold 44px, white, centered
 * - "NIT SURAT": x=100 y=130, Arial bold 11px, white, centered
 */

export interface AcmLogoSvgHandle {
  getAcmTextLength: () => number;
  getNitSuratTextLength: () => number;
}

interface AcmLogoSvgProps {
  className?: string;
  style?: React.CSSProperties;
}

const AcmLogoSvg = forwardRef<AcmLogoSvgHandle, AcmLogoSvgProps>(
  ({ className, style }, ref) => {
    const acmTextRef = useRef<SVGTextElement>(null);
    const nitSuratTextRef = useRef<SVGTextElement>(null);
    const svgRef = useRef<SVGSVGElement>(null);

    useImperativeHandle(ref, () => ({
      getAcmTextLength: () => {
        return acmTextRef.current?.getComputedTextLength() ?? 120;
      },
      getNitSuratTextLength: () => {
        return nitSuratTextRef.current?.getComputedTextLength() ?? 60;
      },
    }));

    // Compute and set stroke-dasharray on mount
    useEffect(() => {
      const acmEl = acmTextRef.current;
      const nitEl = nitSuratTextRef.current;
      if (acmEl) {
        // For bold text construction, we need the perimeter of all glyphs.
        // getComputedTextLength returns advance width; for stroke around
        // thick glyphs we need more. Using a multiplier for the outline.
        const len = acmEl.getComputedTextLength() * 3.5;
        acmEl.style.strokeDasharray = `${len}`;
        acmEl.style.strokeDashoffset = `${len}`;
      }
      if (nitEl) {
        const len = nitEl.getComputedTextLength() * 3.5;
        nitEl.style.strokeDasharray = `${len}`;
        nitEl.style.strokeDashoffset = `${len}`;
      }
    }, []);

    return (
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        className={className}
        style={style}
        aria-label="ACM NIT SURAT logo"
        role="img"
      >
        <defs>
          <linearGradient id="acm-blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#73bdf0" />
            <stop offset="50%" stopColor="#4ba5e4" />
            <stop offset="100%" stopColor="#2a82ca" />
          </linearGradient>
        </defs>

        {/* Diamond (Rhombus) — EXACT match to provided SVG
            Path: M 100,0 L 200,100 L 100,200 L 0,100 Z
            Perimeter ≈ 4 × √(100² + 100²) ≈ 566 */}
        <path
          id="logo-diamond"
          d="M 100,0 L 200,100 L 100,200 L 0,100 Z"
          fill="url(#acm-blue-gradient)"
          fillOpacity={0}
          stroke="#F5E6C8"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeDasharray={566}
          strokeDashoffset={566}
        />

        {/* Circle — EXACT match: cx=100 cy=100 r=58, white, stroke-width=5
            Circumference = 2π×58 ≈ 364.42 */}
        <circle
          id="logo-circle"
          cx={100}
          cy={100}
          r={58}
          fill="none"
          stroke="#F5E6C8"
          strokeWidth={5}
          strokeDasharray={365}
          strokeDashoffset={365}
        />

        {/* "acm" text — EXACT match to logo typography
            font: Arial/Helvetica, size 44, weight 900 (black), white
            x=100 y=108, text-anchor middle, letter-spacing -1.5
            
            Stroke animation: stroke draws the text outline, then fill fades in.
            Initial state: stroke-dashoffset = full, fill-opacity = 0 */}
        <text
          ref={acmTextRef}
          id="logo-acm-text"
          x={100}
          y={108}
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize={44}
          fontWeight={900}
          fill="#ffffff"
          fillOpacity={0}
          stroke="#F5E6C8"
          strokeWidth={0.8}
          strokeLinecap="round"
          strokeLinejoin="round"
          textAnchor="middle"
          letterSpacing={-1.5}
          style={{ paintOrder: 'stroke fill' }}
        >
          acm
        </text>

        {/* "NIT SURAT" — EXACT match to logo
            font: Arial/Helvetica, size 11, bold, white
            x=100 y=130, text-anchor middle, letter-spacing 0.5 */}
        <text
          ref={nitSuratTextRef}
          id="logo-nit-surat"
          x={100}
          y={130}
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize={11}
          fontWeight="bold"
          fill="#ffffff"
          fillOpacity={0}
          stroke="#F5E6C8"
          strokeWidth={0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          textAnchor="middle"
          letterSpacing={0.5}
          opacity={0}
        >
          NIT SURAT
        </text>
      </svg>
    );
  }
);

AcmLogoSvg.displayName = 'AcmLogoSvg';

export default AcmLogoSvg;
