import type { ReactNode } from "react";

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b bg-background/95 px-4 py-4 backdrop-blur-sm md:px-8 md:py-5">
    <div className="min-w-0">
      <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
      {description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
  </div>
);
