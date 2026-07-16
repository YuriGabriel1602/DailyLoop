import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Logo } from "@/components/Logo";

const PREVIEW_ITEMS = [
  { label: "Reunião com cliente às 15h", done: true },
  { label: "Revisar proposta financeira", done: true },
  { label: "Fechar o mês em Finanças", done: false },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid h-screen w-screen bg-background text-foreground lg:grid-cols-[0.92fr_1.08fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-[oklch(0.08_0_0)] p-10 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
            maskImage: "radial-gradient(circle at 30% 20%, black, transparent 75%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(circle at 15% 10%, color-mix(in oklch, var(--primary) 25%, transparent), transparent 55%)" }}
        />

        <Logo className="relative z-10" />

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 space-y-7">
          <div className="w-fit max-w-xs rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="mb-3 font-mono text-[11px] text-zinc-400">// hoje · em dia</p>
            <div className="space-y-3">
              {PREVIEW_ITEMS.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + i * 0.1, duration: 0.4 }}
                  className="flex items-center gap-3"
                >
                  <span
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full ${
                      item.done ? "bg-primary text-primary-foreground" : "animate-pulse bg-white/10 text-zinc-500"
                    }`}
                  >
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span className="flex-1 truncate text-sm text-zinc-200">{item.label}</span>
                </motion.div>
              ))}
            </div>
          </div>

          <h1 className="max-w-sm text-[28px] leading-[1.15] font-extrabold tracking-tight">
            Menos abas abertas de manhã. <span className="text-primary">Prometheus já organizou o seu dia.</span>
          </h1>
        </motion.div>

        <p className="relative z-10 font-mono text-xs text-zinc-500">// um produto DailyLoop</p>
      </aside>

      <section className="flex items-center justify-center bg-background px-6 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {children}
          </motion.div>
        </div>
      </section>
    </div>
  );
}
