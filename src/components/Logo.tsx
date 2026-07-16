import { Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  if (iconOnly) {
    return (
      <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground", className)}>
        <InfinityIcon size={16} strokeWidth={2.5} />
      </div>
    );
  }

  return (
    <span aria-label="DailyLoop" className={cn("inline-flex items-center text-xl leading-none font-extrabold tracking-tight", className)}>
      <span>Daily</span>
      <InfinityIcon size={18} strokeWidth={3} className="mx-[0.1em] shrink-0 text-primary" />
      <span className="text-primary">Loop</span>
    </span>
  );
}
