import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export const PageHeader = ({
  title,
  description,
  actions,
  help,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  help?: ReactNode;
}) => (
  <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-background/95 px-4 py-4 backdrop-blur-sm md:px-8 md:py-5 md:pr-48">
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
        {help && (
          <Popover>
            <PopoverTrigger
              title="Como funciona esta página"
              className="flex size-5 shrink-0 items-center justify-center rounded-full text-muted-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
            >
              <CircleHelp size={15} />
            </PopoverTrigger>
            <PopoverContent side="bottom">
              <p className="mb-2 flex items-center gap-1.5 font-medium text-foreground">
                <CircleHelp size={14} className="text-primary" /> Como funciona
              </p>
              <div className="space-y-1.5 text-muted-foreground [&_li]:ml-4 [&_li]:list-disc [&_p]:leading-relaxed">
                {help}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>
      {description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
