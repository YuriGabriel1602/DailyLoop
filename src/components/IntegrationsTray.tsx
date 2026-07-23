import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { BUSINESS_CHANNELS, CHANNEL_INFO, type Integration } from "@/lib/integrationsShared";

export function IntegrationsTray() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.get<Integration[]>("/api/integrations").then(setIntegrations).catch(() => setIntegrations([]));
  }, []);

  const connected = integrations.filter((i) => i.status === "connected");
  if (connected.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 px-3 pb-2">
      {connected.map((integration) => {
        const info = CHANNEL_INFO[integration.channel];
        const target = (BUSINESS_CHANNELS as string[]).includes(integration.channel) ? "/integrations" : "/integracoes-pessoais";
        return (
          <button
            key={integration.channel}
            title={`${info.label} · conectado`}
            onClick={() => navigate(target)}
            className="relative flex size-6 items-center justify-center rounded-md text-white"
            style={{ background: info.color }}
          >
            <info.icon size={11} />
            <span className="absolute -right-0.5 -bottom-0.5 size-1.5 rounded-full border border-card bg-[var(--success)]" />
          </button>
        );
      })}
    </div>
  );
}
