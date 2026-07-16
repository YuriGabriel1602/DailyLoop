import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CalendarClock, ShieldCheck, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";

const HIGHLIGHTS = [
  { icon: Sparkles, text: "Prometheus organiza seu dia antes de você precisar pensar nele" },
  { icon: CalendarClock, text: "Tarefas, finanças e agenda num só lugar, sem fragmentação" },
  { icon: ShieldCheck, text: "Cada conta é isolada — seus dados são só seus" },
];

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <div className="relative hidden w-[45%] max-w-xl flex-col justify-between overflow-hidden border-r bg-card p-10 lg:flex">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(circle at 20% 20%, color-mix(in oklch, var(--primary) 18%, transparent), transparent 55%), radial-gradient(circle at 85% 75%, color-mix(in oklch, var(--primary) 10%, transparent), transparent 50%)",
          }}
        />
        <Logo className="relative z-10" />

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative z-10 space-y-8">
          <h1 className="max-w-sm text-3xl leading-tight font-semibold tracking-tight">
            O assistente que monta o seu dia por você.
          </h1>
          <div className="space-y-4">
            {HIGHLIGHTS.map((item, i) => (
              <motion.div
                key={item.text}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
                className="flex items-start gap-3 text-sm text-muted-foreground"
              >
                <item.icon size={16} className="mt-0.5 shrink-0 text-primary" />
                <span>{item.text}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <p className="relative z-10 text-xs text-muted-foreground">© {new Date().getFullYear()} DailyLoop</p>
      </div>

      <div className="flex flex-1 items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </div>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
