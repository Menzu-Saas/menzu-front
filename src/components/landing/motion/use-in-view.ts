"use client";

import { useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";

const noSubscription = () => () => {};

/**
 * True once the element has entered the viewport (then it stops observing). Without
 * IntersectionObserver it is true right away, so nothing waits for an event that never comes.
 */
export function useInView<T extends Element>(options: { rootMargin?: string; threshold?: number } = {}): [RefObject<T | null>, boolean] {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);
  const unsupported = useSyncExternalStore(noSubscription, () => typeof IntersectionObserver === "undefined", () => false);
  const { rootMargin = "0px 0px -12% 0px", threshold = 0 } = options;

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        setInView(true);
        observer.disconnect();
      }
    }, { rootMargin, threshold });
    observer.observe(element);
    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  return [ref, inView || unsupported];
}
