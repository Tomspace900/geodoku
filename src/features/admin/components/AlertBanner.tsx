import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle } from "lucide-react";
import type { ReactNode } from "react";

type Tone = "brand" | "warning" | "error";

const TONE: Record<Tone, string> = {
  brand: "bg-brand/10 text-brand",
  warning: "bg-warning/10 text-warning",
  error: "bg-error/10 text-error",
};

/**
 * Bandeau d'alerte admin partagé : icône (✓ pour `brand`, ⚠ sinon) + contenu à
 * gauche, action optionnelle à droite. Structure unique des bandeaux pool /
 * grille de demain (`flex justify-between`, empilé en mobile).
 */
export function AlertBanner({
  tone,
  action,
  children,
}: {
  tone: Tone;
  action?: ReactNode;
  children: ReactNode;
}) {
  const Icon = tone === "brand" ? CheckCircle : AlertTriangle;
  return (
    <div
      className={cn(
        "mb-4 flex flex-col gap-3 rounded-lg px-3 py-3 sm:flex-row sm:items-center sm:justify-between",
        TONE[tone],
      )}
    >
      <div className="flex items-start gap-2 text-sm">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0">{children}</div>
      </div>
      {action}
    </div>
  );
}
