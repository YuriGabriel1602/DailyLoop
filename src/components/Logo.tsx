import { Infinity as InfinityIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function Logo({ className, iconOnly = false }: { className?: string; iconOnly?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <InfinityIcon size={16} strokeWidth={2.5} />
      </div>
      {!iconOnly && <span className="text-base font-semibold tracking-tight">DailyLoop</span>}
    </div>
  );
}
