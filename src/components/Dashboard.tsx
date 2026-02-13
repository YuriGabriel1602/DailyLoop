import { useStore } from "../store/useStore";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, ListChecks, Activity, PieChart, Code2, Cloud, Zap } from "lucide-react";
import { PrometheusTerminal } from "./modules/PrometheusTerminal";

export const Dashboard = () => {
  const { activeSession, setActiveSession, bio } = useStore();

  const navItems = [
    { id: 'Home', icon: LayoutDashboard, label: 'Briefing' },
    { id: 'Tasks', icon: ListChecks, label: 'Agenda' },
    { id: 'Financial', icon: PieChart, label: 'Finanças' },
    { id: 'Bio-Sync', icon: Activity, label: 'Bio' },
  ];

  return (
    // Fundo sólido e escuro. Fim da neblina excessiva.
    <div className="h-screen w-screen bg-[#030303] text-white font-sans flex overflow-hidden p-4 gap-4 selection:bg-blue-500/30">
      
      {/* 1. SIDEBAR ULTRA-COMPACTA (Menu Profissional) */}
      <aside className="w-20 bg-[#0a0a0a] rounded-3xl border border-white/5 flex flex-col items-center py-8 gap-8 relative z-20">
        <div className="w-10 h-10 rounded-xl bg-blue-600/10 flex items-center justify-center border border-blue-500/20 mb-4">
          <Code2 size={20} className="text-blue-500" />
        </div>
        
        <nav className="flex flex-col gap-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSession(item.id)}
              className={`p-3 rounded-2xl transition-all duration-300 group relative ${
                activeSession === item.id 
                ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.05)]' 
                : 'text-gray-600 hover:text-gray-300 hover:bg-white/5'
              }`}
            >
              <item.icon size={22} />
              {/* Tooltip Lateral */}
              <span className="absolute left-16 px-3 py-1.5 bg-[#111] border border-white/10 text-[10px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-widest font-bold pointer-events-none whitespace-nowrap z-50">
                {item.label}
              </span>
            </button>
          ))}
        </nav>
      </aside>

      {/* 2. O PALCO CENTRAL (O Bento Grid / Briefing) */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        
        {/* Cabeçalho do Briefing */}
        <header className="h-24 flex items-end justify-between pb-6 px-2">
          <div>
            <h1 className="text-3xl font-medium tracking-tight text-gray-100">
              Madrugada de foco, Arquiteto.
            </h1>
            <p className="text-sm text-gray-500 mt-1 font-mono flex items-center gap-2">
              Sexta-feira, 13 de Fevereiro <span className="text-gray-700">|</span> Porto Alegre, BR
            </p>
          </div>
          <div className="flex items-center gap-3 bg-[#0a0a0a] border border-white/5 px-4 py-2 rounded-2xl">
            <Cloud size={16} className="text-gray-400" />
            <span className="text-sm font-mono text-gray-300">22°C</span>
          </div>
        </header>

        {/* Área de Conteúdo Dinâmico */}
        <div className="flex-1 bg-[#0a0a0a] rounded-3xl border border-white/5 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div 
              key={activeSession}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="w-full h-full p-8"
            >
              {/* === IDEIA 1 NA PRÁTICA: BENTO GRID NO HOME === */}
              {activeSession === 'Home' && (
                <div className="grid grid-cols-3 grid-rows-2 gap-6 h-full">
                  
                  {/* Card Grande: Próxima Tarefa */}
                  <div className="col-span-2 row-span-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col justify-between hover:bg-white/[0.04] transition-colors">
                    <span className="text-[10px] uppercase tracking-[0.2em] text-blue-400 font-bold">Próxima Missão</span>
                    <div>
                      <h2 className="text-2xl font-medium mt-2">Avançar Arquitetura do DailyLoop</h2>
                      <p className="text-sm text-gray-500 mt-2">Você tem 2 horas estimadas para este bloco de foco.</p>
                    </div>
                    <div className="w-full bg-black/50 h-2 rounded-full overflow-hidden mt-4">
                      <div className="bg-blue-500 w-1/3 h-full rounded-full" />
                    </div>
                  </div>

                  {/* Card Pequeno: Bio Status */}
                  <div className="col-span-1 row-span-1 bg-white/[0.02] border border-white/5 rounded-3xl p-6 flex flex-col items-center justify-center gap-4 hover:border-purple-500/30 transition-colors group">
                    <Zap size={32} className="text-purple-500 group-hover:animate-pulse" />
                    <div className="text-center">
                      <span className="text-3xl font-light block">{bio.focus}%</span>
                      <span className="text-[10px] uppercase tracking-widest text-gray-500">Nível de Foco</span>
                    </div>
                  </div>

                  {/* Card Largo: Frase Estóica */}
                  <div className="col-span-3 row-span-1 bg-gradient-to-br from-white/[0.02] to-transparent border border-white/5 rounded-3xl p-8 flex items-center justify-center text-center">
                    <p className="text-lg text-gray-400 font-serif italic max-w-2xl leading-relaxed">
                      "Você tem poder sobre a sua mente - não sobre eventos externos. Perceba isso, e você encontrará a sua força."
                      <span className="block text-xs mt-4 font-sans text-gray-600 not-italic uppercase tracking-widest">— Marco Aurélio</span>
                    </p>
                  </div>

                </div>
              )}

              {/* Aqui os outros módulos carregam normalmente (Tasks, Financial, etc) */}
              {activeSession !== 'Home' && (
                <div className="h-full flex items-center justify-center text-gray-600 font-mono text-sm uppercase tracking-widest">
                  Módulo {activeSession} Montado. (Aqui entram os componentes antigos)
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* 3. IDEIA 3 NA PRÁTICA: A TIMELINE NEURAL LATERAL FIXA */}
      <aside className="w-[400px] bg-[#0a0a0a] rounded-3xl border border-white/5 flex flex-col relative z-20 overflow-hidden shadow-2xl">
        <header className="h-16 border-b border-white/5 flex items-center px-6 justify-between bg-white/[0.01]">
          <h2 className="text-[10px] uppercase tracking-[0.3em] text-purple-400 font-bold flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
            Terminal Neural
          </h2>
        </header>
        
        {/* O Prometheus entra aqui de forma limpa e estruturada */}
        <div className="flex-1 overflow-hidden">
          <PrometheusTerminal />
        </div>
      </aside>

    </div>
  );
};