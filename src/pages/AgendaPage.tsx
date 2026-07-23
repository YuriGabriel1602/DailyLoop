import { useEffect, useState } from "react";
import { AlertTriangle, Calendar, Footprints, Link2, Mail } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  html_link: string;
}

interface GmailMessage {
  id: string;
  subject: string;
  from: string;
  snippet: string;
  actionable: boolean;
}

function useGoogleResource<T>(path: string) {
  const [data, setData] = useState<T | null>(null);
  const [notConnected, setNotConnected] = useState(false);

  useEffect(() => {
    api
      .get<T>(path)
      .then(setData)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 400) setNotConnected(true);
      });
  }, [path]);

  return { data, notConnected };
}

function NotConnectedCard({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-6 text-center text-muted-foreground">
      <Link2 size={18} className="opacity-50" />
      <p className="text-xs">{label} não conectado.</p>
      <Button asChild size="sm" variant="outline">
        <a href="/integrations">Conectar Google</a>
      </Button>
    </div>
  );
}

function formatEventTime(iso: string): string {
  if (iso.length === 10) return "dia inteiro"; // formato de data pura (evento sem hora)
  return new Date(iso).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

export default function AgendaPage() {
  const events = useGoogleResource<CalendarEvent[]>("/api/calendar/events");
  const fit = useGoogleResource<{ steps: number | null }>("/api/fit/today");
  const emails = useGoogleResource<GmailMessage[]>("/api/gmail/recent");

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Agenda"
        description="Google Calendar, Gmail e Fit — tudo cruzado com sua vida pessoal."
        help={
          <p>
            Mostra os eventos reais da sua conta Google, uma vez conectada em <strong className="text-foreground">Integrações Pessoais</strong>.
            Sem conexão, a tela mostra "conectar Google" em vez de inventar dados — nenhum evento aqui é
            de exemplo.
          </p>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 md:px-6">
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium"><Calendar size={15} /> Próximos 7 dias</CardTitle>
          </CardHeader>
          <CardContent>
            {events.notConnected ? (
              <NotConnectedCard label="Google Calendar" />
            ) : !events.data ? (
              <Skeleton className="h-24 w-full rounded-lg" />
            ) : events.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada agendado nos próximos 7 dias.</p>
            ) : (
              <div className="divide-y">
                {events.data.map((event) => (
                  <a key={event.id} href={event.html_link} target="_blank" rel="noreferrer" className="flex items-center gap-3 py-2.5 hover:opacity-80">
                    <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">{formatEventTime(event.start)}</span>
                    <span className="text-sm">{event.title}</span>
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 sm:grid-cols-2">
          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium"><Footprints size={15} /> Google Fit hoje</CardTitle>
            </CardHeader>
            <CardContent>
              {fit.notConnected ? (
                <NotConnectedCard label="Google Fit" />
              ) : !fit.data ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-semibold tabular-nums">
                  {fit.data.steps ?? "—"} <span className="text-sm font-normal text-muted-foreground">passos</span>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="gap-3">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm font-medium"><Mail size={15} /> Gmail — vida-admin</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {emails.notConnected ? (
                <NotConnectedCard label="Gmail" />
              ) : !emails.data ? (
                <Skeleton className="h-16 w-full rounded-lg" />
              ) : emails.data.filter((e) => e.actionable).length === 0 ? (
                <p className="text-sm text-muted-foreground">Nada que pareça exigir ação nos últimos emails.</p>
              ) : (
                emails.data.filter((e) => e.actionable).map((email) => (
                  <div key={email.id} className={cn("rounded-lg border px-2.5 py-2 text-xs")}>
                    <p className="flex items-center gap-1.5 font-medium"><AlertTriangle size={11} className="text-[var(--warning)]" /> {email.subject}</p>
                    <p className="mt-0.5 truncate text-muted-foreground">{email.snippet}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
