import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, BookHeart, Bot, CheckCircle2, Compass, Flame, GitBranch,
  Inbox, Kanban, ListTodo, Lock, Plug, Plus, ScrollText, Sparkle, Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { LEGAL_INFO, enderecoCompleto } from "@/lib/legalInfo";
import { cn } from "@/lib/utils";

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
        <a href="#mundos" className="hidden text-xs text-muted-foreground hover:text-foreground sm:inline">Dois Mundos</a>
        <a href="#empresarial" className="hidden text-xs text-muted-foreground hover:text-foreground md:inline">Empresarial</a>
        <a href="#pessoal" className="hidden text-xs text-muted-foreground hover:text-foreground md:inline">Pessoal</a>
        <a href="#faq" className="hidden text-xs text-muted-foreground hover:text-foreground md:inline">Perguntas</a>
        <Link to="/login" className="text-muted-foreground hover:text-foreground">Entrar</Link>
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/register">Criar conta <ArrowRight size={13} /></Link>
        </Button>
      </nav>
    </header>
  );
}

// =============================================================================
// Hero — demo interativa do switcher de mundos
// =============================================================================
type World = "business" | "personal";

const WORLD_DEMO: Record<World, { label: string; rows: { text: string; tone: "biz" | "personal" | "ok" }[]; nav: string[] }> = {
  business: {
    label: "pipeline · hoje",
    rows: [
      { text: "CRM: novo lead qualificado", tone: "biz" },
      { text: "Inbox: WhatsApp aguardando resposta", tone: "biz" },
      { text: "IA respondeu Instagram automaticamente", tone: "ok" },
    ],
    nav: ["Inbox", "CRM", "Integrações", "Logs"],
  },
  personal: {
    label: "painel · hoje",
    rows: [
      { text: "Tarefa concluída: revisar orçamento", tone: "personal" },
      { text: "Ritual marcado: leitura — streak 6d", tone: "ok" },
      { text: "Diário: nova entrada refletida pela IA", tone: "personal" },
    ],
    nav: ["Painel", "Tarefas", "Áreas da Vida", "Diário"],
  },
};

const TONE_DOT: Record<string, string> = {
  biz: "bg-biz",
  personal: "bg-primary",
  ok: "bg-emerald-500",
};

function WorldToggleDemo() {
  const [world, setWorld] = useState<World>("business");
  const demo = WORLD_DEMO[world];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="overflow-hidden rounded-2xl border bg-card shadow-xl"
    >
      <div className="flex gap-1 border-b p-2">
        <button
          onClick={() => setWorld("business")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
            world === "business" ? "bg-biz text-biz-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          Empresarial
        </button>
        <button
          onClick={() => setWorld("personal")}
          className={cn(
            "flex-1 rounded-lg py-2 text-sm font-semibold transition-colors",
            world === "personal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
          )}
        >
          Pessoal
        </button>
      </div>
      <div className="min-h-[260px] p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={world}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.2 }}
          >
            <p className="mb-2.5 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">{demo.label}</p>
            {demo.rows.map((r) => (
              <div key={r.text} className="flex items-center gap-2.5 border-b py-2.5 text-[13.5px] last:border-0">
                <span className={cn("size-2 shrink-0 rounded-full", TONE_DOT[r.tone])} />
                {r.text}
              </div>
            ))}
            <div className="mt-3.5 flex flex-wrap gap-1.5">
              {demo.nav.map((n) => (
                <span key={n} className="rounded-full border px-2.5 py-1 text-xs">{n}</span>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
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
            uma conta · <b className="font-medium text-primary">dois mundos completos</b>
          </p>
          <h1 className="mt-5 text-[clamp(32px,5.8vw,58px)] leading-[1.03] font-extrabold tracking-tight">
            Seu negócio de um lado.<br />Sua vida do outro.
          </h1>
          <p className="mt-6 max-w-xl text-[clamp(15px,1.8vw,19px)] leading-relaxed text-muted-foreground">
            O DailyLoop é dois sistemas dentro de um só login: um <span className="font-medium text-foreground">Empresarial</span>,
            com CRM e atendimento de leads por IA — e um <span className="font-medium text-foreground">Pessoal</span>, com tarefas,
            finanças e um ecossistema de vida inteiro. Trocar de mundo muda tudo: navegação, cor, dados e até o tom do seu assistente.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Button asChild size="lg" className="gap-1.5">
              <Link to="/register">Criar conta grátis <ArrowRight size={15} /></Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href="#mundos">Ver como funciona</a>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
            <span className="inline-flex items-center"><span className="mr-2 size-1.5 rounded-full bg-primary" />grátis pra começar</span>
            <span>· dados isolados por conta</span>
            <span>· os dois mundos, nunca misturados</span>
          </div>
        </div>
        <WorldToggleDemo />
      </div>
    </section>
  );
}

// =============================================================================
// Dois Mundos — explicação da divisão
// =============================================================================
function DoisMundos() {
  return (
    <section id="mundos" className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
      <p className="font-mono text-[13px] text-muted-foreground">como funciona a divisão</p>
      <h2 className="mt-3 max-w-2xl text-[clamp(26px,4vw,44px)] leading-[1.05] font-bold tracking-tight">
        Dois Mundos, uma conta só.
      </h2>
      <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-muted-foreground">
        Um botão no topo troca de mundo a qualquer momento. Não é só uma questão de cor — cada lado tem sua
        própria navegação, seus próprios dados e sua própria conversa com o Prometheus.
      </p>
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border p-7">
          <span className="rounded-full bg-biz/15 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider text-biz uppercase">Empresarial</span>
          <h3 className="mt-3.5 text-xl font-bold tracking-tight">Pra quem atende clientes</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
            CRM com pipeline de leads, Inbox com WhatsApp/Instagram/Facebook em tempo real, IA que responde
            (ou não, se você pausar) e um log de tudo que acontece na conta.
          </p>
        </div>
        <div className="rounded-2xl border p-7">
          <span className="rounded-full bg-primary/15 px-2.5 py-1 font-mono text-[11px] font-bold tracking-wider text-primary uppercase">Pessoal</span>
          <h3 className="mt-3.5 text-xl font-bold tracking-tight">Pra organizar sua vida</h3>
          <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
            Tarefas, finanças, notas e um ecossistema inteiro — Áreas da Vida, Pessoas, Diário, Rituais,
            Bússola de Metas e Agenda conectada ao Google.
          </p>
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5"><span className="size-1 rounded-full bg-foreground/40" />navegação própria por mundo</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-1 rounded-full bg-foreground/40" />histórico do Prometheus nunca cruza</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-1 rounded-full bg-foreground/40" />integrações separadas por contexto</span>
      </div>
    </section>
  );
}

// =============================================================================
// Recursos por mundo
// =============================================================================
const BIZ_FEATURES = [
  { tag: "CRM", icon: Kanban, title: "Pipeline de leads", desc: "Kanban ou lista — arraste ou selecione a etapa: Novo, Qualificado, Convertido, Perdido." },
  { tag: "Inbox", icon: Inbox, title: "Conversas em tempo real", desc: "WhatsApp, Instagram e Facebook chegando na mesma tela, assim que você conecta cada canal." },
  { tag: "IA sob controle", icon: Bot, title: "Pausa por conversa", desc: "A IA responde sozinha 24/7 — ou você assume uma conversa específica a qualquer momento." },
  { tag: "Integrações", icon: Plug, title: "Meta, GitHub e motor de IA", desc: "Conecte WhatsApp/Instagram/Facebook, veja seus repositórios do GitHub e escolha Gemini, OpenAI ou Anthropic pro Prometheus." },
  { tag: "Logs", icon: ScrollText, title: "Torre de controle", desc: "Todo evento relevante — dos dois mundos — registrado num só lugar, visível só aqui." },
  { tag: "Sem surpresa", icon: GitBranch, title: "Você decide o que conectar", desc: "Cada integração resolve uma dor real. Nada é ativado ou simulado sem você conectar de verdade." },
];

const PERSONAL_FEATURES = [
  { tag: "Painel", icon: Sparkle, title: "4 formatos, 1 resumo do dia", desc: "Carta do Dia (narrativa da IA), Terminal, Mapa de Calor ou Cápsula do Tempo — você escolhe." },
  { tag: "Tarefas · Finanças · Notas", icon: ListTodo, title: "A base, sem fricção", desc: "Captura rápida, categorização automática de gastos e importação de extrato (CSV/OFX)." },
  { tag: "Áreas da Vida", icon: Compass, title: "Um espelho, não uma lista nova", desc: "Agrega o que você já registrou em tarefas, rituais e metas — por área da sua vida." },
  { tag: "Pessoas", icon: Users, title: "O CRM da sua vida pessoal", desc: "Família, amigos, mentores — avisa quando alguém importante esfria no contato." },
  { tag: "Diário", icon: BookHeart, title: "Escreva, a IA reflete", desc: "Sem estrutura. Depois de salvar, o Prometheus devolve uma reflexão curta sobre o que você escreveu." },
  { tag: "Rituais · Bússola · Agenda", icon: Flame, title: "Hábitos, metas e Google", desc: "Sequências de hábito com streak, metas de longo prazo e sua agenda/Gmail/Fit reais, quando conectados." },
];

function FeatureGrid({ items, tone }: { items: typeof BIZ_FEATURES; tone: "biz" | "personal" }) {
  return (
    <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {items.map((f) => (
        <div key={f.tag} className="bg-card p-7 transition-colors hover:bg-muted/40">
          <div className="flex items-center gap-2.5">
            <f.icon size={15} className={tone === "biz" ? "text-biz" : "text-primary"} />
            <span className={cn("font-mono text-[11px] tracking-wider uppercase", tone === "biz" ? "text-biz" : "text-primary")}>{f.tag}</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          <h3 className="mt-3 text-[17px] font-bold tracking-tight">{f.title}</h3>
          <p className="mt-2 text-[14px] leading-relaxed text-muted-foreground">{f.desc}</p>
        </div>
      ))}
    </div>
  );
}

function EmpresarialSection() {
  return (
    <section id="empresarial" className="border-t bg-biz/[0.04]">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
        <p className="font-mono text-[13px] text-biz">lado empresarial</p>
        <h2 className="mt-3 max-w-2xl text-[clamp(24px,3.6vw,40px)] leading-[1.08] font-bold tracking-tight">
          Atenda seus leads sem largar o celular no automático.
        </h2>
        <FeatureGrid items={BIZ_FEATURES} tone="biz" />
      </div>
    </section>
  );
}

function PessoalSection() {
  return (
    <section id="pessoal" className="border-t">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
        <p className="font-mono text-[13px] text-primary">lado pessoal</p>
        <h2 className="mt-3 max-w-2xl text-[clamp(24px,3.6vw,40px)] leading-[1.08] font-bold tracking-tight">
          Um ecossistema pra sua vida, não só uma lista de tarefas.
        </h2>
        <FeatureGrid items={PERSONAL_FEATURES} tone="personal" />
      </div>
    </section>
  );
}

// =============================================================================
// Prometheus
// =============================================================================
function PrometheusSection() {
  return (
    <section className="border-y bg-[oklch(0.08_0_0)] text-white">
      <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
        <p className="font-mono text-[13px] text-zinc-400">o assistente</p>
        <h2 className="mt-3 max-w-2xl text-[clamp(24px,3.6vw,40px)] leading-[1.08] font-bold tracking-tight">
          Prometheus. Duas personas, uma IA plugável.
        </h2>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-400">
          O mesmo assistente muda de tom conforme o mundo — e nunca lembra, do lado Pessoal, do que você
          conversou no Empresarial (e vice-versa). Escolha o motor por trás de cada lado: Gemini, OpenAI ou
          Anthropic, com sua própria chave.
        </p>
        <div className="mt-9 grid gap-5 sm:grid-cols-2">
          <div className="rounded-2xl border border-biz/25 bg-white/[0.03] p-5">
            <span className="font-mono text-[11px] font-bold tracking-wider text-biz uppercase">Prometheus · Empresarial</span>
            <div className="mt-3 rounded-xl bg-white/[0.06] p-3.5 text-[13.5px] text-zinc-300">
              "Você tem 3 leads parados em 'Qualificado' há mais de 5 dias — quer que eu puxe os contatos?"
            </div>
          </div>
          <div className="rounded-2xl border border-primary/25 bg-white/[0.03] p-5">
            <span className="font-mono text-[11px] font-bold tracking-wider text-primary uppercase">Prometheus · Pessoal</span>
            <div className="mt-3 rounded-xl bg-white/[0.06] p-3.5 text-[13.5px] text-zinc-300">
              "Sua sequência de leitura está em 6 dias. Hoje ainda não foi marcada — quer registrar agora?"
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// =============================================================================
// Como funciona
// =============================================================================
const STEPS = [
  { n: "01", title: "Cadastre-se", desc: "nome · email · senha" },
  { n: "02", title: "Escolha um mundo", desc: "Empresarial ou Pessoal — troque quando quiser" },
  { n: "03", title: "Conecte o que fizer sentido", desc: "Meta, Google, GitHub — ou nenhum ainda" },
  { n: "04", title: "Converse com o Prometheus", desc: "contexto e tom próprios de cada lado" },
];

function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-6 py-20 sm:px-10 sm:py-28">
      <p className="font-mono text-[13px] text-muted-foreground">como começar</p>
      <h2 className="mt-3 max-w-2xl text-[clamp(24px,3.6vw,40px)] leading-[1.08] font-bold tracking-tight">
        Do cadastro ao primeiro dia, nos dois mundos.
      </h2>
      <div className="mt-9 flex flex-wrap items-stretch gap-2">
        {STEPS.map((s, i) => (
          <div key={s.n} className="contents">
            <div className="min-w-[150px] flex-1 rounded-xl border bg-card p-4">
              <div className="font-mono text-[11px] text-primary">{s.n}</div>
              <div className="mt-1.5 text-[16px] font-semibold tracking-tight">{s.title}</div>
              <div className="mt-1.5 font-mono text-[11px] text-muted-foreground">{s.desc}</div>
            </div>
            {i < STEPS.length - 1 && <div className="hidden items-center text-primary sm:flex">→</div>}
          </div>
        ))}
      </div>
    </section>
  );
}

// =============================================================================
// FAQ
// =============================================================================
const FAQ = [
  { q: "Os dados do Empresarial e do Pessoal se misturam?", a: "Não. Navegação, cor, dados e o histórico de conversa com o Prometheus são completamente separados por mundo — inclusive o tom do assistente muda." },
  { q: "Os leads que eu cadastro no CRM pertencem a quem?", a: "A você. O DailyLoop processa esses contatos só pra viabilizar o CRM, o Inbox e a resposta automática que você configurar — você é o responsável pelos dados dos seus próprios clientes." },
  { q: "Preciso conectar todas as integrações pra usar o sistema?", a: "Não. Cada integração resolve uma dor específica — conecte só o que fizer sentido pra você. Sem conexão, a tela mostra \"desconectado\", nunca dado inventado." },
  { q: "Sou obrigado a usar o Gemini?", a: "Não. Você pode escolher Gemini, OpenAI ou Anthropic pra cada lado, separadamente, usando sua própria chave de API quando aplicável." },
  { q: "Isso é gratuito?", a: "Sim, por enquanto o DailyLoop é gratuito, nos dois mundos." },
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
    <section id="faq" className="mx-auto max-w-6xl border-t px-6 py-20 sm:px-10 sm:py-28">
      <p className="font-mono text-[13px] text-muted-foreground">dúvidas</p>
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
          Seus dois mundos, <span className="text-primary">organizados a partir de hoje.</span>
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
        <p className="mt-4 font-mono text-sm text-primary">um sistema, dois mundos</p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 font-mono text-xs text-zinc-500">
          <Link to="/privacidade" className="underline underline-offset-4 hover:text-zinc-300">Privacidade</Link>
          <Link to="/termos" className="underline underline-offset-4 hover:text-zinc-300">Termos de Uso</Link>
          <a href={`mailto:${LEGAL_INFO.emailContato}`} className="underline underline-offset-4 hover:text-zinc-300">{LEGAL_INFO.emailContato}</a>
        </div>
        <p className="mt-6 inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 font-mono text-[11px] text-zinc-400">
          <Lock size={11} /> Conforme a LGPD (Lei nº 13.709/2018)
        </p>
        <p className="mt-5 font-mono text-[11px] leading-relaxed text-zinc-600">
          {enderecoCompleto()}
        </p>
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
      <DoisMundos />
      <EmpresarialSection />
      <PessoalSection />
      <PrometheusSection />
      <HowItWorks />
      <Faq />
      <FinalCta />
      <Footer />
    </div>
  );
}
