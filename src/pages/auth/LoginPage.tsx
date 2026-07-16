import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Loader2, User } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputWithIcon } from "@/components/InputWithIcon";
import { PasswordInput } from "@/components/PasswordInput";
import { AuthLayout } from "./AuthLayout";

export default function LoginPage() {
  const navigate = useNavigate();
  const setAuth = useStore((s) => s.setAuth);
  const [usernameOrEmail, setUsernameOrEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post<{ access_token: string; user: any }>("/api/auth/login", {
        username_or_email: usernameOrEmail,
        password,
      });
      setAuth(data.user, data.access_token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao entrar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 space-y-1">
        <p className="font-mono text-[13px] text-muted-foreground">// entrar</p>
        <h2 className="text-2xl font-extrabold tracking-tight">Bem-vindo de volta.</h2>
        <p className="pt-1 text-sm text-muted-foreground">Acesse sua conta para continuar.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="usernameOrEmail">Username ou email</Label>
          <InputWithIcon icon={User} id="usernameOrEmail" autoFocus value={usernameOrEmail} onChange={(e) => setUsernameOrEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Senha</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">Esqueci minha senha</Link>
          </div>
          <PasswordInput id="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <Button type="submit" disabled={loading} className="w-full gap-1.5">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <>Entrar <ArrowRight size={15} /></>}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Ainda não tem conta? <Link to="/register" className="text-foreground underline underline-offset-4">Criar conta</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
