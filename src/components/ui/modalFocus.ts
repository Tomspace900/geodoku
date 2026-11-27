import type { Dialog } from "@base-ui/react/dialog";
import { useState } from "react";
import { focusWithoutVisibleRing } from "@/lib/focus";

type FinalFocus = Dialog.Popup.Props["finalFocus"];

/**
 * Retour du focus à la fermeture d'un tiroir ou d'une modale : sur l'élément
 * qui l'avait avant l'ouverture, sans ring (`focusWithoutVisibleRing`). À
 * appeler dans un composant monté à l'ouverture (le popup), pour que l'élément
 * retenu soit bien celui d'avant. Un `finalFocus` explicite l'emporte.
 */
export function useSilentFinalFocus(finalFocus: FinalFocus): FinalFocus {
  const [opener] = useState(() =>
    typeof document !== "undefined" &&
    document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null,
  );
  if (finalFocus !== undefined) return finalFocus;
  return () => {
    focusWithoutVisibleRing(opener);
    return false;
  };
}
