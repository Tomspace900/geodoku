import { type ReactNode, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Slide = { id: string; label: string; content: ReactNode };

type Props = {
  /** Pages, chacune recevant de quoi faire glisser vers une autre. */
  slides: (goTo: (index: number) => void) => Slide[];
  onSlideChange?: (index: number, source: "swipe" | "dots" | "link") => void;
  className?: string;
};

/**
 * Zone qui glisse à l'horizontale dans la modale de résultat (#70) : seule
 * elle bouge, le titre, l'anneau et les boutons restent en place. Défilement
 * natif à ancrage (`snap`), points discrets dessous, aucun texte d'aide.
 */
export function ResultSlides({ slides, onSlideChange, className }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  // Source du prochain changement de page : un tap annonce la sienne, sinon
  // c'est le doigt qui a fait glisser.
  const pendingSourceRef = useRef<"dots" | "link" | null>(null);

  function scrollTo(target: number, source: "dots" | "link") {
    const track = trackRef.current;
    const slide = track?.children[target] as HTMLElement | undefined;
    if (!track || !slide) return;
    pendingSourceRef.current = source;
    track.scrollTo({
      left: slide.offsetLeft - track.offsetLeft,
      behavior: "smooth",
    });
  }

  const list = slides((target) => scrollTo(target, "link"));

  function handleScroll() {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const next = Math.round(track.scrollLeft / track.clientWidth);
    if (next === index) return;
    setIndex(next);
    onSlideChange?.(next, pendingSourceRef.current ?? "swipe");
    pendingSourceRef.current = null;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {list.map((slide, slideIndex) => (
          <section
            key={slide.id}
            aria-label={slide.label}
            aria-hidden={slideIndex !== index}
            className="w-full shrink-0 snap-start"
          >
            {slide.content}
          </section>
        ))}
      </div>
      {list.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {list.map((slide, slideIndex) => (
            <Button
              key={slide.id}
              type="button"
              variant="ghost"
              size="auto"
              aria-label={slide.label}
              aria-current={slideIndex === index}
              onClick={() => scrollTo(slideIndex, "dots")}
              className={cn(
                "h-1.5 rounded-full p-0 transition-all hover:bg-on-surface-variant/60",
                slideIndex === index
                  ? "w-4 bg-on-surface-variant/60"
                  : "w-1.5 bg-on-surface-variant/20",
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
