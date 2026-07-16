import { useState } from "react";
import {
  AlertCircle, ArrowRight, Car, CheckCircle2, Cloud, Droplets, MapPin, Pause, Play,
  RefreshCw, Send, Server, Star, Sun, Terminal, ThermometerSun, Wind,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { useBackendStatus, useInterval, useTimeFormat } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function StatusBar({ isBackendOnline }: { isBackendOnline: boolean }) {
  const [time, setTime] = useState(new Date());
  useInterval(() => setTime(new Date()), 1000);
  return (
    <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur-sm md:px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold tabular-nums">{time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
        <div className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
          <Cloud size={13} /> Sistema Online
        </div>
      </div>
      <Badge variant={isBackendOnline ? "secondary" : "destructive"} className="gap-1.5">
        <Server size={11} /> {isBackendOnline ? "Backend online" : "Backend offline"}
      </Badge>
    </div>
  );
}

function UberCard() {
  const [expanded, setExpanded] = useState(false);
  return (
    <Card className="cursor-pointer gap-3" onClick={() => setExpanded((v) => !v)}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5"><Car size={14} /> Uber</span>
          <span className="text-emerald-500">A chegar</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-xl font-semibold">4 min</div>
        <p className="mt-1 text-xs text-muted-foreground">Viagem para o Escritório</p>
        {expanded && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border bg-muted/40 p-3">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-xs font-semibold">JS</div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between text-xs font-medium">
                João Silva <span className="flex items-center gap-0.5 text-amber-500"><Star size={10} fill="currentColor" /> 4.9</span>
              </div>
              <p className="text-xs text-muted-foreground">Tesla Model 3 • DXS-9090</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WeatherCard() {
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
          <span className="flex items-center gap-1.5"><ThermometerSun size={14} /> Clima Hoje</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">24°</div>
        <p className="mt-1 text-xs text-muted-foreground">Parcialmente nublado</p>
        <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin size={11} /> Porto Alegre, BR</p>
        <div className="mt-3 flex gap-4 border-t pt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><Droplets size={11} /> 62%</span>
          <span className="flex items-center gap-1"><Wind size={11} /> 14km/h</span>
          <span className="flex items-center gap-1"><Sun size={11} /> UV 6</span>
        </div>
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const user = useStore((s) => s.user);
  const isBackendOnline = useBackendStatus();

  const [mission, setMission] = useState("");
  const [localInput, setLocalInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [quickNote, setQuickNote] = useState("");
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  useInterval(() => {
    if (timeLeft > 0) setTimeLeft(timeLeft - 1);
    else setIsTimerRunning(false);
  }, isTimerRunning ? 1000 : null);

  const handleSetMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (localInput.trim()) {
      setMission(localInput);
      setIsTimerRunning(true);
    }
  };

  const handleSaveNote = async () => {
    if (!quickNote.trim() || !isBackendOnline) return;
    setNoteStatus("saving");
    try {
      await api.post("/api/notes", { content: quickNote });
      setQuickNote("");
      setNoteStatus("success");
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setNoteStatus("error");
    } finally {
      setTimeout(() => setNoteStatus("idle"), 2500);
    }
  };

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-28">
      <StatusBar isBackendOnline={isBackendOnline} />

      <div className="mx-auto w-full max-w-6xl space-y-4 p-4 md:space-y-6 md:p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6 xl:grid-cols-4">
          <Card className="flex min-h-[240px] flex-col justify-center p-6 md:col-span-2 md:p-10">
            {!mission ? (
              <div className="space-y-5">
                <Badge variant="secondary">Sistema pronto</Badge>
                <h1 className="text-2xl leading-tight font-semibold tracking-tight md:text-3xl">
                  Olá, {user?.username ?? "Arquiteto"}. Qual o seu próximo objetivo?
                </h1>
                <form onSubmit={handleSetMission} className="relative max-w-lg">
                  <input
                    autoFocus
                    type="text"
                    value={localInput}
                    onChange={(e) => setLocalInput(e.target.value)}
                    placeholder="Descreva a tarefa em foco..."
                    className="w-full rounded-xl border border-input bg-background py-3 pr-14 pl-4 text-sm outline-none focus:border-ring"
                  />
                  <Button type="submit" size="icon-sm" className="absolute top-1/2 right-1.5 -translate-y-1/2">
                    <ArrowRight size={16} />
                  </Button>
                </form>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="flex items-center gap-3">
                  <Badge className="animate-pulse">Em execução</Badge>
                  <button
                    onClick={() => { setMission(""); setIsTimerRunning(false); setTimeLeft(45 * 60); }}
                    className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  >
                    Cancelar
                  </button>
                </div>
                <h1 className="max-w-xl text-2xl leading-tight font-semibold break-words md:text-3xl">{mission}</h1>
                <div className="flex items-center gap-4">
                  <div className="font-mono text-5xl font-light tabular-nums">{useTimeFormat(timeLeft)}</div>
                  <Button size="icon-lg" onClick={() => setIsTimerRunning((v) => !v)}>
                    {isTimerRunning ? <Pause size={20} /> : <Play size={20} />}
                  </Button>
                </div>
              </div>
            )}
          </Card>

          <Card className="relative flex flex-col gap-3">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span className="flex items-center gap-1.5"><Terminal size={14} /> Captura Rápida</span>
                {!isBackendOnline && <span className="flex items-center gap-1 text-xs text-destructive"><AlertCircle size={11} /> Offline</span>}
                {noteStatus === "saving" && <span className="text-xs text-muted-foreground">Salvando...</span>}
                {noteStatus === "success" && <span className="flex items-center gap-1 text-xs text-emerald-500"><CheckCircle2 size={11} /> Salvo</span>}
                {noteStatus === "error" && <span className="flex items-center gap-1 text-xs text-destructive"><RefreshCw size={11} /> Falha</span>}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col">
              {isBackendOnline ? (
                <>
                  <textarea
                    value={quickNote}
                    onChange={(e) => setQuickNote(e.target.value)}
                    onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && handleSaveNote()}
                    placeholder="Descarregue uma ideia..."
                    className="min-h-[80px] flex-1 resize-none border-none bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  />
                  <Button size="icon-sm" variant="secondary" className="self-end" onClick={handleSaveNote} disabled={!quickNote.trim()}>
                    <Send size={14} />
                  </Button>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Servidor Python inacessível.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:gap-6">
          <UberCard />
          <WeatherCard />
        </div>
      </div>
    </div>
  );
}
