import { cn } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

type Props = {
  to: string;
  label: string;
  className?: string;
};

/**
 * Lien de retour en haut de page, discret et **non souligné** — le pattern
 * commun aux pages légales, à l'admin et à l'archive. À importer plutôt qu'à
 * recopier : c'est un `<Link>` stylé, pas un `<Button variant="link">` (qui,
 * lui, souligne).
 */
export function BackLink({ to, label, className }: Props) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-sm font-sans text-xs text-on-surface-variant underline-offset-2 transition-colors hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-surface/20 focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
        className,
      )}
    >
      <ArrowLeft className="size-3.5" aria-hidden="true" />
      {label}
    </Link>
  );
}
