import { useEffect, useState } from "react";
import { ScrollText } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LogEntry {
  id: number;
  realm: "pessoal" | "empresarial";
  action: string;
  description: string;
  created_at: string;
}

function formatWhen(iso: string): string {
  const utcIso = /[zZ]|[+-]\d{2}:\d{2}$/.test(iso) ? iso : `${iso}Z`;
  return new Date(utcIso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const REALM_LABEL: Record<LogEntry["realm"], string> = { pessoal: "Pessoal", empresarial: "Empresarial" };

export default function LogsPage() {
  const [logs, setLogs] = useState<LogEntry[] | null>(null);
  const [filter, setFilter] = useState<"all" | LogEntry["realm"]>("all");

  useEffect(() => {
    api.get<LogEntry[]>("/api/logs").then(setLogs);
  }, []);

  const filtered = logs?.filter((l) => filter === "all" || l.realm === filter) ?? null;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Logs"
        description="Torre de controle — tudo que acontece, Pessoal e Empresarial, num só lugar."
        help={
          <p>
            Registro de eventos reais dos dois mundos — mudança de etapa no CRM, resposta automática da
            IA, tarefa concluída, ritual marcado, integração conectada. Só aparece aqui, no lado Empresarial,
            como uma visão de controle sobre tudo o que acontece na sua conta.
          </p>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-4 px-4 md:px-6">
        <div className="flex gap-2">
          {(["all", "empresarial", "pessoal"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                filter === f ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted"
              )}
            >
              {f === "all" ? "Tudo" : REALM_LABEL[f]}
            </button>
          ))}
        </div>

        {!filtered ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
            <ScrollText size={24} className="opacity-40" />
            <p className="text-sm">Nenhum evento ainda.</p>
          </div>
        ) : (
          <div className="divide-y rounded-xl border">
            {filtered.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px]",
                    entry.realm === "empresarial" ? "bg-[var(--biz)]/15 text-[var(--biz)]" : "bg-primary/10 text-primary"
                  )}
                >
                  {REALM_LABEL[entry.realm]}
                </span>
                <span className="min-w-0 flex-1 truncate">{entry.description}</span>
                <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{formatWhen(entry.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
