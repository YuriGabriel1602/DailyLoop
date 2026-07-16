import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, MessageCircle } from "lucide-react";
import { api, ApiError } from "@/lib/api";
import { useStore } from "@/store/useStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "./AuthLayout";

export default function VerifyPhonePage() {
  const navigate = useNavigate();
  const user = useStore((s) => s.user);
  const updateUser = useStore((s) => s.updateUser);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setVerifying(true);
    try {
      const updated = await api.post<typeof user>("/api/auth/phone/verify-code", { code });
      if (updated) updateUser(updated);
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Código inválido ou expirado.");
    } finally {
      setVerifying(false);
    }
  };

  const resendCode = async () => {
    if (!user?.phone_number) return;
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      await api.post("/api/auth/phone/request-code", { phone_number: user.phone_number });
      setInfo("Novo código enviado.");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Não foi possível reenviar o código.");
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 space-y-1">
        <p className="font-mono text-[13px] text-muted-foreground">// verificar conta</p>
        <h2 className="text-2xl font-extrabold tracking-tight">Confirme seu WhatsApp.</h2>
        <p className="flex items-center gap-1.5 pt-1 text-sm text-muted-foreground">
          <MessageCircle size={14} className="shrink-0" /> Enviamos um código para {user?.phone_number}.
        </p>
      </div>

      {error && <p className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
      {info && (
        <p className="mb-4 flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={13} /> {info}
        </p>
      )}

      <form onSubmit={verifyCode} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="code">Código de 6 dígitos</Label>
          <Input id="code" autoFocus placeholder="000000" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <Button type="submit" disabled={verifying || code.length !== 6} className="w-full">
          {verifying ? "Verificando..." : "Verificar"}
        </Button>
      </form>

      <button
        onClick={resendCode}
        disabled={resending}
        className="mt-4 w-full text-center text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
      >
        {resending ? "Reenviando..." : "Reenviar código"}
      </button>
    </AuthLayout>
  );
}
