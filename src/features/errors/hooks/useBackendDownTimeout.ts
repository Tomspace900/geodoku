import { useEffect, useState } from "react";

const DEFAULT_DELAY_MS = 8_000;

export function useBackendDownTimeout(
  isLoading: boolean,
  delayMs: number = DEFAULT_DELAY_MS,
): boolean {
  const [isDown, setIsDown] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setIsDown(false);
      return;
    }
    const id = window.setTimeout(() => setIsDown(true), delayMs);
    return () => window.clearTimeout(id);
  }, [isLoading, delayMs]);

  return isDown;
}
