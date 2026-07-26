import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { Mail, Settings2 } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  AiEngineCard, BUSINESS_CHANNELS, CHANNEL_INFO, EmailAccountCard, GithubPanel, IntegrationDetail,
  type Channel, type Integration,
} from "@/lib/integrationsShared";

type Selection = Channel | "email";

const OAUTH_RESULT_MESSAGES: Record<string, { text: string; variant: "success" | "error" }> = {
  conectado: { text: "Conectado com sucesso.", variant: "success" },
  sem_conta_business: {
    text: "Login feito, mas essa conta do Instagram não é Profissional (Business/Criador de conteúdo) — a Meta não libera troca de mensagens pra contas pessoais.",
    variant: "error",
  },
  erro: { text: "Não foi possível conectar — tente novamente.", variant: "error" },
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [emailConnected, setEmailConnected] = useState(false);
  const [selected, setSelected] = useState<Selection | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = () => {
    api.get<Integration[]>("/api/integrations").then((data) => {
      setIntegrations(data);
      setSelected((current) => current ?? BUSINESS_CHANNELS[0]);
    });
    api.get<{ status: string } | null>("/api/email-accounts").then((account) => setEmailConnected(account?.status === "connected"));
  };

  useEffect(load, []);

  useEffect(() => {
    const value = searchParams.get("instagram");
    if (value) {
      const message = OAUTH_RESULT_MESSAGES[value];
      if (message) (message.variant === "success" ? toast.success : toast.error)(message.text);
      searchParams.delete("instagram");
      setSearchParams(searchParams, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const byChannel = Object.fromEntries((integrations ?? []).map((i) => [i.channel, i])) as Record<Channel, Integration>;
  const selectedIntegration = selected && selected !== "email" ? byChannel[selected] : null;
  const connectedCount = BUSINESS_CHANNELS.filter((c) => byChannel[c]?.status === "connected").length + (emailConnected ? 1 : 0);

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
              <li><strong className="text-foreground">Email</strong> — traz sua caixa de entrada pro Inbox (IMAP/SMTP); resposta manual, IA ainda não responde email.</li>
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
            <p className="text-xs text-muted-foreground">{connectedCount} conectada{connectedCount !== 1 ? "s" : ""} de {BUSINESS_CHANNELS.length + 1}</p>
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
              <button
                onClick={() => setSelected("email")}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border bg-card p-3 text-center transition-colors hover:bg-muted/40",
                  selected === "email" && "ring-2 ring-primary",
                  emailConnected && "border-[var(--success)]/40"
                )}
              >
                <span className="flex size-9 items-center justify-center rounded-lg bg-muted-foreground text-white">
                  <Mail size={16} />
                </span>
                <span className="text-[11px] font-medium leading-tight">Email</span>
                <span className={cn("text-[10px] font-mono", emailConnected ? "text-[var(--success)]" : "text-muted-foreground")}>
                  {emailConnected ? "conectado" : "conectar"}
                </span>
              </button>
            </div>

            {selectedIntegration && (
              <div className={cn("grid gap-4", selectedIntegration.channel === "github" && selectedIntegration.status === "connected" ? "md:grid-cols-[320px_1fr]" : "max-w-sm")}>
                <IntegrationDetail integration={selectedIntegration} onChange={load} />
                {selectedIntegration.channel === "github" && selectedIntegration.status === "connected" && <GithubPanel />}
                {selectedIntegration.channel === "whatsapp" && selectedIntegration.status === "connected" && (
                  <Link
                    to="/integrations/whatsapp-business"
                    className="inline-flex w-fit items-center gap-1.5 text-xs text-primary hover:underline"
                  >
                    <Settings2 size={13} /> Configurar templates e IA dessa WABA
                  </Link>
                )}
              </div>
            )}
            {selected === "email" && <EmailAccountCard />}

            <AiEngineCard integrations={integrations} scope="business" />
          </>
        )}
      </div>
    </div>
  );
}
