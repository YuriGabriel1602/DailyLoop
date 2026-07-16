import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "./AuthLayout";

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post("/api/auth/reset-password", { token, new_password: password });
      setSuccess(true);
      setTimeout(() => navigate("/login", { replace: true }), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 space-y-1.5">
        <h2 className="text-xl font-semibold tracking-tight">Redefinir senha</h2>
        <p className="text-sm text-muted-foreground">Escolha uma nova senha para sua conta.</p>
      </div>
      {error && <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
      {success ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>Senha redefinida! Levando você ao login...</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" type="password" autoFocus value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
          </div>
          <Button type="submit" disabled={loading || !token} className="w-full">
            {loading ? "Redefinindo..." : "Redefinir senha"}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">Voltar ao login</Link>
      </p>
    </AuthLayout>
  );
}
