import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export const PageHeader = ({ title, onBack }: { title: string; onBack: () => void }) => (
  <div className="sticky top-0 z-40 flex items-center gap-3 border-b bg-background/95 p-4 backdrop-blur-sm md:p-6">
    <Button variant="outline" size="icon-sm" onClick={onBack}>
      <ChevronLeft size={16} />
    </Button>
    <h1 className="truncate text-sm font-semibold">{title}</h1>
  </div>
);
