import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "./AuthLayout";

export default function RegisterPage() {
  const navigate = useNavigate();
  const setAuth = useStore((s) => s.setAuth);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await api.post<{ access_token: string; user: any }>("/api/auth/register", { username, email, password });
      setAuth(data.user, data.access_token);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Falha ao criar conta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">Criar conta</h2>
        <p className="text-sm text-muted-foreground">Sua conta é isolada — só você vê seus dados.</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
        <div className="space-y-1.5">
          <Label htmlFor="username">Username</Label>
          <Input id="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
        </div>
        <Button type="submit" disabled={loading} className="w-full gap-1.5">
          {loading ? "Criando..." : "Criar conta"} {!loading && <ArrowRight size={15} />}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Já tem conta? <Link to="/login" className="text-foreground underline underline-offset-4">Entrar</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
