import { X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: ReactNode;
  /**
   * Titre lu par les lecteurs d'écran seulement, quand le contenu porte déjà
   * le sien (le jour de « Mes stats » : sa date, entre ‹ ›).
   */
  hideTitle?: boolean;
  subtitle?: ReactNode;
  closeLabel: string;
  /** `lg` pour une grille et son anneau côte à côte sur ordinateur. */
  width?: "md" | "lg";
  children: ReactNode;
};

/**
 * Tiroir de la règle des contenants (`docs/DESIGN_SYSTEM.md`) : une saisie
 * rapide ou une seule sorte d'information qu'on parcourt. Il monte du bas et
 * se ferme d'un geste, sur téléphone comme sur ordinateur, où il garde une
 * largeur de lecture et une croix, faute de geste naturel à la souris. Titre
 * simple (serif droit), sous-titre en petite ligne.
 */
export function SheetDrawer({
  open,
  onOpenChange,
  title,
  hideTitle = false,
  subtitle,
  closeLabel,
  width = "md",
  children,
}: Props) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent
        // Sans sous-titre, rien ne décrit le tiroir : Radix l'attend explicite.
        {...(subtitle ? {} : { "aria-describedby": undefined })}
        className={cn(
          "mx-auto mt-10 flex max-h-[94svh] w-full flex-col overflow-x-clip pb-[env(safe-area-inset-bottom)] sm:mt-24",
          width === "md" ? "sm:max-w-lg" : "sm:max-w-3xl",
        )}
      >
        <DrawerClose asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={closeLabel}
            className="absolute right-3 top-3 hidden size-8 sm:inline-flex"
          >
            <X aria-hidden />
          </Button>
        </DrawerClose>
        <div className={cn("px-5 pt-3", hideTitle ? "sr-only" : "pb-2")}>
          <DrawerTitle className="font-serif text-lg font-medium leading-snug text-on-surface">
            {title}
          </DrawerTitle>
          {subtitle && (
            <DrawerDescription className="mt-1 text-xs text-on-surface-variant">
              {subtitle}
            </DrawerDescription>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 pb-8">
          {children}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
