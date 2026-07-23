import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Bot, CheckCircle2, Clock, LogOut, Moon, Plug, ScrollText, Server, ShieldCheck, Sun,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useBackendStatus } from "@/components/ui/primitives";
import { useStore } from "@/store/useStore";
import { api, ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";

interface AISettings {
  hours_mode: "24_7" | "custom";
  hours_start: string;
  hours_end: string;
  hours_days: string[];
  out_of_hours_message: string;
  ignore_whatsapp_groups: boolean;
  watchdog_enabled: boolean;
  watchdog_inactivity_minutes: number;
}

interface AIProviderConfig {
  channel: string;
  status: string;
  custom_context: string | null;
  monthly_token_limit: number | null;
  tokens_used_this_month: number;
}

const WEEKDAYS: { key: string; label: string }[] = [
  { key: "mon", label: "Seg" }, { key: "tue", label: "Ter" }, { key: "wed", label: "Qua" },
  { key: "thu", label: "Qui" }, { key: "fri", label: "Sex" }, { key: "sat", label: "Sáb" }, { key: "sun", label: "Dom" },
];

const PROVIDER_LABELS: Record<string, string> = { openai: "OpenAI", anthropic: "Anthropic" };

interface NotificationPreference {
  category: string;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  password_reset: "Redefinição de senha",
  task_reminder: "Lembrete de tarefas",
  daily_briefing: "Briefing diário",
  budget_alert: "Alerta financeiro",
  inbox_new_message: "Nova mensagem no Inbox",
  watchdog_reactivated: "Watchdog reativou uma conversa",
};

const PERSONAL_CATEGORIES = ["task_reminder", "daily_briefing", "budget_alert"];
const SECURITY_CATEGORIES = ["password_reset"];
const BUSINESS_CATEGORIES = ["inbox_new_message", "watchdog_reactivated"];

type Section = "conta" | "aparencia" | "seguranca" | "notificacoes" | "negocio";

export default function SettingsPage() {
  const navigate = useNavigate();
  const isBackendOnline = useBackendStatus();
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);
  const logout = useStore((s) => s.logout);
  const mode = useStore((s) => s.mode);
  const { theme, setTheme } = useTheme();
  const [section, setSection] = useState<Section>("conta");

  const [phone, setPhone] = useState(user?.phone_number ?? "");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[] | null>(null);
  const [aiSettings, setAiSettings] = useState<AISettings | null>(null);
  const [providerConfigs, setProviderConfigs] = useState<AIProviderConfig[] | null>(null);
  const [savingAiSettings, setSavingAiSettings] = useState(false);

  useEffect(() => {
    api.get<NotificationPreference[]>("/api/notifications/preferences").then(setPreferences);
  }, []);

  const loadAiSettings = () => {
    api.get<AISettings>("/api/ai-settings").then(setAiSettings);
    api.get<AIProviderConfig[]>("/api/integrations").then((all) =>
      setProviderConfigs(all.filter((c) => c.channel === "openai" || c.channel === "anthropic"))
    );
  };

  useEffect(() => {
    if (mode === "business") loadAiSettings();
  }, [mode]);

  const saveAiSettings = async (patch: Partial<AISettings>) => {
    if (!aiSettings) return;
    const next = { ...aiSettings, ...patch };
    setAiSettings(next);
    setSavingAiSettings(true);
    try {
      await api.patch("/api/ai-settings", patch);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
      loadAiSettings();
    } finally {
      setSavingAiSettings(false);
    }
  };

  const toggleWeekday = (day: string) => {
    if (!aiSettings) return;
    const days = aiSettings.hours_days.includes(day)
      ? aiSettings.hours_days.filter((d) => d !== day)
      : [...aiSettings.hours_days, day];
    saveAiSettings({ hours_days: days });
  };

  const saveProviderConfig = async (channel: string, patch: Partial<AIProviderConfig>) => {
    setProviderConfigs((prev) => (prev ?? []).map((p) => (p.channel === channel ? { ...p, ...patch } : p)));
    try {
      await api.patch(`/api/integrations/${channel}/ai-config`, patch);
      toast.success(`Configuração da ${PROVIDER_LABELS[channel]} salva.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar.");
    }
  };

  const [outOfHoursDraft, setOutOfHoursDraft] = useState("");
  const [watchdogMinutesDraft, setWatchdogMinutesDraft] = useState("");
  const [providerDrafts, setProviderDrafts] = useState<Record<string, { context: string; limit: string }>>({});

  useEffect(() => {
    if (aiSettings) {
      setOutOfHoursDraft(aiSettings.out_of_hours_message);
      setWatchdogMinutesDraft(String(aiSettings.watchdog_inactivity_minutes));
    }
  }, [aiSettings]);

  useEffect(() => {
    if (!providerConfigs) return;
    setProviderDrafts(
      Object.fromEntries(
        providerConfigs.map((p) => [p.channel, { context: p.custom_context ?? "", limit: p.monthly_token_limit ? String(p.monthly_token_limit) : "" }])
      )
    );
  }, [providerConfigs]);

  useEffect(() => {
    setSection((current) => {
      if (mode === "business" && current === "notificacoes") return "conta";
      if (mode === "personal" && current === "negocio") return "conta";
      return current;
    });
  }, [mode]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const requestCode = async () => {
    setRequestingCode(true);
    try {
      const result = await api.post<{ whatsapp_sent: boolean }>("/api/auth/phone/request-code", { phone_number: phone });
      setCodeSent(true);
      updateUser({ phone_number: phone, phone_verified: false });
      toast.success(result.whatsapp_sent ? "Código enviado por WhatsApp." : "Código gerado — confira o log do backend (WhatsApp não configurado).");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível enviar o código.");
    } finally {
      setRequestingCode(false);
    }
  };

  const verifyCode = async () => {
    setVerifyingCode(true);
    try {
      const updated = await api.post<typeof user>("/api/auth/phone/verify-code", { code });
      if (updated) updateUser(updated);
      setCodeSent(false);
      setCode("");
      toast.success("Telefone verificado!");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Código inválido ou expirado.");
    } finally {
      setVerifyingCode(false);
    }
  };

  const toggleWhatsappOptIn = async (checked: boolean) => {
    try {
      const updated = await api.patch<typeof user>("/api/auth/me", { whatsapp_opted_in: checked });
      if (updated) updateUser(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar.");
    }
  };

  const updatePreference = async (category: string, patch: Partial<NotificationPreference>) => {
    const current = preferences?.find((p) => p.category === category);
    if (!current) return;
    const next = { ...current, ...patch };
    setPreferences((prev) => prev!.map((p) => (p.category === category ? next : p)));
    try {
      await api.put(`/api/notifications/preferences/${category}`, {
        email_enabled: next.email_enabled,
        whatsapp_enabled: next.whatsapp_enabled,
      });
    } catch {
      toast.error("Não foi possível salvar a preferência.");
    }
  };

  const NAV_GROUPS: { label: string; items: { id: Section; label: string }[] }[] = [
    {
      label: "Geral",
      items: [
        { id: "conta", label: "Conta" },
        { id: "aparencia", label: "Aparência" },
        { id: "seguranca", label: "Segurança" },
      ],
    },
    mode === "business"
      ? { label: "Empresarial", items: [{ id: "negocio", label: "Notificações & Automação" }] }
      : { label: "Pessoal", items: [{ id: "notificacoes", label: "Notificações" }] },
  ];

  const personalPrefs = preferences?.filter((p) => PERSONAL_CATEGORIES.includes(p.category)) ?? [];
  const securityPrefs = preferences?.filter((p) => SECURITY_CATEGORIES.includes(p.category)) ?? [];
  const businessPrefs = preferences?.filter((p) => BUSINESS_CATEGORIES.includes(p.category)) ?? [];

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <PageHeader
        title="Sistema"
        description="Conta, aparência e notificações."
        help={
          <p>
            Configurações da sua conta — dados de perfil, tema claro/escuro, segurança, notificações e o
            motor de IA (Gemini/OpenAI/Anthropic) usado pelo Prometheus em cada mundo. Fica escondido da
            navegação principal de propósito; acesse pelo menu do seu usuário, no canto inferior.
          </p>
        }
      />
      <div className="mx-auto flex w-full max-w-4xl flex-1 gap-6 overflow-hidden px-4 py-4 md:px-6">
        <nav className="w-44 shrink-0 space-y-4">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1 px-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">{group.label}</p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSection(item.id)}
                    className={cn(
                      "block w-full rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors",
                      section === item.id ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <div className="flex-1 space-y-4 overflow-y-auto pb-10">
          {section === "conta" && (
            <>
              <Card>
                <CardContent className="flex items-center gap-3 pt-1">
                  <div className={cn("flex size-9 items-center justify-center rounded-full", isBackendOnline ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive")}>
                    <Server size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium">Estado do backend</p>
                    <p className="text-xs text-muted-foreground">
                      {isBackendOnline ? "Comunicação estabelecida com sucesso." : "Servidor Python offline. Execute main.py."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Conta</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Username</span><span className="font-medium">{user?.username}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-muted-foreground">Email</span><span className="truncate font-medium">{user?.email}</span></div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Papel</span>
                    <Badge variant="outline">{user?.role}</Badge>
                  </div>
                  {user?.role === "admin" && (
                    <>
                      <Separator />
                      <Button variant="outline" asChild className="w-full gap-2">
                        <Link to="/admin"><ShieldCheck size={14} /> Painel de administração</Link>
                      </Button>
                    </>
                  )}
                  <Button variant="destructive" onClick={handleLogout} className="w-full gap-2">
                    <LogOut size={14} /> Sair
                  </Button>
                </CardContent>
              </Card>
            </>
          )}

          {section === "aparencia" && (
            <Card>
              <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Aparência</CardTitle></CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Tema</p>
                    <p className="text-xs text-muted-foreground">Claro ou escuro, aplicado em todo o sistema.</p>
                  </div>
                  <div className="flex overflow-hidden rounded-lg border">
                    <button
                      onClick={() => setTheme("light")}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs", theme === "light" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                    >
                      <Sun size={13} /> Claro
                    </button>
                    <button
                      onClick={() => setTheme("dark")}
                      className={cn("flex items-center gap-1.5 px-3 py-1.5 text-xs", theme === "dark" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                    >
                      <Moon size={13} /> Escuro
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {section === "seguranca" && (
            <Card>
              <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Segurança</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Telefone (formato internacional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="phone"
                      placeholder="+5511999999999"
                      value={phone}
                      onChange={(e) => { setPhone(e.target.value); setCodeSent(false); }}
                      disabled={requestingCode}
                    />
                    <Button variant="outline" onClick={requestCode} disabled={requestingCode || !phone.trim()} className="shrink-0">
                      {requestingCode ? "Enviando..." : "Enviar código"}
                    </Button>
                  </div>
                  {user?.phone_verified && user.phone_number === phone && !codeSent && (
                    <p className="flex items-center gap-1 text-xs text-emerald-500"><CheckCircle2 size={12} /> Telefone verificado</p>
                  )}
                </div>

                {codeSent && (
                  <div className="space-y-1.5 rounded-lg border bg-muted/30 p-3">
                    <Label htmlFor="code">Código recebido por WhatsApp</Label>
                    <div className="flex gap-2">
                      <Input id="code" placeholder="000000" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
                      <Button onClick={verifyCode} disabled={verifyingCode || code.length !== 6} className="shrink-0">
                        {verifyingCode ? "Verificando..." : "Verificar"}
                      </Button>
                    </div>
                    <button onClick={requestCode} disabled={requestingCode} className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                      Reenviar código
                    </button>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Receber notificações por WhatsApp</p>
                    <p className="text-xs text-muted-foreground">
                      {user?.phone_verified ? "Telefone verificado." : "Verifique seu telefone primeiro."}
                    </p>
                  </div>
                  <Switch
                    checked={user?.whatsapp_opted_in ?? false}
                    disabled={!user?.phone_verified}
                    onCheckedChange={toggleWhatsappOptIn}
                  />
                </div>

                {securityPrefs.length > 0 && (
                  <>
                    <Separator />
                    {securityPrefs.map((pref) => (
                      <div key={pref.category} className="flex items-center justify-between">
                        <p className="text-sm font-medium">{CATEGORY_LABELS[pref.category] ?? pref.category}</p>
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            Email
                            <Switch checked={pref.email_enabled} onCheckedChange={(v) => updatePreference(pref.category, { email_enabled: v })} />
                          </label>
                          <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            WhatsApp
                            <Switch
                              checked={pref.whatsapp_enabled}
                              disabled={!user?.whatsapp_opted_in}
                              onCheckedChange={(v) => updatePreference(pref.category, { whatsapp_enabled: v })}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {section === "notificacoes" && (
            <Card>
              <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Notificações — Pessoal</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                {personalPrefs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Carregando...</p>
                ) : (
                  personalPrefs.map((pref) => (
                    <div key={pref.category} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                      <p className="text-sm font-medium">{CATEGORY_LABELS[pref.category] ?? pref.category}</p>
                      <div className="flex items-center gap-4">
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          Email
                          <Switch checked={pref.email_enabled} onCheckedChange={(v) => updatePreference(pref.category, { email_enabled: v })} />
                        </label>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          WhatsApp
                          <Switch
                            checked={pref.whatsapp_enabled}
                            disabled={!user?.whatsapp_opted_in}
                            onCheckedChange={(v) => updatePreference(pref.category, { whatsapp_enabled: v })}
                          />
                        </label>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {section === "negocio" && (
            <>
              {businessPrefs.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Notificações do Inbox</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {businessPrefs.map((pref) => (
                      <div key={pref.category} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                        <p className="text-sm font-medium">{CATEGORY_LABELS[pref.category] ?? pref.category}</p>
                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          Email
                          <Switch checked={pref.email_enabled} onCheckedChange={(v) => updatePreference(pref.category, { email_enabled: v })} />
                        </label>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {!aiSettings ? (
                <p className="text-sm text-muted-foreground">Carregando...</p>
              ) : (
                <>
                  <Card>
                    <CardHeader><CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Clock size={13} /> Horário de atendimento da IA</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex overflow-hidden rounded-lg border w-fit">
                        <button
                          onClick={() => saveAiSettings({ hours_mode: "24_7" })}
                          className={cn("px-3 py-1.5 text-xs", aiSettings.hours_mode === "24_7" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                        >
                          24/7
                        </button>
                        <button
                          onClick={() => saveAiSettings({ hours_mode: "custom" })}
                          className={cn("px-3 py-1.5 text-xs", aiSettings.hours_mode === "custom" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}
                        >
                          Horário customizado
                        </button>
                      </div>

                      {aiSettings.hours_mode === "custom" && (
                        <>
                          <div className="flex items-center gap-2">
                            <div className="space-y-1">
                              <Label className="text-xs">Início</Label>
                              <Input
                                type="time"
                                value={aiSettings.hours_start}
                                onChange={(e) => saveAiSettings({ hours_start: e.target.value })}
                                className="w-28"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs">Fim</Label>
                              <Input
                                type="time"
                                value={aiSettings.hours_end}
                                onChange={(e) => saveAiSettings({ hours_end: e.target.value })}
                                className="w-28"
                              />
                            </div>
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-xs">Dias ativos</Label>
                            <div className="flex flex-wrap gap-1.5">
                              {WEEKDAYS.map((d) => (
                                <button
                                  key={d.key}
                                  onClick={() => toggleWeekday(d.key)}
                                  className={cn(
                                    "rounded-full border px-2.5 py-1 text-xs",
                                    aiSettings.hours_days.includes(d.key) ? "bg-primary text-primary-foreground border-primary" : "text-muted-foreground hover:bg-muted"
                                  )}
                                >
                                  {d.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <Separator />

                      <div className="space-y-1.5">
                        <Label className="text-xs">Mensagem fora do horário (use <code className="rounded bg-muted px-1">{"{{cliente}}"}</code>)</Label>
                        <Textarea
                          value={outOfHoursDraft}
                          onChange={(e) => setOutOfHoursDraft(e.target.value)}
                          rows={3}
                          className="text-sm"
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={outOfHoursDraft === aiSettings.out_of_hours_message || savingAiSettings}
                            onClick={() => saveAiSettings({ out_of_hours_message: outOfHoursDraft })}
                          >
                            Salvar mensagem
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="flex items-center justify-between pt-1">
                      <div>
                        <p className="text-sm font-medium">Ignorar grupos do WhatsApp</p>
                        <p className="text-xs text-muted-foreground">A IA nunca responde mensagens vindas de um grupo.</p>
                      </div>
                      <Switch checked={aiSettings.ignore_whatsapp_groups} onCheckedChange={(v) => saveAiSettings({ ignore_whatsapp_groups: v })} />
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Watchdog de conversas presas</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">Reativar IA automaticamente</p>
                          <p className="text-xs text-muted-foreground">Roda a cada 15 min — reativa quem ficou preso sem resposta.</p>
                        </div>
                        <Switch checked={aiSettings.watchdog_enabled} onCheckedChange={(v) => saveAiSettings({ watchdog_enabled: v })} />
                      </div>
                      {aiSettings.watchdog_enabled && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs whitespace-nowrap">Considerar presa após</Label>
                          <Input
                            type="number"
                            min={5}
                            value={watchdogMinutesDraft}
                            onChange={(e) => setWatchdogMinutesDraft(e.target.value)}
                            onBlur={() => {
                              const n = Math.max(5, Number(watchdogMinutesDraft) || 30);
                              setWatchdogMinutesDraft(String(n));
                              if (n !== aiSettings.watchdog_inactivity_minutes) saveAiSettings({ watchdog_inactivity_minutes: n });
                            }}
                            className="w-20"
                          />
                          <span className="text-xs text-muted-foreground">minutos sem resposta</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {providerConfigs && providerConfigs.some((p) => p.status === "connected") && (
                    <Card>
                      <CardHeader><CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Bot size={13} /> IA conectada — contexto e limite de uso</CardTitle></CardHeader>
                      <CardContent className="space-y-5">
                        {providerConfigs.filter((p) => p.status === "connected").map((p) => {
                          const draft = providerDrafts[p.channel] ?? { context: "", limit: "" };
                          const pct = p.monthly_token_limit ? Math.min(100, (p.tokens_used_this_month / p.monthly_token_limit) * 100) : 0;
                          return (
                            <div key={p.channel} className="space-y-2.5 border-b pb-4 last:border-0 last:pb-0">
                              <p className="text-sm font-semibold">{PROVIDER_LABELS[p.channel]}</p>
                              <div className="space-y-1">
                                <Label className="text-xs">Contexto customizado (instrução extra só pra essa IA)</Label>
                                <Textarea
                                  value={draft.context}
                                  onChange={(e) => setProviderDrafts((prev) => ({ ...prev, [p.channel]: { ...draft, context: e.target.value } }))}
                                  rows={2}
                                  className="text-sm"
                                  placeholder="Ex: Sempre mencione que fazemos entrega em até 48h."
                                />
                              </div>
                              <div className="flex items-end gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Limite mensal de tokens</Label>
                                  <Input
                                    type="number"
                                    min={0}
                                    value={draft.limit}
                                    onChange={(e) => setProviderDrafts((prev) => ({ ...prev, [p.channel]: { ...draft, limit: e.target.value } }))}
                                    placeholder="sem limite"
                                    className="w-32"
                                  />
                                </div>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    saveProviderConfig(p.channel, {
                                      custom_context: draft.context || null,
                                      monthly_token_limit: draft.limit ? Number(draft.limit) : null,
                                    })
                                  }
                                >
                                  Salvar
                                </Button>
                              </div>
                              {p.monthly_token_limit != null && (
                                <div className="space-y-1">
                                  <Progress value={pct} className="h-1.5" />
                                  <p className="font-mono text-[11px] text-muted-foreground">
                                    {p.tokens_used_this_month.toLocaleString("pt-BR")} / {p.monthly_token_limit.toLocaleString("pt-BR")} tokens este mês
                                  </p>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              <Card>
                <CardContent className="space-y-3 pt-5">
                  <Button variant="outline" asChild className="w-full justify-start gap-2">
                    <Link to="/integrations"><Plug size={14} /> Central de Integrações</Link>
                  </Button>
                  <Button variant="outline" asChild className="w-full justify-start gap-2">
                    <Link to="/logs"><ScrollText size={14} /> Ver logs de tudo que está acontecendo</Link>
                  </Button>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
