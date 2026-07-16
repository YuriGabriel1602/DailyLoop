import { useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { InputWithIcon } from "@/components/InputWithIcon";
import { AuthLayout } from "./AuthLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/api/auth/forgot-password", { email });
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  return (
    <AuthLayout>
      <div className="mb-6 space-y-1">
        <p className="font-mono text-[13px] text-muted-foreground">// esqueci a senha</p>
        <h2 className="text-2xl font-extrabold tracking-tight">Vamos recuperar.</h2>
        <p className="pt-1 text-sm text-muted-foreground">Informe seu email — se existir uma conta, enviaremos um link de redefinição.</p>
      </div>
      {sent ? (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
          <span>Se o email existir, o link de redefinição foi enviado.</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <InputWithIcon icon={Mail} id="email" type="email" autoFocus value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <Button type="submit" disabled={loading} className="w-full">
            {loading ? <Loader2 size={15} className="animate-spin" /> : "Enviar link"}
          </Button>
        </form>
      )}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        <Link to="/login" className="underline underline-offset-4 hover:text-foreground">Voltar ao login</Link>
      </p>
    </AuthLayout>
  );
}
