import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Settings2 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { WhatsAppPersonalChatModal } from "@/components/WhatsAppPersonalChatModal";
import { cn } from "@/lib/utils";
import {
  AiEngineCard, CHANNEL_INFO, IntegrationDetail, PERSONAL_CHANNELS, type Channel, type Integration,
} from "@/lib/integrationsShared";

const OAUTH_RESULT_MESSAGES: Record<string, { text: string; variant: "success" | "error" }> = {
  conectado: { text: "Conectado com sucesso.", variant: "success" },
  sem_conta_business: {
    text: "Login feito, mas essa conta do Instagram não é Profissional (Business/Criador de conteúdo) — a Meta não libera troca de mensagens pra contas pessoais.",
    variant: "error",
  },
  erro: { text: "Não foi possível conectar — tente novamente.", variant: "error" },
};

export default function PersonalIntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [selected, setSelected] = useState<Channel | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = () => {
    api.get<Integration[]>("/api/integrations").then((data) => {
      setIntegrations(data);
      setSelected((current) => current ?? PERSONAL_CHANNELS[0]);
    });
  };

  useEffect(load, []);

  useEffect(() => {
    for (const key of ["google", "instagram_personal"]) {
      const value = searchParams.get(key);
      if (!value) continue;
      const message = OAUTH_RESULT_MESSAGES[value];
      if (message) (message.variant === "success" ? toast.success : toast.error)(message.text);
      searchParams.delete(key);
      setSearchParams(searchParams, { replace: true });
      break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

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
                const chatShortcut = channel === "whatsapp_personal" && connected;
                return (
                  <div
                    key={channel}
                    role="button"
                    tabIndex={0}
                    onClick={() => (chatShortcut ? setChatOpen(true) : setSelected(channel))}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") (chatShortcut ? setChatOpen(true) : setSelected(channel));
                    }}
                    className={cn(
                      "relative flex cursor-pointer flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition-colors hover:bg-muted/40",
                      selected === channel && "ring-2 ring-primary",
                      connected && "border-[var(--success)]/40"
                    )}
                  >
                    {chatShortcut && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelected(channel);
                        }}
                        className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <Settings2 size={12} />
                      </button>
                    )}
                    <span className="flex size-9 items-center justify-center rounded-lg text-white" style={{ background: info.color }}>
                      <info.icon size={16} />
                    </span>
                    <span className="text-[11px] font-medium leading-tight">{info.shortLabel}</span>
                    <span className={cn("text-[10px] font-mono", connected ? "text-[var(--success)]" : "text-muted-foreground")}>
                      {connected ? "conectado" : "conectar"}
                    </span>
                  </div>
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
      <WhatsAppPersonalChatModal open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
