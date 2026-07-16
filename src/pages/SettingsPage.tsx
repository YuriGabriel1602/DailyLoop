import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { LogOut, MessageCircle, Server, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useBackendStatus } from "@/components/ui/primitives";
import { useStore } from "@/store/useStore";
import { api, ApiError } from "@/lib/api";

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
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const isBackendOnline = useBackendStatus();
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);
  const logout = useStore((s) => s.logout);
  const [toggles, setToggles] = useState([true, false, true]);
  const handleToggle = (index: number) => setToggles((prev) => prev.map((v, i) => (i === index ? !v : v)));

  const [phone, setPhone] = useState(user?.phone_number ?? "");
  const [savingPhone, setSavingPhone] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreference[] | null>(null);

  useEffect(() => {
    api.get<NotificationPreference[]>("/api/notifications/preferences").then(setPreferences);
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const savePhone = async () => {
    setSavingPhone(true);
    try {
      const updated = await api.patch<typeof user>("/api/auth/me", { phone_number: phone });
      if (updated) updateUser(updated);
      toast.success("Telefone salvo.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar o telefone.");
    } finally {
      setSavingPhone(false);
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

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader title="Configurações" onBack={() => navigate("/")} />
      <div className="mx-auto w-full max-w-2xl space-y-4 px-4 md:space-y-6 md:px-6">
        <Card>
          <CardContent className="flex items-center gap-3 pt-1">
            <div className={`flex size-9 items-center justify-center rounded-full ${isBackendOnline ? "bg-emerald-500/10 text-emerald-500" : "bg-destructive/10 text-destructive"}`}>
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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <MessageCircle size={13} /> WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">Telefone (formato internacional)</Label>
              <div className="flex gap-2">
                <Input id="phone" placeholder="+5511999999999" value={phone} onChange={(e) => setPhone(e.target.value)} />
                <Button variant="outline" onClick={savePhone} disabled={savingPhone} className="shrink-0">
                  {savingPhone ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Receber notificações por WhatsApp</p>
                <p className="text-xs text-muted-foreground">Precisa de um telefone salvo primeiro.</p>
              </div>
              <Switch
                checked={user?.whatsapp_opted_in ?? false}
                disabled={!user?.phone_number}
                onCheckedChange={toggleWhatsappOptIn}
              />
            </div>
          </CardContent>
        </Card>

        {preferences && (
          <Card>
            <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Canais por categoria</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {preferences.map((pref) => (
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
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Preferências</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {[
              { title: "Foco Estrito", desc: "Bloqueia distrações" },
              { title: "Áudio", desc: "Avisos sonoros" },
              { title: "Animações", desc: "Efeitos de transição" },
            ].map((item, i) => (
              <div key={item.title} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch checked={toggles[i]} onCheckedChange={() => handleToggle(i)} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
