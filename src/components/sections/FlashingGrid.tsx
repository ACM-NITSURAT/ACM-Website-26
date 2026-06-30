'use client';

import React, { useEffect, useRef } from 'react';
import styles from './FlashingGrid.module.css';

const GRID_SIZE = 60; // Must match the .bgGrid background-size (60px)
const POOL_SIZE = 400;

/*
 * DENSITY CONSTANT — derived from the About section:
 *   About section ≈ 24 cols × 80 rows = 1920 cells, 12 trails
 *   → 1 trail per ~160 cells
 * By using this ratio, every page will visually match the About section
 * regardless of how tall or short the page is.
 */
const CELLS_PER_TRAIL = 160;
const MIN_TRAILS = 2;
const MAX_TRAILS = 20;
const TRAIL_STEP_MS = 60;

export default function FlashingGrid() {
  const containerRef = useRef<HTMLDivElement>(null);
  const cellsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!containerRef.current) return;

    let cols = 0;
    let rows = 0;
    let exclusionZones: { top: number; bottom: number; left: number; right: number }[] = [];

    // Trails array — will be rebuilt on resize
    let trails: { x: number; y: number; dir: number }[] = [];

    const rebuildTrails = (count: number) => {
      // Preserve existing trails, add/remove to match count
      while (trails.length > count) trails.pop();
      while (trails.length < count) {
        trails.push({
          x: Math.floor(Math.random() * (cols || 20)),
          y: Math.floor(Math.random() * (rows || 10)),
          dir: Math.floor(Math.random() * 4),
        });
      }
    };

    const handleResize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      cols = Math.floor(rect.width / GRID_SIZE);
      rows = Math.floor(containerRef.current.offsetHeight / GRID_SIZE);

      // Auto-scale trail count to match About section density
      const totalCells = cols * rows;
      const idealTrails = Math.round(totalCells / CELLS_PER_TRAIL);
      const clampedTrails = Math.max(MIN_TRAILS, Math.min(MAX_TRAILS, idealTrails));
      rebuildTrails(clampedTrails);

      exclusionZones = [];
      const section = containerRef.current.closest('section, [data-flashing-container="true"]');
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

    const resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(containerRef.current);
    if (containerRef.current.parentElement) {
      resizeObserver.observe(containerRef.current.parentElement);
    }
    handleResize();

    const intervalId = setInterval(() => {
      if (cols === 0 || rows === 0) return;

      trails.forEach((trail) => {
        // Random chance to turn 90 degrees
        if (Math.random() < 0.15) {
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

        // Pick an available cell from the pool
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
        }, 2000);
      });
    }, TRAIL_STEP_MS);

    return () => {
      resizeObserver.disconnect();
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
