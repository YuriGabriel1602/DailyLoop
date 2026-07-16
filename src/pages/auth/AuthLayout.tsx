import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Logo } from "@/components/Logo";
import { LiveConsole } from "./LiveConsole";

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
          <LiveConsole />

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
