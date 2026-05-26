import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { AccentBar } from "./AccentBar";
import { Eyebrow } from "./Eyebrow";

type HeadingTag = "h1" | "h2" | "h3";
type Size = "md" | "lg";

const TITLE_SIZE: Record<Size, string> = {
  md: "text-2xl",
  lg: "text-3xl",
};

type Props = {
  title: ReactNode;
  eyebrow?: ReactNode;
  leftIcon?: ReactNode;
  as?: HeadingTag;
  size?: Size;
  centered?: boolean;
  accentBar?: boolean;
  className?: string;
};

export function DisplayHeader({
  title,
  eyebrow,
  leftIcon,
  as = "h2",
  size = "md",
  centered = false,
  accentBar = true,
  className,
}: Props) {
  const TitleTag = as;
  const titleClass = cn(
    "font-serif font-medium italic leading-none text-on-surface",
    TITLE_SIZE[size],
  );
  return (
    <div
      className={cn(
        "flex flex-col",
        centered && "items-center text-center",
        className,
      )}
    >
      {leftIcon ? (
        <div className="flex items-center gap-2">
          {leftIcon}
          <TitleTag className={cn(titleClass, "mt-1")}>{title}</TitleTag>
        </div>
      ) : (
        <TitleTag className={titleClass}>{title}</TitleTag>
      )}
      {accentBar && <AccentBar className="mt-1" />}
      {eyebrow && <Eyebrow className="mt-1">{eyebrow}</Eyebrow>}
    </div>
  );
}
