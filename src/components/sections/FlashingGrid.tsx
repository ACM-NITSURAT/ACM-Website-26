'use client';

import React, { useEffect, useRef } from 'react';
import styles from './FlashingGrid.module.css';

const GRID_SIZE = 60; // Must match the .bgGrid background-size (60px)
const POOL_SIZE = 150; // Increased pool to allow many more simultaneous flashes

const NUM_TRAILS = 12;
const TRAIL_STEP_MS = 60;

export default function FlashingGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    // Calculate how many grid cells fit in the container
    let cols = 0;
    let rows = 0;
    let exclusionZones: { top: number; bottom: number; left: number; right: number }[] = [];

    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      cols = Math.floor(rect.width / GRID_SIZE);
      // We use the scrollHeight of the document to allow the grid to span the whole section
      // But containerRef.current.offsetHeight is the actual height of the absolute container
      rows = Math.floor(containerRef.current.offsetHeight / GRID_SIZE);

      // Calculate exclusion zones
      exclusionZones = [];
      const section = containerRef.current.closest('section');
      if (section) {
        const sectionRect = section.getBoundingClientRect();
        const excludedEls = section.querySelectorAll('[data-exclude-bg="true"]');
        excludedEls.forEach((el) => {
          const elRect = el.getBoundingClientRect();
          exclusionZones.push({
            top: elRect.top - sectionRect.top - 20,
            bottom: elRect.bottom - sectionRect.top + 20,
            left: elRect.left - sectionRect.left - 20,
            right: elRect.right - sectionRect.left + 20,
          });
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    // Initialize Trails
    // dir: 0 = up, 1 = right, 2 = down, 3 = left
    const trails: { x: number; y: number; dir: number }[] = Array.from({ length: NUM_TRAILS }).map(() => ({
      x: Math.floor(Math.random() * (cols || 20)),
      y: Math.floor(Math.random() * (rows || 10)),
      dir: Math.floor(Math.random() * 4),
    }));

    const intervalId = setInterval(() => {
      if (cols === 0 || rows === 0) return;

      trails.forEach((trail) => {
        // Random chance to turn 90 degrees
        if (Math.random() < 0.15) {
          // turn left (-1) or right (+1)
          const turn = Math.random() < 0.5 ? 1 : 3;
          trail.dir = (trail.dir + turn) % 4;
        }

        // Move forward
        if (trail.dir === 0) trail.y -= 1;
        else if (trail.dir === 1) trail.x += 1;
        else if (trail.dir === 2) trail.y += 1;
        else if (trail.dir === 3) trail.x -= 1;

        // Wrap around boundaries
        if (trail.x < 0) trail.x = cols - 1;
        if (trail.x >= cols) trail.x = 0;
        if (trail.y < 0) trail.y = rows - 1;
        if (trail.y >= rows) trail.y = 0;

        // Verify it's not inside an exclusion zone
        const pxTop = trail.y * GRID_SIZE;
        const pxLeft = trail.x * GRID_SIZE;
        const pxBottom = pxTop + GRID_SIZE;
        const pxRight = pxLeft + GRID_SIZE;

        let excluded = false;
        for (let i = 0; i < exclusionZones.length; i++) {
          const zone = exclusionZones[i];
          if (
            pxRight > zone.left &&
            pxLeft < zone.right &&
            pxBottom > zone.top &&
            pxTop < zone.bottom
          ) {
            excluded = true;
            break;
          }
        }

        if (excluded) return;

        // Pick an available cell from the pool to leave a fading trail
        const availableCell = cellsRef.current.find(
          (cell) => cell && cell.dataset.animating !== 'true'
        );

        if (!availableCell) return;

        availableCell.style.left = `${trail.x * GRID_SIZE}px`;
        availableCell.style.top = `${trail.y * GRID_SIZE}px`;

        // Trigger animation
        availableCell.dataset.animating = 'true';
        availableCell.classList.add(styles.flashActive);

        // Remove class after animation finishes to allow re-use
        setTimeout(() => {
          if (availableCell) {
            availableCell.classList.remove(styles.flashActive);
            availableCell.dataset.animating = 'false';
          }
        }, 2000); // Shorter fade (2s) for trails looks better than 4s
      });
    }, TRAIL_STEP_MS);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearInterval(intervalId);
    };
  }, []);

  return (
    <div ref={containerRef} className={styles.gridContainer} aria-hidden="true">
      {Array.from({ length: POOL_SIZE }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) cellsRef.current[i] = el;
          }}
          className={styles.gridCell}
          data-animating="false"
        />
      ))}
    </div>
  );
}
