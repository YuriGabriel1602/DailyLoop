import { useEffect, useRef, useState } from "react";
import { BookHeart, Send } from "lucide-react";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface JournalEntry {
  id: number;
  content: string;
  ai_reflection: string | null;
  mood_score: number | null;
  created_at: string;
}

export default function JournalPage() {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get<JournalEntry[]>("/api/journal").then((data) => setEntries([...data].reverse()));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const content = input;
    setInput("");
    setSending(true);
    try {
      const entry = await api.post<JournalEntry>("/api/journal", { content });
      setEntries((prev) => [...(prev ?? []), entry]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <PageHeader
        title="Diário"
        description="Escreva o que quiser — a IA organiza e reflete depois."
        help={
          <p>
            Escreva livremente, sem estrutura. Depois de salvar, o Prometheus lê a entrada e devolve uma
            reflexão curta — não é terapia nem conselho, é só um espelho pra te ajudar a pensar. Entradas
            com mais de 3 dias podem reaparecer na <strong className="text-foreground">Cápsula do Tempo</strong> do Painel.
          </p>
        }
      />
      <ScrollArea className="flex-1 px-4 md:px-6">
        <div className="mx-auto max-w-2xl space-y-4 py-4">
          {!entries ? (
            <div className="space-y-3">
              {[0, 1].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
              <BookHeart size={24} className="opacity-40" />
              <p className="text-sm">Nada por aqui ainda — escreva a primeira entrada.</p>
            </div>
          ) : (
            entries.map((entry) => (
              <div key={entry.id} className="space-y-2">
                <div className="rounded-2xl rounded-tr-sm border bg-card px-4 py-3 text-sm leading-relaxed">
                  {entry.content}
                </div>
                {entry.ai_reflection && (
                  <div className="rounded-2xl rounded-tl-sm bg-primary/10 px-4 py-3 text-sm leading-relaxed text-foreground">
                    <p className="mb-1 font-mono text-[10px] text-primary uppercase">prometheus notou</p>
                    {entry.ai_reflection}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>
      <div className="border-t p-4">
        <div className="mx-auto max-w-2xl">
          <div className="relative">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => (e.ctrlKey || e.metaKey) && e.key === "Enter" && send()}
              placeholder="Como foi seu dia? (Ctrl+Enter pra enviar)"
              rows={2}
              className="w-full resize-none rounded-xl border border-input bg-background py-2.5 pr-11 pl-4 text-sm outline-none focus:border-ring"
            />
            <Button size="icon-sm" onClick={send} disabled={!input.trim() || sending} className="absolute right-1.5 bottom-1.5">
              <Send size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
