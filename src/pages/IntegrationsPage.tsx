import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AiEngineCard, BUSINESS_CHANNELS, CHANNEL_INFO, GithubPanel, IntegrationDetail,
  type Channel, type Integration,
} from "@/lib/integrationsShared";

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [selected, setSelected] = useState<Channel | null>(null);

  const load = () => {
    api.get<Integration[]>("/api/integrations").then((data) => {
      setIntegrations(data);
      setSelected((current) => current ?? BUSINESS_CHANNELS[0]);
    });
  };

  useEffect(load, []);

  const byChannel = Object.fromEntries((integrations ?? []).map((i) => [i.channel, i])) as Record<Channel, Integration>;
  const selectedIntegration = selected ? byChannel[selected] : null;
  const connectedCount = BUSINESS_CHANNELS.filter((c) => byChannel[c]?.status === "connected").length;

  return (
    <div className="flex h-full w-full flex-col overflow-y-auto pb-28">
      <PageHeader
        title="Integrações Empresariais"
        description="Cada integração resolve uma dor real do seu negócio — conecte só o que faz sentido."
        help={
          <>
            <p>Central de conexões do lado Empresarial. Clique num card pra conectar ou desconectar.</p>
            <ul>
              <li><strong className="text-foreground">WhatsApp/Instagram/Facebook</strong> — alimentam o Inbox e o CRM.</li>
              <li><strong className="text-foreground">GitHub</strong> — mostra seus repositórios reais (token pessoal).</li>
              <li><strong className="text-foreground">OpenAI/Anthropic</strong> — motor de IA alternativo pro Prometheus do lado Empresarial.</li>
            </ul>
          </>
        }
      />
      <div className="mx-auto w-full max-w-5xl flex-1 space-y-5 px-4 md:px-6">
        {!integrations ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
          </div>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">{connectedCount} conectada{connectedCount !== 1 ? "s" : ""} de {BUSINESS_CHANNELS.length}</p>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
              {BUSINESS_CHANNELS.map((channel) => {
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
              <div className={cn("grid gap-4", selectedIntegration.channel === "github" && selectedIntegration.status === "connected" ? "md:grid-cols-[320px_1fr]" : "max-w-sm")}>
                <IntegrationDetail integration={selectedIntegration} onChange={load} />
                {selectedIntegration.channel === "github" && selectedIntegration.status === "connected" && <GithubPanel />}
              </div>
            )}

            <AiEngineCard integrations={integrations} scope="business" />
          </>
        )}
      </div>
    </div>
  );
}
