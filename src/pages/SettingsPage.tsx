import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { LogOut, Server, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useBackendStatus } from "@/components/ui/primitives";
import { useStore } from "@/store/useStore";

export default function SettingsPage() {
  const navigate = useNavigate();
  const isBackendOnline = useBackendStatus();
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const [toggles, setToggles] = useState([true, false, true]);
  const handleToggle = (index: number) => setToggles((prev) => prev.map((v, i) => (i === index ? !v : v)));

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
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
