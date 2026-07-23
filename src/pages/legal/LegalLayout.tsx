import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";

export function LegalLayout({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  return (
    <div className="h-screen w-screen overflow-y-auto bg-background text-foreground">
      <header className="sticky top-0 z-50 flex items-center justify-between border-b bg-background/85 px-6 py-3.5 backdrop-blur sm:px-10">
        <Link to="/welcome">
          <Logo />
        </Link>
        <Link to="/welcome" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft size={14} /> Voltar ao site
        </Link>
      </header>

      <div className="mx-auto max-w-3xl px-6 py-16 sm:px-10 sm:py-20">
        <p className="font-mono text-[13px] text-muted-foreground">// documento legal</p>
        <h1 className="mt-3 text-[clamp(28px,4.5vw,44px)] leading-[1.05] font-extrabold tracking-tight">{title}</h1>
        <p className="mt-3 font-mono text-xs text-muted-foreground">Última atualização: {updatedAt}</p>

        <div className="legal-content mt-10 space-y-8 text-[15px] leading-relaxed text-foreground/90">
          {children}
        </div>
      </div>

      <footer className="border-t py-10 text-center font-mono text-xs text-muted-foreground">
        © {new Date().getFullYear()} DailyLoop ·{" "}
        <Link to="/privacidade" className="underline underline-offset-4 hover:text-foreground">Privacidade</Link>
        {" · "}
        <Link to="/termos" className="underline underline-offset-4 hover:text-foreground">Termos</Link>
      </footer>
    </div>
  );
}

export function LegalSection({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-muted-foreground [&_a]:text-foreground [&_a]:underline [&_a]:underline-offset-4 [&_li]:pl-1 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
        {children}
      </div>
    </section>
  );
}
