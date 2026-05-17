import { useEffect, useRef, useState, type FormEvent } from "react";
import { Bot, Loader2, Send } from "lucide-react";

import { sendChatMessage } from "../../services/api";
import { useStore, type SessionName } from "../../store/useStore";

const sessionIntents: Array<{ keywords: string[]; session: SessionName; feedback: string }> = [
  { keywords: ["dinheiro", "finança", "financas", "gasto", "saldo"], session: "Financial", feedback: "Abri o financeiro para voce conferir o quadro." },
  { keywords: ["tarefa", "agenda", "hoje", "meta"], session: "Tasks", feedback: "Levei voce para a fila de tarefas." },
  { keywords: ["bio", "stress", "foco", "energia"], session: "Bio-Sync", feedback: "Abri o Bio-Sync para olhar o estado do dia." },
];

export const PrometheusTerminal = () => {
  const { chatHistory, addMessage, setActiveSession, toggleFocus, isFocusActive } = useStore();
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const applyLocalIntent = (query: string) => {
    const normalized = query.toLowerCase();
    const route = sessionIntents.find((intent) => intent.keywords.some((keyword) => normalized.includes(keyword)));

    if (route) {
      setActiveSession(route.session);
      addMessage("model", route.feedback);
    }

    if (normalized.includes("modo foco") || normalized.includes("preciso focar") || normalized.includes("hiperfoco")) {
      if (!isFocusActive) {
        toggleFocus();
      }
      addMessage("model", "Modo foco ligado. Vamos reduzir o ruido e trabalhar no essencial.");
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const query = input.trim();
    if (!query || isProcessing) return;

    setInput("");
    addMessage("user", query);
    applyLocalIntent(query);
    setIsProcessing(true);

    try {
      const data = await sendChatMessage(query);
      addMessage("model", data.response);
    } catch (error) {
      console.error("Prometheus backend error:", error);
      addMessage("model", "Backend offline no momento. Configure e rode o FastAPI para ativar o Prometheus completo.");
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isProcessing]);

  return (
    <div className="flex h-full flex-col p-6 font-mono">
      <div ref={scrollRef} className="custom-scrollbar flex-1 space-y-4 overflow-y-auto pr-2">
        {chatHistory.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`max-w-[90%] rounded-2xl border p-3 text-xs ${
              message.role === "user"
                ? "ml-auto border-blue-500/20 bg-blue-500/10 text-blue-100"
                : "border-white/10 bg-white/5 text-gray-200"
            }`}
          >
            <span className="mb-1 block text-[9px] font-bold uppercase tracking-[0.25em] text-white/35">
              {message.role === "user" ? "Arquiteto" : "Prometheus"}
            </span>
            {message.text}
          </div>
        ))}

        {isProcessing && (
          <div className="flex items-center gap-2 text-xs text-purple-300">
            <Loader2 size={12} className="animate-spin" />
            Pensando no proximo movimento...
          </div>
        )}
      </div>

      <form onSubmit={submit} className="mt-4 flex items-center gap-3 border-t border-white/10 pt-4">
        <Bot size={18} className="text-purple-300" />
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Converse com o Prometheus"
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-gray-600"
        />
        <button
          type="submit"
          disabled={isProcessing}
          className="rounded-xl bg-white px-3 py-2 text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
};
