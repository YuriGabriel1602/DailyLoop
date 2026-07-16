import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

const EVENTS = [
  "task.created → \"Revisar proposta financeira\"",
  "finance.import → 3 transações categorizadas",
  "backend.health → 200 OK",
  "prometheus.chat → resposta gerada em 412ms",
  "finance.stats → orçamento \"Lazer\" em 62%",
  "auth.session → token renovado",
  "task.completed → \"Sincronizar backlog\"",
  "notes.created → captura rápida salva",
  "admin.logs → 0 erros nas últimas 24h",
];

function timestamp() {
  const now = new Date();
  return now.toTimeString().slice(0, 8);
}

const MAX_LINES = 6;

export function LiveConsole() {
  const [lines, setLines] = useState<{ id: number; time: string; text: string }[]>([]);

  useEffect(() => {
    let i = 0;
    let id = 0;
    const pushLine = () => {
      setLines((prev) => {
        const next = [...prev, { id: id++, time: timestamp(), text: EVENTS[i % EVENTS.length] }];
        i++;
        return next.slice(-MAX_LINES);
      });
    };
    pushLine();
    const interval = setInterval(pushLine, 1800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-black/40">
      <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="size-2.5 rounded-full bg-white/15" />
        <span className="ml-2 font-mono text-[11px] text-zinc-500">system.log</span>
      </div>
      <div className="h-[168px] overflow-hidden px-4 py-3">
        <AnimatePresence initial={false}>
          {lines.map((line) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="truncate font-mono text-[11px] leading-6 text-zinc-400"
            >
              <span className="text-zinc-600">[{line.time}]</span> <span className="text-emerald-500">✓</span> {line.text}
            </motion.div>
          ))}
        </AnimatePresence>
        <span className="inline-block h-3 w-1.5 animate-pulse bg-primary/70 align-middle" />
      </div>
    </div>
  );
}
