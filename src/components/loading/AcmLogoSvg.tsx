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
  completed?: boolean;
  animatedBorders?: boolean;
}

const AcmLogoSvg = forwardRef<AcmLogoSvgHandle, AcmLogoSvgProps>(
  ({ className, style, completed = false, animatedBorders = false }, ref) => {
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
        const len = acmEl.getComputedTextLength() * 3.5;
        acmEl.style.strokeDasharray = `${len}`;
        acmEl.style.strokeDashoffset = completed ? '0' : `${len}`;
      }
      if (nitEl) {
        const len = nitEl.getComputedTextLength() * 3.5;
        nitEl.style.strokeDasharray = `${len}`;
        nitEl.style.strokeDashoffset = completed ? '0' : `${len}`;
      }
    }, [completed]);

    return (
      <svg
        ref={svgRef}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 200 200"
        className={className}
        style={{ ...style, overflow: 'visible' }}
        aria-label="ACM NIT SURAT logo"
        role="img"
      >
        <defs>
          <linearGradient id="acm-blue-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#73bdf0" />
            <stop offset="50%" stopColor="#4ba5e4" />
            <stop offset="100%" stopColor="#2a82ca" />
          </linearGradient>
          {animatedBorders && (
            <style>
              {`
                @keyframes raceAround {
                  from { stroke-dashoffset: 566; }
                  to { stroke-dashoffset: 0; }
                }
                @keyframes raceCircle {
                  from { stroke-dashoffset: 365; }
                  to { stroke-dashoffset: 0; }
                }
                .light-diamond {
                  animation: raceAround 3s linear infinite;
                  filter: drop-shadow(0 0 6px rgba(255,255,255,1));
                }
                .light-circle {
                  animation: raceCircle 4s linear infinite reverse;
                  filter: drop-shadow(0 0 6px rgba(255,255,255,1));
                }
              `}
            </style>
          )}
        </defs>

        {/* Diamond (Rhombus) */}
        <path
          id="logo-diamond"
          d="M 100,0 L 200,100 L 100,200 L 0,100 Z"
          fill="url(#acm-blue-gradient)"
          fillOpacity={completed ? 1 : 0}
          stroke="#F5E6C8"
          strokeWidth={1.5}
          strokeLinejoin="round"
          strokeDasharray={566}
          strokeDashoffset={completed ? 0 : 566}
        />
        
        {/* Diamond - Moving Light */}
        {animatedBorders && (
          <path
            d="M 100,0 L 200,100 L 100,200 L 0,100 Z"
            fill="none"
            stroke="#ffffff"
            strokeWidth={2.5}
            strokeDasharray="40 526"
            strokeLinejoin="round"
            className="light-diamond"
          />
        )}

        {/* Circle */}
        <circle
          id="logo-circle"
          cx={100}
          cy={100}
          r={58}
          fill="none"
          stroke="#F5E6C8"
          strokeWidth={5}
          strokeDasharray={365}
          strokeDashoffset={completed ? 0 : 365}
        />
        
        {/* Circle - Moving Light */}
        {animatedBorders && (
          <circle
            cx={100}
            cy={100}
            r={58}
            fill="none"
            stroke="#ffffff"
            strokeWidth={5}
            strokeDasharray="20 345"
            strokeLinecap="round"
            className="light-circle"
          />
        )}

        {/* "acm" text */}
        <text
          ref={acmTextRef}
          id="logo-acm-text"
          x={100}
          y={108}
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize={44}
          fontWeight={900}
          fill="#ffffff"
          fillOpacity={completed ? 1 : 0}
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

        {/* "NIT SURAT" */}
        <text
          ref={nitSuratTextRef}
          id="logo-nit-surat"
          x={100}
          y={130}
          fontFamily="Arial, Helvetica, sans-serif"
          fontSize={11}
          fontWeight="bold"
          fill="#ffffff"
          fillOpacity={completed ? 1 : 0}
          stroke="#F5E6C8"
          strokeWidth={0.3}
          strokeLinecap="round"
          strokeLinejoin="round"
          textAnchor="middle"
          letterSpacing={0.5}
          opacity={completed ? 1 : 0}
        >
          NIT SURAT
        </text>
      </svg>
    );
  }
);

AcmLogoSvg.displayName = 'AcmLogoSvg';

export default AcmLogoSvg;
