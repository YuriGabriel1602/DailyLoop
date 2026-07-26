import { useEffect, useState } from "react";
import { AlertTriangle, Calendar, ExternalLink, Footprints, Link2, Mail, MapPin, Users, Video } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: number;
  title: string;
  start: string;
  end: string;
  all_day: boolean;
  html_link: string;
}

interface Attendee {
  email: string;
  displayName?: string;
  responseStatus?: string;
}

interface CalendarEventDetail extends CalendarEvent {
  description: string | null;
  location: string | null;
  timezone: string | null;
  status: string;
  hangout_link: string | null;
  creator_email: string | null;
  organizer_email: string | null;
  organizer_name: string | null;
  attendees: Attendee[];
  color_id: string | null;
  visibility: string | null;
  transparency: string | null;
  google_created_at: string | null;
  google_updated_at: string | null;
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
        <a href="/integracoes-pessoais">Conectar Google</a>
      </Button>
    </div>
  );
}

function formatEventTime(iso: string, allDay: boolean): string {
  if (allDay) return "dia inteiro";
  return new Date(iso).toLocaleString("pt-BR", { weekday: "short", hour: "2-digit", minute: "2-digit" });
}

function formatFullDateTime(iso: string, allDay: boolean): string {
  return new Date(iso).toLocaleString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    ...(allDay ? {} : { hour: "2-digit", minute: "2-digit" }),
  });
}

const RESPONSE_LABEL: Record<string, string> = {
  accepted: "Confirmou",
  declined: "Recusou",
  tentative: "Talvez",
  needsAction: "Sem resposta",
};

function EventDetailDialog({ eventId, onClose }: { eventId: number | null; onClose: () => void }) {
  const [event, setEvent] = useState<CalendarEventDetail | null>(null);

  useEffect(() => {
    if (!eventId) {
      setEvent(null);
      return;
    }
    api.get<CalendarEventDetail>(`/api/calendar/events/${eventId}`).then(setEvent);
  }, [eventId]);

  return (
    <Dialog open={eventId !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        {!event ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{event.title}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <Calendar size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="capitalize">{formatFullDateTime(event.start, event.all_day)}</p>
                  {!event.all_day && (
                    <p className="text-xs text-muted-foreground">
                      até {new Date(event.end).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      {event.timezone ? ` · ${event.timezone}` : ""}
                    </p>
                  )}
                </div>
              </div>

              {event.location && (
                <div className="flex items-start gap-2">
                  <MapPin size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <p>{event.location}</p>
                </div>
              )}

              {event.hangout_link && (
                <div className="flex items-start gap-2">
                  <Video size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <a href={event.hangout_link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Entrar na videochamada
                  </a>
                </div>
              )}

              {event.description && (
                <p className="whitespace-pre-wrap rounded-lg bg-muted/50 p-2.5 text-xs text-muted-foreground">
                  {event.description}
                </p>
              )}

              {event.attendees.length > 0 && (
                <div className="flex items-start gap-2">
                  <Users size={15} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="space-y-1">
                    {event.attendees.map((a) => (
                      <p key={a.email} className="text-xs">
                        {a.displayName || a.email}{" "}
                        {a.responseStatus && (
                          <span className="text-muted-foreground">
                            — {RESPONSE_LABEL[a.responseStatus] ?? a.responseStatus}
                          </span>
                        )}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {event.organizer_name || event.organizer_email ? (
                <p className="text-xs text-muted-foreground">
                  Organizado por {event.organizer_name || event.organizer_email}
                </p>
              ) : null}

              {event.html_link && (
                <Button asChild size="sm" variant="outline" className="w-full gap-1.5">
                  <a href={event.html_link} target="_blank" rel="noreferrer">
                    <ExternalLink size={13} /> Abrir no Google Agenda
                  </a>
                </Button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function AgendaPage() {
  const events = useGoogleResource<CalendarEvent[]>("/api/calendar/events?days_after=14");
  const fit = useGoogleResource<{ steps: number | null }>("/api/fit/today");
  const emails = useGoogleResource<GmailMessage[]>("/api/gmail/recent");
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Agenda"
        description="Google Calendar, Gmail e Fit — tudo cruzado com sua vida pessoal."
        help={
          <p>
            Mostra os eventos reais da sua conta Google, uma vez conectada em <strong className="text-foreground">Integrações Pessoais</strong>.
            Os eventos ficam sincronizados no sistema (não é buscado ao vivo a cada tela) — clique num
            evento pra ver todos os detalhes. Sem conexão, a tela mostra "conectar Google" em vez de
            inventar dados.
          </p>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 md:px-6">
        <Card className="gap-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium"><Calendar size={15} /> Próximos 14 dias</CardTitle>
          </CardHeader>
          <CardContent>
            {events.notConnected ? (
              <NotConnectedCard label="Google Calendar" />
            ) : !events.data ? (
              <Skeleton className="h-24 w-full rounded-lg" />
            ) : events.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nada agendado nos próximos 14 dias.</p>
            ) : (
              <div className="divide-y">
                {events.data.map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    className="flex w-full items-center gap-3 py-2.5 text-left hover:opacity-80"
                  >
                    <span className="w-28 shrink-0 font-mono text-xs text-muted-foreground">
                      {formatEventTime(event.start, event.all_day)}
                    </span>
                    <span className="text-sm">{event.title}</span>
                  </button>
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

      <EventDetailDialog eventId={selectedEventId} onClose={() => setSelectedEventId(null)} />
    </div>
  );
}
