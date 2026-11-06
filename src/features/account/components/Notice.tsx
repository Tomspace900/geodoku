import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Un message sous un champ du compte : erreur, information ou réussite. */
export function Notice({
  icon,
  children,
  tone = "error",
}: {
  icon?: ReactNode;
  children: ReactNode;
  tone?: "error" | "neutral" | "success";
}) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm",
        tone === "error" && "bg-error/10 text-error",
        tone === "neutral" && "bg-surface-low text-on-surface",
        tone === "success" && "bg-success/10 text-success",
      )}
    >
      {icon && <span className="mt-0.5 shrink-0 [&_svg]:size-4">{icon}</span>}
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}
