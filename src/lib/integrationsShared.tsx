import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CircleDot, Clock, GitPullRequest, Link2, Mail, Sparkles, Unlink } from "lucide-react";
import { SiAnthropic, SiFacebook, SiGithub, SiGooglecalendar, SiInstagram, SiWhatsapp } from "react-icons/si";
import type { IconType } from "react-icons";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type Channel =
  | "whatsapp"
  | "instagram"
  | "facebook"
  | "github"
  | "openai"
  | "anthropic"
  | "google"
  | "open_finance"
  | "whatsapp_personal";

export interface Integration {
  id: number | null;
  channel: Channel;
  external_account_id: string;
  status: "connected" | "disconnected";
  ai_default_mode: "24_7" | "off";
  created_at: string;
}

export const CHANNEL_INFO: Record<Channel, { label: string; shortLabel: string; icon: IconType; hint: string; tokenHint: string; messaging: boolean; color: string }> = {
  // Cores e ícones seguem a marca oficial de cada serviço (react-icons/si — Simple Icons)
  // à risca. OpenAI não tem marca disponível no pacote — Sparkles é o único fallback genérico.
  whatsapp: { label: "WhatsApp", shortLabel: "WhatsApp", icon: SiWhatsapp, hint: "ID da conta Business (WABA ID)", tokenHint: "Token do Meta Business Manager", messaging: true, color: "#25D366" },
  instagram: { label: "Instagram", shortLabel: "Instagram", icon: SiInstagram, hint: "ID da conta Business do Instagram", tokenHint: "Token do Meta Business Manager", messaging: true, color: "#E4405F" },
  facebook: { label: "Facebook", shortLabel: "Facebook", icon: SiFacebook, hint: "ID da Página", tokenHint: "Token do Meta Business Manager", messaging: true, color: "#0866FF" },
  github: { label: "GitHub", shortLabel: "GitHub", icon: SiGithub, hint: "Usuário/organização do GitHub", tokenHint: "Personal Access Token (escopo repo)", messaging: false, color: "#181717" },
  openai: { label: "OpenAI", shortLabel: "OpenAI", icon: Sparkles as unknown as IconType, hint: "Nome pra identificar (opcional)", tokenHint: "API key da OpenAI", messaging: false, color: "#10a37f" },
  anthropic: { label: "Anthropic", shortLabel: "Anthropic", icon: SiAnthropic, hint: "Nome pra identificar (opcional)", tokenHint: "API key da Anthropic", messaging: false, color: "#D97757" },
  google: { label: "Google (Calendar/Gmail/Fit)", shortLabel: "Google", icon: SiGooglecalendar, hint: "", tokenHint: "", messaging: false, color: "#4285F4" },
  open_finance: { label: "Open Finance", shortLabel: "Open Finance", icon: Clock as unknown as IconType, hint: "", tokenHint: "", messaging: false, color: "#2fa1a8" },
  whatsapp_personal: { label: "WhatsApp Pessoal", shortLabel: "WhatsApp Pessoal", icon: SiWhatsapp, hint: "ID da conta Business (número pessoal)", tokenHint: "Token do Meta Business Manager", messaging: false, color: "#0d8a4f" },
};

export const BUSINESS_CHANNELS: Channel[] = ["whatsapp", "instagram", "facebook", "github", "openai", "anthropic"];
export const PERSONAL_CHANNELS: Channel[] = ["google", "open_finance", "whatsapp_personal"];

export function IntegrationDetail({ integration, onChange }: { integration: Integration; onChange: () => void }) {
  const info = CHANNEL_INFO[integration.channel];
  const [accountId, setAccountId] = useState(integration.external_account_id);
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const connected = integration.status === "connected";

  const connect = async () => {
    if (!token.trim()) {
      toast.error("Preencha o token/chave de acesso.");
      return;
    }
    setBusy(true);
    try {
      await api.post(`/api/integrations/${integration.channel}/connect`, {
        external_account_id: accountId,
        access_token: token,
      });
      setToken("");
      toast.success(`${info.label} conectado.`);
      onChange();
    } catch {
      toast.error(`Não foi possível conectar o ${info.label}.`);
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await api.post(`/api/integrations/${integration.channel}/disconnect`);
      toast.success(`${info.label} desconectado.`);
      onChange();
    } finally {
      setBusy(false);
    }
  };

  const toggleAiMode = async (checked: boolean) => {
    await api.patch(`/api/integrations/${integration.channel}`, { ai_default_mode: checked ? "24_7" : "off" });
    onChange();
  };

  const connectGoogle = async () => {
    setBusy(true);
    try {
      const { auth_url } = await api.get<{ auth_url: string }>("/api/google/connect");
      window.location.href = auth_url;
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível iniciar a conexão com o Google.");
      setBusy(false);
    }
  };

  if (integration.channel === "open_finance") {
    return (
      <Card className="gap-3">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm font-medium">
            <span className="flex items-center gap-2"><info.icon size={15} /> {info.label}</span>
            <Badge variant="outline">Em breve</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">
            Precisa de uma conta num provedor Open Finance (ex: Pluggy, Belvo) — ainda não temos essa
            credencial configurada, então não há dado real pra mostrar aqui ainda.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2"><info.icon size={15} /> {info.label}</span>
          <Badge variant={connected ? "secondary" : "outline"}>{connected ? "Conectado" : "Desconectado"}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {connected ? (
          <>
            <p className="truncate text-xs text-muted-foreground">Conta: {integration.external_account_id || "—"}</p>
            {info.messaging && (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <p className="text-xs font-medium">IA responde 24/7</p>
                  <p className="text-[11px] text-muted-foreground">Desligue pra atender manualmente por padrão</p>
                </div>
                <Switch checked={integration.ai_default_mode === "24_7"} onCheckedChange={toggleAiMode} />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={disconnect} disabled={busy} className="w-full gap-1.5">
              <Unlink size={13} /> Desconectar
            </Button>
          </>
        ) : integration.channel === "google" ? (
          <>
            <p className="text-xs text-muted-foreground">
              Conecta Calendar, Gmail e Fit de uma vez via login do Google. Se o servidor ainda não tiver
              GOOGLE_CLIENT_ID/SECRET configurados, isso vai mostrar um erro claro em vez de travar.
            </p>
            <Button size="sm" onClick={connectGoogle} disabled={busy} className="w-full gap-1.5">
              <Link2 size={13} /> Conectar com Google
            </Button>
          </>
        ) : (
          <>
            <div className="space-y-1.5">
              <Label className="text-xs">{info.hint}</Label>
              <Input value={accountId} onChange={(e) => setAccountId(e.target.value)} placeholder="Opcional" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">{info.tokenHint}</Label>
              <Input value={token} onChange={(e) => setToken(e.target.value)} type="password" placeholder="Cole aqui" />
            </div>
            <Button size="sm" onClick={connect} disabled={busy} className="w-full gap-1.5">
              <Link2 size={13} /> Conectar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

const EMAIL_PRESETS: Record<string, { imap_host: string; imap_port: number; smtp_host: string; smtp_port: number }> = {
  gmail: { imap_host: "imap.gmail.com", imap_port: 993, smtp_host: "smtp.gmail.com", smtp_port: 587 },
  outlook: { imap_host: "outlook.office365.com", imap_port: 993, smtp_host: "smtp.office365.com", smtp_port: 587 },
};

interface EmailAccountInfo {
  id: number;
  email_address: string;
  imap_host: string;
  imap_port: number;
  smtp_host: string;
  smtp_port: number;
  status: "connected" | "disconnected";
  last_synced_at: string | null;
}

export function EmailAccountCard() {
  const [account, setAccount] = useState<EmailAccountInfo | null | undefined>(undefined);
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [preset, setPreset] = useState<"gmail" | "outlook" | "custom">("gmail");
  const [imapHost, setImapHost] = useState(EMAIL_PRESETS.gmail.imap_host);
  const [imapPort, setImapPort] = useState(EMAIL_PRESETS.gmail.imap_port);
  const [smtpHost, setSmtpHost] = useState(EMAIL_PRESETS.gmail.smtp_host);
  const [smtpPort, setSmtpPort] = useState(EMAIL_PRESETS.gmail.smtp_port);
  const [busy, setBusy] = useState(false);

  const load = () => {
    api.get<EmailAccountInfo | null>("/api/email-accounts").then(setAccount);
  };

  useEffect(load, []);

  const applyPreset = (p: "gmail" | "outlook" | "custom") => {
    setPreset(p);
    if (p !== "custom") {
      setImapHost(EMAIL_PRESETS[p].imap_host);
      setImapPort(EMAIL_PRESETS[p].imap_port);
      setSmtpHost(EMAIL_PRESETS[p].smtp_host);
      setSmtpPort(EMAIL_PRESETS[p].smtp_port);
    }
  };

  const connect = async () => {
    if (!emailAddress.trim() || !password.trim()) {
      toast.error("Preencha o email e a senha (ou senha de app).");
      return;
    }
    setBusy(true);
    try {
      await api.post("/api/email-accounts", {
        email_address: emailAddress,
        imap_host: imapHost,
        imap_port: imapPort,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        password,
      });
      setPassword("");
      toast.success("Conta de email conectada.");
      load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível conectar essa conta de email.");
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try {
      await api.delete("/api/email-accounts");
      toast.success("Email desconectado.");
      load();
    } finally {
      setBusy(false);
    }
  };

  if (account === undefined) return <Skeleton className="h-40 w-full max-w-sm rounded-xl" />;

  return (
    <Card className="max-w-sm gap-3">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2"><Mail size={15} /> Email</span>
          <Badge variant={account?.status === "connected" ? "secondary" : "outline"}>
            {account?.status === "connected" ? "Conectado" : "Desconectado"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {account?.status === "connected" ? (
          <>
            <p className="truncate text-xs text-muted-foreground">Conta: {account.email_address}</p>
            <p className="text-[11px] text-muted-foreground">
              Só traz os emails pra caixa unificada do Inbox — a IA ainda não responde email
              automaticamente. Resposta manual sai por SMTP.
            </p>
            <Button variant="outline" size="sm" onClick={disconnect} disabled={busy} className="w-full gap-1.5">
              <Unlink size={13} /> Desconectar
            </Button>
          </>
        ) : (
          <>
            <div className="flex gap-1">
              {(["gmail", "outlook", "custom"] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => applyPreset(p)}
                  className={cn(
                    "flex-1 rounded-md border px-2 py-1 text-[11px] capitalize",
                    preset === p ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground"
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Endereço de email</Label>
              <Input value={emailAddress} onChange={(e) => setEmailAddress(e.target.value)} placeholder="voce@empresa.com" />
            </div>
            {preset === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs">Host IMAP</Label>
                  <Input value={imapHost} onChange={(e) => setImapHost(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Porta IMAP</Label>
                  <Input type="number" value={imapPort} onChange={(e) => setImapPort(Number(e.target.value))} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Host SMTP</Label>
                  <Input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Porta SMTP</Label>
                  <Input type="number" value={smtpPort} onChange={(e) => setSmtpPort(Number(e.target.value))} />
                </div>
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Senha (Gmail/Outlook exigem senha de app)</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="Cole aqui" />
            </div>
            <Button size="sm" onClick={connect} disabled={busy} className="w-full gap-1.5">
              <Link2 size={13} /> Conectar
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface GithubRepo {
  name: string;
  full_name: string;
  private: boolean;
  description: string | null;
  language: string | null;
  open_issues_count: number;
  open_prs_count: number;
  updated_at: string;
  html_url: string;
}

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "#3178c6",
  JavaScript: "#f1e05a",
  Python: "#3572A5",
  Rust: "#dea584",
  Go: "#00ADD8",
  HTML: "#e34c26",
  CSS: "#563d7c",
};

function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = diffMs / 3_600_000;
  if (hours < 1) return "agora há pouco";
  if (hours < 24) return `há ${Math.round(hours)}h`;
  return `há ${Math.round(hours / 24)}d`;
}

export function GithubPanel() {
  const [repos, setRepos] = useState<GithubRepo[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<GithubRepo[]>("/api/github/repos")
      .then(setRepos)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Não foi possível carregar os repositórios."));
  }, []);

  if (error) return <p className="text-sm text-muted-foreground">{error}</p>;
  if (!repos) return <Skeleton className="h-40 w-full rounded-xl" />;
  if (repos.length === 0) return <p className="text-sm text-muted-foreground">Nenhum repositório encontrado.</p>;

  return (
    <Card className="gap-0 divide-y p-0">
      {repos.map((repo) => (
        <a
          key={repo.full_name}
          href={repo.html_url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-muted/40"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-semibold">{repo.name}</span>
              <Badge variant="outline" className="font-mono text-[9px]">{repo.private ? "private" : "public"}</Badge>
            </div>
            {repo.description && <p className="mt-0.5 truncate text-xs text-muted-foreground">{repo.description}</p>}
            <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
              {repo.language && (
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ background: LANGUAGE_COLORS[repo.language] ?? "#8b93a7" }} />
                  {repo.language}
                </span>
              )}
              <span>atualizado {formatRelativeTime(repo.updated_at)}</span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3 font-mono text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><GitPullRequest size={12} /> {repo.open_prs_count}</span>
            <span className="flex items-center gap-1"><CircleDot size={12} /> {repo.open_issues_count}</span>
          </div>
        </a>
      ))}
    </Card>
  );
}

const PROVIDER_LABELS: Record<"gemini" | "openai" | "anthropic", string> = {
  gemini: "Gemini",
  openai: "OpenAI",
  anthropic: "Anthropic",
};

export function AiEngineCard({ integrations, scope }: { integrations: Integration[]; scope: "personal" | "business" }) {
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);

  const availableProviders = (["gemini", "openai", "anthropic"] as const).filter(
    (p) => p === "gemini" || integrations.find((i) => i.channel === p)?.status === "connected"
  );

  const setProvider = async (field: "ai_provider_personal" | "ai_provider_business", value: string) => {
    const updated = await api.patch<{ ai_provider_personal: string; ai_provider_business: string }>("/api/auth/me", {
      [field]: value,
    });
    updateUser(updated as any);
  };

  if (!user) return null;

  const field = scope === "personal" ? "ai_provider_personal" : "ai_provider_business";
  const label = scope === "personal" ? "Assistente pessoal (Diário, chat Prometheus)" : "Atendimento de leads (Inbox)";

  return (
    <Card className="max-w-lg gap-3">
      <CardHeader>
        <CardTitle className="text-sm font-medium">Motor de IA</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground">
          A chave da OpenAI/Anthropic é conectada na Central de Integrações Empresarial — aqui você só
          escolhe qual provedor atende {scope === "personal" ? "seu assistente pessoal" : "seus leads"}.
        </p>
        <div className="flex items-center justify-between gap-3">
          <Label className="text-xs">{label}</Label>
          <Select value={user[field] ?? "gemini"} onValueChange={(v) => setProvider(field, v)}>
            <SelectTrigger size="sm" className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {availableProviders.map((p) => <SelectItem key={p} value={p}>{PROVIDER_LABELS[p]}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
}
