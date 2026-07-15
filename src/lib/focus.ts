const SILENT_FOCUS_ATTRIBUTE = "data-silent-focus";

/**
 * Restaure la continuité clavier sans afficher un ring programmatique. Dès que
 * l'utilisateur repart avec Tab, le blur retire la garde et les prochains
 * éléments retrouvent leur focus-visible natif.
 */
export function focusWithoutVisibleRing(target: HTMLElement | null): void {
  if (!target?.isConnected || target === document.body) return;
  const focusTarget = target;

  function clearSilentFocus() {
    focusTarget.removeAttribute(SILENT_FOCUS_ATTRIBUTE);
  }

  focusTarget.setAttribute(SILENT_FOCUS_ATTRIBUTE, "true");
  focusTarget.addEventListener("blur", clearSilentFocus, { once: true });
  focusTarget.focus({ preventScroll: true });

  if (document.activeElement !== focusTarget) {
    focusTarget.removeEventListener("blur", clearSilentFocus);
    clearSilentFocus();
  }
}
