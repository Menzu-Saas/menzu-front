"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const REDUCE = "(prefers-reduced-motion: reduce)";

function subscribeVisibility(onChange: () => void) {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
}

function subscribe(onChange: () => void) {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const query = window.matchMedia(REDUCE);
  query.addEventListener?.("change", onChange);
  return () => query.removeEventListener?.("change", onChange);
}

/**
 * Whether demos should skip straight to their final state: on the server, with reduced motion,
 * or in browsers without IntersectionObserver (they could never start).
 */
export function useStaticMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => typeof IntersectionObserver === "undefined" || Boolean(window.matchMedia?.(REDUCE).matches),
    () => true,
  );
}

/**
 * Step index of a demo, 0…length-1. Advances every `stepMs` while `active` and the tab is visible,
 * then stops on the last step. Static motion (see above) returns the last step immediately.
 */
export function useDemoSequence(length: number, active: boolean, stepMs = 900): number {
  const still = useStaticMotion();
  const [step, setStep] = useState(0);
  const visible = useSyncExternalStore(subscribeVisibility, () => document.visibilityState !== "hidden", () => true);

  const done = step >= length - 1;
  useEffect(() => {
    if (still || !active || !visible || done) return;
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, length - 1)), stepMs);
    return () => clearInterval(timer);
  }, [still, active, visible, done, length, stepMs]);

  return still ? length - 1 : step;
}
