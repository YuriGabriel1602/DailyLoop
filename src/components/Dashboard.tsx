import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';
import { 
  Home, CheckCircle2, Wallet, BrainCircuit, Settings, Bot, 
  X, ArrowRight, Pause, Play, Command, Sparkles, Zap, Moon, Sun, Cloud
} from 'lucide-react';

// --- CORES E TEMA ---
const THEME = {
  bg: "bg-[#050505]",
  glass: "backdrop-blur-xl bg-white/5 border border-white/10",
  accent: "from-blue-500 to-purple-600",
};

// --- UTILITÁRIO: SPOTLIGHT CARD ---
// Faz a borda brilhar onde o mouse passa
const SpotlightCard = ({ children, className = "", onClick }: any) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: any) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={`group relative border border-white/10 bg-[#0a0a0b] overflow-hidden ${className}`}
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px rounded-xl opacity-0 transition duration-300 group-hover:opacity-100"
        style={{
          background: useMotionTemplate`
            radial-gradient(
              650px circle at ${mouseX}px ${mouseY}px,
              rgba(255,255,255,0.1),
              transparent 80%
            )
          `,
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
};

// --- COMPONENTE: SAUDAÇÃO INTELIGENTE ---
const SmartGreeting = () => {
  const [greeting, setGreeting] = useState('');
  const [icon, setIcon] = useState(<Sun size={14}/>);

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Bom dia, Arquiteto.');
      setIcon(<Sun size={16} className="text-orange-400" />);
    } else if (hour >= 12 && hour < 18) {
      setGreeting('Boa tarde, Arquiteto.');
      setIcon(<Cloud size={16} className="text-blue-400" />);
    } else if (hour >= 18 && hour < 23) {
      setGreeting('Boa noite, Arquiteto.');
      setIcon(<Moon size={16} className="text-indigo-400" />);
    } else {
      setGreeting('Boa madrugada, Arquiteto.');
      setIcon(<Sparkles size={16} className="text-purple-400" />);
    }
  }, []);

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-gray-400 mb-6 w-fit mx-auto"
    >
      {icon}
      <span>{greeting}</span>
    </motion.div>
  );
};

// --- COMPONENTE: GAVETA PROMETHEUS ---
const PrometheusDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed top-2 bottom-2 right-2 w-[400px] max-w-[90vw] bg-[#0f0f11] border border-[#2d2d30] rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#1a1a1d]">
              <div className="flex items-center gap-2"><Bot className="text-purple-500" size={20} /><span className="font-semibold text-gray-200 uppercase tracking-tighter">Prometheus</span></div>
              <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-gray-400 hover:text-white transition-colors"><X size={18} /></button>
            </div>
            <div className="flex-1 p-4 space-y-6 overflow-y-auto">
               <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center shrink-0"><Bot size={16} className="text-purple-400" /></div>
                <div className="p-3 bg-[#1a1a1d] rounded-2xl rounded-tl-none text-sm text-gray-300">Sistemas online. Aguardando input tático.</div>
              </div>
            </div>
            <div className="p-4 bg-[#0a0a0b]"><input type="text" placeholder="Comando..." className="w-full bg-[#151516] border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none" /></div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// --- COMPONENTE: DOCK FLUTUANTE ---
const FloatingDock = ({ activeTab, setActiveTab, togglePrometheus }: any) => {
  const items = [
    { id: 'home', icon: Home, label: 'Foco' },
    { id: 'tasks', icon: CheckCircle2, label: 'Tarefas' },
    { id: 'finance', icon: Wallet, label: 'Finanças' },
    { id: 'brain', icon: BrainCircuit, label: 'Cérebro' },
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
      <motion.div 
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring" }}
        className={`flex items-center gap-2 px-3 py-3 rounded-2xl ${THEME.glass} shadow-2xl shadow-black/50 border-t border-white/10`}
      >
        {items.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`relative group p-3 rounded-xl transition-all duration-300 ${
                isActive ? 'bg-white/10 text-white shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-gray-500 hover:text-white hover:bg-white/5'
              }`}
            >
              <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
              {isActive && <motion.div layoutId="activeDot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full shadow-[0_0_5px_white]" />}
            </button>
          );
        })}
        <div className="w-px h-6 bg-white/10 mx-1" />
        <button
          onClick={togglePrometheus}
          className="relative group p-3 rounded-xl text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 transition-all duration-300"
        >
          <Bot size={20} />
          <span className="absolute top-1 right-1 w-2 h-2 bg-purple-500 rounded-full animate-pulse" />
        </button>
      </motion.div>
    </div>
  );
};

// --- BENTO GRID DASHBOARD ---
const BentoDashboard = ({ mission }: { mission: string }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-6xl mx-auto w-full p-6 grid grid-cols-1 md:grid-cols-4 gap-4 h-[calc(100vh-140px)] content-start"
    >
      {/* HERO CARD GRANDE */}
      <div className="col-span-1 md:col-span-3 row-span-2 relative group rounded-3xl overflow-hidden border border-white/10 bg-[#0a0a0b]">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-purple-900/10 opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[80px] group-hover:bg-blue-600/20 transition-all duration-700" />
        
        <div className="relative p-8 h-full flex flex-col justify-between z-10">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-3">
              <span className="flex h-2 w-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
              <span className="text-xs font-bold tracking-widest text-gray-400 uppercase">Live Session</span>
            </div>
            <div className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-xs text-gray-400 flex items-center gap-2">
              <Command size={10} /> Focus Mode
            </div>
          </div>

          <div>
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight tracking-tight drop-shadow-xl">
              {mission}
            </h1>
            <div className="flex items-center gap-6">
              <div className="text-6xl font-mono font-light tracking-tighter text-white/90 tabular-nums">
                00:45<span className="text-white/30">:00</span>
              </div>
              <button className="h-16 w-16 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all duration-300">
                <Play fill="black" size={24} className="ml-1" />
              </button>
            </div>
          </div>

          <div className="w-full bg-white/5 h-1 mt-8 rounded-full overflow-hidden">
             <motion.div 
               initial={{ width: 0 }} animate={{ width: "30%" }} transition={{ duration: 1.5, ease: "circOut" }}
               className="h-full bg-gradient-to-r from-blue-500 to-purple-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
             />
          </div>
        </div>
      </div>

      {/* PERFORMANCE CARD */}
      <SpotlightCard className="col-span-1 row-span-1 rounded-3xl p-6 flex flex-col justify-between">
        <div className="flex justify-between items-center">
          <span className="text-gray-500 text-xs font-bold uppercase">Performance</span>
          <BrainCircuit size={16} className="text-green-500" />
        </div>
        <div>
          <span className="text-4xl font-bold text-white">92%</span>
          <p className="text-xs text-gray-500">Eficiência Mental</p>
        </div>
        <div className="flex gap-1 mt-2">
          {[1,2,3,4,5].map(i => <div key={i} className={`h-1 flex-1 rounded-full ${i <= 4 ? 'bg-green-500' : 'bg-gray-800'}`} />)}
        </div>
      </SpotlightCard>

      {/* PRÓXIMA TAREFA CARD */}
      <SpotlightCard className="col-span-1 row-span-1 rounded-3xl p-6 cursor-pointer group">
        <div className="flex justify-between mb-2">
           <span className="text-gray-500 text-xs font-bold uppercase">Em Fila</span>
           <div className="h-2 w-2 rounded-full bg-orange-500 shadow-[0_0_10px_orange]" />
        </div>
        <div className="text-white font-medium text-lg leading-snug group-hover:text-blue-300 transition-colors">
          Deploy do Backend Rust
        </div>
        <div className="mt-auto pt-4 text-xs text-gray-600 flex items-center gap-2">
           <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" /> Ver detalhes
        </div>
      </SpotlightCard>

      {/* FINANÇAS CARD */}
      <SpotlightCard className="col-span-1 md:col-span-2 h-40 rounded-3xl p-6">
        <div className="flex justify-between items-center mb-4">
           <span className="text-gray-500 text-xs font-bold uppercase flex items-center gap-2">
             <Wallet size={14} /> Fluxo Financeiro
           </span>
           <span className="text-white text-sm font-mono bg-white/5 px-2 py-1 rounded">R$ 14.250,00</span>
        </div>
        <div className="flex items-end justify-between h-20 gap-1 px-1">
           {[30, 45, 25, 60, 80, 50, 90, 40, 70, 30, 55, 85].map((h, i) => (
             <motion.div 
                key={i} 
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ delay: i * 0.05, duration: 0.5 }}
                className="w-full bg-white/10 rounded-t-sm hover:bg-blue-500 hover:shadow-[0_0_15px_blue] transition-all duration-300 cursor-pointer" 
             />
           ))}
        </div>
      </SpotlightCard>

      {/* NOTES CARD */}
      <SpotlightCard className="col-span-1 md:col-span-2 h-40 rounded-3xl p-6 group">
         <div className="flex justify-between items-center mb-2">
           <span className="text-gray-500 text-xs font-bold uppercase">Quick Note</span>
           <span className="text-xs text-gray-700 group-hover:text-gray-500 transition-colors">Markdown Supported</span>
        </div>
        <textarea 
          placeholder="Ideias voláteis..." 
          className="w-full h-full bg-transparent border-none resize-none text-sm text-gray-300 placeholder:text-gray-800 focus:outline-none focus:placeholder:text-gray-600"
        />
      </SpotlightCard>
    </motion.div>
  );
};

// --- COMPONENTE PRINCIPAL DO DASHBOARD ---
// MUDANÇA AQUI: Removido "default" para permitir "import { Dashboard }"
export function Dashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [isPrometheusOpen, setPrometheusOpen] = useState(false);
  const [mission, setMission] = useState('');
  const [inputValue, setInputValue] = useState('');

  const handleMissionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) setMission(inputValue);
  };

  const setPresetMission = (text: string) => {
    setMission(text);
  };

  return (
    // O h-screen garante que o dashboard ocupe a tela toda
    <div className={`h-screen w-screen overflow-hidden ${THEME.bg} text-white selection:bg-blue-500/30 font-sans`}>
      
      {/* 1. FUNDO "NÚCLEO VIVO" (Esfera que respira) */}
      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center">
        <motion.div 
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="w-[800px] h-[800px] bg-blue-900/20 rounded-full blur-[120px]"
        />
        <motion.div 
          animate={{ scale: [1.2, 1, 1.2], opacity: [0.2, 0.4, 0.2], rotate: [0, 90, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-[600px] h-[600px] bg-purple-900/10 rounded-full blur-[100px]"
        />
      </div>

      <FloatingDock activeTab={activeTab} setActiveTab={setActiveTab} togglePrometheus={() => setPrometheusOpen(true)} />
      <PrometheusDrawer isOpen={isPrometheusOpen} onClose={() => setPrometheusOpen(false)} />

      <div className="relative z-10 h-full w-full flex flex-col pt-12">
        <header className="flex justify-between items-center px-8 mb-4 opacity-50 hover:opacity-100 transition-opacity">
          <div className="text-[10px] tracking-widest font-bold uppercase text-gray-500">
            System Online
          </div>
          <div className="text-[10px] tracking-widest font-bold uppercase text-gray-500">
             DailyLoop <span className="text-blue-500">v2.0</span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {!mission ? (
            // CENA 1: TELA INICIAL (PERGUNTA)
            <motion.div 
              key="hero-input"
              initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, scale: 1.1, filter: "blur(20px)" }}
              transition={{ duration: 1 }}
              className="flex-1 flex flex-col items-center justify-center -mt-20 px-4 relative"
            >
              <SmartGreeting />

              <h2 className="text-4xl md:text-7xl font-semibold text-white mb-8 text-center tracking-tighter drop-shadow-2xl">
                Qual é a sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">missão</span>?
              </h2>
              
              <form onSubmit={handleMissionSubmit} className="w-full max-w-2xl relative group z-20">
                <div className="relative">
                  <input
                    autoFocus type="text" value={inputValue} onChange={(e) => setInputValue(e.target.value)}
                    placeholder="Digite para iniciar o ciclo..."
                    className="w-full bg-black/20 backdrop-blur-md border border-white/10 rounded-2xl py-6 px-8 text-center text-2xl text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-500/50 focus:bg-black/40 transition-all shadow-2xl"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none">
                    <span className="text-[10px] uppercase font-bold text-gray-500 border border-white/10 px-2 py-1 rounded bg-black/50">Enter ↵</span>
                  </div>
                </div>
              </form>

              {/* Sugestões Rápidas */}
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="mt-8 flex gap-3"
              >
                {[
                  { label: "Deep Work (Rust)", icon: <Zap size={14}/> },
                  { label: "Organizar Finanças", icon: <Wallet size={14}/> },
                  { label: "Estudar IA", icon: <BrainCircuit size={14}/> }
                ].map((item, idx) => (
                  <button 
                    key={idx}
                    onClick={() => setPresetMission(item.label)}
                    className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/5 text-sm text-gray-400 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer"
                  >
                    {item.icon}
                    {item.label}
                  </button>
                ))}
              </motion.div>
            </motion.div>
          ) : (
            // CENA 2: O PAINEL (GRID)
            <BentoDashboard key="dashboard" mission={mission} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}