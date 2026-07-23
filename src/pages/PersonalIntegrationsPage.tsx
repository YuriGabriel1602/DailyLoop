import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AiEngineCard, CHANNEL_INFO, IntegrationDetail, PERSONAL_CHANNELS, type Channel, type Integration,
} from "@/lib/integrationsShared";

export default function PersonalIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [selected, setSelected] = useState<Channel | null>(null);

  const load = () => {
    api.get<Integration[]>("/api/integrations").then((data) => {
      setIntegrations(data);
      setSelected((current) => current ?? PERSONAL_CHANNELS[0]);
    });
  };

  useEffect(load, []);

  const byChannel = Object.fromEntries((integrations ?? []).map((i) => [i.channel, i])) as Record<Channel, Integration>;
  const selectedIntegration = selected ? byChannel[selected] : null;
  const connectedCount = PERSONAL_CHANNELS.filter((c) => byChannel[c]?.status === "connected").length;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto pb-28">
      <PageHeader
        title="Integrações Pessoais"
        description="Google Calendar/Gmail/Fit, Open Finance e WhatsApp pessoal — cada uma com uma dor real da sua vida."
        help={
          <>
            <p>Central de conexões do lado Pessoal.</p>
            <ul>
              <li><strong className="text-foreground">Google</strong> — Calendar/Gmail/Fit alimentam a Agenda.</li>
              <li><strong className="text-foreground">Open Finance</strong> — em breve, depende de um provedor externo.</li>
              <li><strong className="text-foreground">WhatsApp Pessoal</strong> — só faz sentido se você tiver um segundo número.</li>
            </ul>
            <p>Sem conectar nada, as telas que dependem dessas integrações mostram "desconectado" — nenhum dado é inventado.</p>
          </>
        }
      />
      <div className="mx-auto w-full max-w-3xl flex-1 space-y-5 px-4 md:px-6">
        {!integrations ? (
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{connectedCount} conectada{connectedCount !== 1 ? "s" : ""} de {PERSONAL_CHANNELS.length}</p>
            <div className="grid grid-cols-3 gap-3">
              {PERSONAL_CHANNELS.map((channel) => {
                const info = CHANNEL_INFO[channel];
                const integration = byChannel[channel];
                const connected = integration?.status === "connected";
                return (
                  <button
                    key={channel}
                    onClick={() => setSelected(channel)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition-colors hover:bg-muted/40",
                      selected === channel && "ring-2 ring-primary",
                      connected && "border-[var(--success)]/40"
                    )}
                  >
                    <span className="flex size-9 items-center justify-center rounded-lg text-white" style={{ background: info.color }}>
                      <info.icon size={16} />
                    </span>
                    <span className="text-[11px] font-medium leading-tight">{info.shortLabel}</span>
                    <span className={cn("text-[10px] font-mono", connected ? "text-[var(--success)]" : "text-muted-foreground")}>
                      {connected ? "conectado" : "conectar"}
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedIntegration && (
              <div className="max-w-sm">
                <IntegrationDetail integration={selectedIntegration} onChange={load} />
              </div>
            )}

            <AiEngineCard integrations={integrations} scope="personal" />
          </>
        )}
      </div>
    </div>
  );
}
