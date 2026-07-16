import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Bell, Bot, Check, CheckCircle2, ListTodo, Plus, Wallet,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";

// =============================================================================
// Cabeçalho
// =============================================================================
function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 flex items-center justify-between border-b bg-background/85 px-6 py-3.5 backdrop-blur transition-shadow sm:px-10 ${scrolled ? "shadow-sm" : ""}`}
    >
      <Logo />
      <nav className="flex items-center gap-5 text-sm sm:gap-7">
        <a href="#recursos" className="hidden font-mono text-xs text-muted-foreground hover:text-foreground sm:inline">// recursos</a>
        <a href="#como-funciona" className="hidden font-mono text-xs text-muted-foreground hover:text-foreground md:inline">// como funciona</a>
        <a href="#faq" className="hidden font-mono text-xs text-muted-foreground hover:text-foreground md:inline">// perguntas</a>
        <Link to="/login" className="text-muted-foreground hover:text-foreground">Entrar</Link>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/register">Criar conta <ArrowRight size={13} /></Link>
        </Button>
      </nav>
    </header>
  );
}

// =============================================================================
// Hero
// =============================================================================
const HERO_FEED = [
  { label: "Reunião com cliente às 15h", done: true },
  { label: "Revisar proposta financeira", done: true },
  { label: "Orçamento de Lazer em 62%", done: false },
];

function HeroPreviewCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="overflow-hidden rounded-2xl border bg-card shadow-xl"
    >
      <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-3">
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="size-2.5 rounded-full bg-muted-foreground/30" />
        <span className="ml-3 font-mono text-[11px] text-muted-foreground">painel · hoje</span>
      </div>
      <div className="grid grid-cols-3 divide-x border-b">
        <div className="px-4 py-3">
          <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Tarefas</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">2/3</p>
        </div>
        <div className="px-4 py-3">
          <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Saldo</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums text-primary">R$ 8.454</p>
        </div>
        <div className="px-4 py-3">
          <p className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">Alertas</p>
          <p className="mt-0.5 text-xl font-bold tabular-nums">1</p>
        </div>
      </div>
      <div>
        {HERO_FEED.map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 + i * 0.12, duration: 0.4 }}
            className="flex items-center gap-3 border-b px-4 py-3 last:border-0"
          >
            <span className={`flex size-6 shrink-0 items-center justify-center rounded-full ${item.done ? "bg-primary text-primary-foreground" : "animate-pulse bg-muted text-muted-foreground"}`}>
              <Check size={12} strokeWidth={3} />
            </span>
            <span className="flex-1 truncate text-sm">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden border-b">
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(110% 80% at 70% -10%, black 30%, transparent 75%)",
        }}
      />
      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 sm:px-10 sm:py-28 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          <p className="font-mono text-[13px] text-muted-foreground">
            // assistente pessoal · <b className="font-medium text-primary">tarefas, finanças e WhatsApp</b>
          </p>
          <h1 className="mt-5 text-[clamp(36px,6.5vw,68px)] leading-[0.98] font-extrabold tracking-tight">
            Seu dia inteiro,<br className="hidden sm:block" /> organizado <span className="text-primary">num só lugar.</span>
          </h1>
          <p className="mt-6 max-w-xl text-[clamp(15px,1.8vw,19px)] leading-relaxed text-muted-foreground">
            Tarefas, finanças e agenda param de viver espalhados em cinco apps. O Prometheus cruza tudo e te avisa
            <span className="font-medium text-foreground"> antes</span> de você precisar perguntar.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-1.5">
              <Link to="/register">Criar conta <ArrowRight size={15} /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#recursos">Ver recursos</a>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
            <span className="inline-flex items-center"><span className="mr-2 size-1.5 rounded-full bg-primary" />grátis pra começar</span>
            <span>· dados isolados por conta</span>
            <span>· WhatsApp verificado por código</span>
          </div>
        </div>
        <HeroPreviewCard />
      </div>
    </section>
  );
}

// =============================================================================
// Recursos
// =============================================================================
const FEATURES = [
  { tag: "tarefas", icon: ListTodo, title: "Tarefas com prazo", desc: "Crie tarefas com data e hora — o Prometheus lembra você no WhatsApp ou email antes do prazo vencer." },
  { tag: "finanças", icon: Wallet, title: "Finanças de verdade", desc: "Categorização automática por IA, importação de extrato CSV/OFX e orçamento por categoria, sem planilha." },
  { tag: "prometheus", icon: Bot, title: "Prometheus IA", desc: "Converse com o assistente a qualquer momento — ele conhece suas tarefas e finanças pra responder com contexto." },
  { tag: "notificações", icon: Bell, title: "Email ou WhatsApp", desc: "Escolha o canal por categoria: redefinição de senha, lembretes, briefing diário e alertas de orçamento." },
];

function Features() {
  return (
    <section id="recursos" className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
      <p className="font-mono text-[13px] text-muted-foreground">// tudo num lugar só</p>
      <h2 className="mt-3 max-w-3xl text-[clamp(26px,4vw,48px)] leading-[1.05] font-bold tracking-tight">
        Pare de pular entre agenda, planilha <span className="text-muted-foreground">e caderno de notas.</span>
      </h2>
      <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.tag} className="bg-card p-7 transition-colors hover:bg-muted/40 sm:p-8">
            <div className="flex items-center gap-2.5">
              <f.icon size={15} className="text-primary" />
              <span className="font-mono text-[11px] tracking-wider text-primary uppercase">{f.tag}</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <h3 className="mt-3 text-xl font-bold tracking-tight">{f.title}</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// Como funciona
// =============================================================================
const STEPS = [
  { n: "01", title: "Cadastre-se", desc: "nome · email · WhatsApp" },
  { n: "02", title: "Verifique", desc: "código chega no WhatsApp" },
  { n: "03", title: "Organize", desc: "tarefas · finanças · notas" },
  { n: "04", title: "Receba", desc: "email ou WhatsApp, por categoria" },
];

function HowItWorks() {
  return (
    <section id="como-funciona" className="border-y bg-[oklch(0.08_0_0)] text-white">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
        <p className="font-mono text-[13px] text-zinc-400">// como funciona</p>
        <h2 className="mt-4 text-[clamp(28px,4.6vw,54px)] leading-[0.98] font-extrabold tracking-tight">
          Do cadastro<br />ao primeiro aviso.
        </h2>
        <div className="mt-10 flex flex-wrap items-stretch gap-2">
          {STEPS.map((s, i) => (
            <div key={s.n} className="contents">
              <div className="min-w-[140px] flex-1 rounded-xl border border-white/10 bg-white/[0.03] p-4">
                <div className="font-mono text-[11px] text-primary">// {s.n}</div>
                <div className="mt-1.5 text-[17px] font-semibold tracking-tight">{s.title}</div>
                <div className="mt-1.5 font-mono text-[11px] text-zinc-500">{s.desc}</div>
              </div>
              {i < STEPS.length - 1 && <div className="hidden items-center font-mono text-primary sm:flex">→</div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// FAQ
// =============================================================================
const FAQ = [
  { q: "Preciso saber configurar algo técnico?", a: "Não. Você cria a conta, verifica o WhatsApp com um código e já pode usar. Nada de API, template ou configuração manual do seu lado." },
  { q: "Meus dados ficam visíveis pra outras pessoas?", a: "Não. Cada conta é isolada — tarefas, finanças e notas de um usuário nunca aparecem pra outro. Só o superadmin tem um painel próprio de gestão, sem acesso ao conteúdo das suas tarefas ou finanças." },
  { q: "O WhatsApp é obrigatório?", a: "O número é pedido no cadastro e verificado por código, mas você escolhe por categoria se quer receber por WhatsApp, email, ou os dois — o email sempre funciona como alternativa." },
  { q: "O Prometheus usa qual IA?", a: "Gemini, da Google, rodando só no backend — a chave nunca fica exposta no aplicativo instalado." },
  { q: "Isso é gratuito?", a: "Sim, por enquanto o DailyLoop é de uso pessoal e gratuito." },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group py-5">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="pr-6 text-[17px] font-semibold tracking-tight">{q}</span>
        <Plus size={18} className="shrink-0 text-primary transition-transform group-open:rotate-45" />
      </summary>
      <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">{a}</p>
    </details>
  );
}

function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
      <p className="font-mono text-[13px] text-muted-foreground">// dúvidas</p>
      <h2 className="mt-3 mb-8 text-[clamp(26px,4vw,44px)] leading-tight font-extrabold tracking-tight">Perguntas frequentes.</h2>
      <div className="divide-y border-y">
        {FAQ.map((item) => <FaqItem key={item.q} {...item} />)}
      </div>
    </section>
  );
}

// =============================================================================
// CTA final + rodapé
// =============================================================================
function FinalCta() {
  return (
    <section className="border-b">
      <div className="mx-auto max-w-6xl px-6 py-20 text-center sm:px-10 sm:py-28">
        <h2 className="mx-auto max-w-2xl text-[clamp(28px,4.6vw,52px)] leading-[1.02] font-extrabold tracking-tight">
          Seu próximo dia <span className="text-primary">já pode começar organizado.</span>
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild size="lg" className="gap-1.5">
            <Link to="/register">Criar conta grátis <ArrowRight size={15} /></Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">Já tenho conta</Link>
          </Button>
        </div>
        <p className="mt-6 flex items-center justify-center gap-1.5 font-mono text-xs text-muted-foreground">
          <CheckCircle2 size={12} /> sem cartão de crédito
        </p>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="bg-[oklch(0.08_0_0)] py-20 text-center text-white">
      <div className="mx-auto max-w-5xl px-6">
        <span className="inline-flex items-center justify-center text-[clamp(40px,9vw,96px)] leading-none font-extrabold tracking-tight">
          DailyLoop
        </span>
        <p className="mt-4 font-mono text-sm text-primary">// o assistente que organiza seu dia</p>
        <p className="mt-6 font-mono text-xs text-zinc-500">© {new Date().getFullYear()} DailyLoop</p>
      </div>
    </footer>
  );
}

export default function LandingPage() {
  return (
    <div className="h-screen w-screen overflow-y-auto bg-background text-foreground">
      <Header />
      <Hero />
      <Features />
      <HowItWorks />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
