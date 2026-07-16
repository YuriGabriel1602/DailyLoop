import { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../lib/api";

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
    <div className="h-screen w-screen flex items-center justify-center bg-[#050505] text-white p-4">
      <div className="w-full max-w-sm bg-[#0a0a0b] border border-white/10 rounded-3xl p-8 space-y-5">
        <div>
          <h1 className="text-xl font-bold">Esqueci minha senha</h1>
          <p className="text-sm text-gray-500 mt-1">
            Informe seu email — se existir uma conta, enviaremos um link de redefinição.
          </p>
        </div>

        {sent ? (
          <div className="text-sm text-green-400 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
            Se o email existir, o link de redefinição foi enviado.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500/50"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-white text-black font-semibold rounded-xl py-3 text-sm disabled:opacity-50"
            >
              {loading ? "Enviando..." : "Enviar link"}
            </button>
          </form>
        )}

        <div className="text-xs text-gray-500 text-center">
          <Link to="/login" className="hover:text-white underline">Voltar ao login</Link>
        </div>
      </div>
    </div>
  );
}
