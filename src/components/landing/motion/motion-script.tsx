/**
 * Runs before the landing paints: marks `<html data-motion="ok">` when the visitor accepts motion
 * and the browser can tell when things scroll into view. Without it (no JS, reduced motion, old
 * browsers) nothing is hidden and every demo shows its final state.
 */
const SCRIPT = `try{var d=document.documentElement;if("IntersectionObserver"in window&&!matchMedia("(prefers-reduced-motion: reduce)").matches)d.dataset.motion="ok"}catch(e){}`;

export function MotionScript() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
