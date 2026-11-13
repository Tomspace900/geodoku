import { useEffect, useRef } from "react";

/**
 * Un tap hors de l'élément (et non la perte du focus, que le dé ou la liste
 * des pays ne doivent pas provoquer) referme une édition sur place.
 */
export function useOutsidePointer<T extends HTMLElement>(
  active: boolean,
  onOutside: () => void,
) {
  const ref = useRef<T>(null);
  const latest = useRef(onOutside);
  latest.current = onOutside;

  useEffect(() => {
    if (!active) return;
    function handle(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        latest.current();
      }
    }
    document.addEventListener("pointerdown", handle);
    return () => document.removeEventListener("pointerdown", handle);
  }, [active]);

  return ref;
}
