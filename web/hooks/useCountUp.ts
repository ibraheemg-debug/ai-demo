"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Smoothly animates a number from its previous value to `target`
 * using an ease-out cubic curve.
 *
 * Returns the current animated value and a boolean that flips true
 * for one animation cycle (used to trigger a CSS flash class).
 */
export function useCountUp(target: number, duration = 700): { value: number; flashing: boolean } {
  const [current, setCurrent] = useState(target);
  const [flashing, setFlashing] = useState(false);
  const prevRef = useRef(target);
  const rafRef  = useRef<number>(0);

  useEffect(() => {
    const start = prevRef.current;
    const end   = target;

    if (start === end) return;

    setFlashing(true);
    const timer = setTimeout(() => setFlashing(false), 350);

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased    = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(start + (end - start) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = end;
      }
    }

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      clearTimeout(timer);
    };
  }, [target, duration]);

  return { value: current, flashing };
}
