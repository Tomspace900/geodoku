import { Eyebrow } from "@/components/editorial/Eyebrow";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number | string;
  accent?: boolean;
};

export function StatBlock({ label, value, accent }: Props) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={cn(
          "font-serif text-3xl font-medium leading-none",
          accent ? "text-brand" : "text-on-surface",
        )}
      >
        {value}
      </span>
      <Eyebrow>{label}</Eyebrow>
    </div>
  );
}
