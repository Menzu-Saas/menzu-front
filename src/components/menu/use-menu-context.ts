"use client";

import { useEffect, useRef, useState } from "react";
import { menuFavoritesKey, menuPositionKey, parseMenuFavorites, parseMenuPosition, type MenuPosition } from "./behavior";

export function useMenuContext(slug: string, initialMenuId: string) {
  const [position, setPosition] = useState<MenuPosition>({ query: "", menuId: initialMenuId, category: null, y: 0 });
  const [favorites, setFavorites] = useState<string[]>([]);
  const latest = useRef(position);
  const y = useRef(0);
  const navigationSaved = useRef(false);
  useEffect(() => { latest.current = position; }, [position]);

  useEffect(() => {
    navigationSaved.current = false;
    let saved: MenuPosition | null = null;
    let restored = false;
    try {
      saved = parseMenuPosition(sessionStorage.getItem(menuPositionKey(slug)));
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is read after hydration
      if (saved) setPosition(saved);
      setFavorites(parseMenuFavorites(localStorage.getItem(menuFavoritesKey(slug))));
    } catch { /* Browser storage may be disabled. */ }
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => {
        if (saved) { y.current = saved.y; window.scrollTo({ top: saved.y, behavior: "instant" }); }
        restored = true;
      });
    });
    const scroll = () => { y.current = window.scrollY; };
    const save = () => { if (!restored || navigationSaved.current) return; try { sessionStorage.setItem(menuPositionKey(slug), JSON.stringify({ ...latest.current, y: y.current })); } catch { /* Navigation still works without storage. */ } };
    const sync = (event: StorageEvent) => { if (event.key === menuFavoritesKey(slug)) setFavorites(parseMenuFavorites(event.newValue)); };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("pagehide", save);
    window.addEventListener("storage", sync);
    return () => { cancelAnimationFrame(frame); save(); window.removeEventListener("scroll", scroll); window.removeEventListener("pagehide", save); window.removeEventListener("storage", sync); };
  }, [slug]);

  function update(patch: Partial<MenuPosition>) { setPosition((current) => ({ ...current, ...patch })); }
  function savePosition() {
    // Next may reset scroll before unmount; do not overwrite this departure snapshot in cleanup.
    navigationSaved.current = true;
    try { sessionStorage.setItem(menuPositionKey(slug), JSON.stringify({ ...latest.current, y: window.scrollY })); } catch { /* Navigation still works without storage. */ }
  }
  function toggleFavorite(id: string) {
    const next = favorites.includes(id) ? favorites.filter((value) => value !== id) : [...favorites, id].slice(-500);
    setFavorites(next);
    try { localStorage.setItem(menuFavoritesKey(slug), JSON.stringify(next)); } catch { /* Favorites still work during this visit. */ }
  }
  return { ...position, update, favorites, toggleFavorite, savePosition };
}
