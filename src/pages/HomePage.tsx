import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight, Pause, Play, Sparkles, Terminal, AlertCircle, CheckCircle2, RefreshCw,
  Send, BrainCircuit, Car, ChevronLeft, Star, ThermometerSun, MapPin, Droplets, Wind, Sun,
} from "lucide-react";
import { api, ApiError } from "../lib/api";
import { useStore } from "../store/useStore";
import { SpotlightCard, StatusBar, useBackendStatus, useInterval, useTimeFormat } from "../components/ui/primitives";

const EfficiencyWidget = () => (
  <SpotlightCard className="flex flex-col justify-between bg-gradient-to-br from-purple-900/10 to-[#0a0a0b] border-purple-500/10 group cursor-pointer overflow-hidden">
    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-bl-[100px] pointer-events-none group-hover:scale-110 transition-transform" />
    <div className="flex justify-between items-center relative z-10">
      <span className="text-gray-500 text-xs font-bold uppercase tracking-widest group-hover:text-purple-400 transition-colors">Eficiência</span>
      <BrainCircuit size={16} className="text-purple-500" />
    </div>
    <div className="relative z-10 mt-4">
      <span className="text-4xl md:text-5xl font-black text-white tracking-tighter">92%</span>
      <p className="text-[10px] text-purple-400 mt-1 uppercase tracking-wider truncate">Carga Otimizada</p>
    </div>
    <div className="mt-6 relative h-12 flex items-end justify-between gap-1 md:gap-1.5 z-10">
      {[40, 60, 30, 80, 50, 92, 70].map((h, i) => (
        <motion.div key={i} initial={{ height: "10%" }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.1, type: "spring" }} className={`w-full rounded-t-sm transition-all duration-300 group-hover:opacity-100 ${i === 5 ? "bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" : "bg-gray-800 opacity-50"}`} />
      ))}
    </div>
  </SpotlightCard>
);

const UberWidget = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <SpotlightCard className="bg-black cursor-pointer group transition-all duration-500" noPadding onClick={() => setIsExpanded(!isExpanded)}>
      <div className="p-4 md:p-5 relative z-10">
        <div className="flex justify-between items-start">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform"><Car size={18} /></div>
          <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 group-hover:text-white transition-colors">Uber <ChevronLeft size={10} className={`transform transition-transform ${isExpanded ? "-rotate-90" : ""}`} /></span>
        </div>
        <div className="mt-4">
          <div className="text-xl font-bold text-white leading-none flex items-end gap-2">4 min <span className="text-[10px] text-green-400 font-normal mb-0.5 animate-pulse">A Chegar</span></div>
          <div className="text-xs text-gray-500 mt-1 truncate">Viagem para o Escritório</div>
        </div>
      </div>
      <AnimatePresence>
        {isExpanded ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 md:px-5 pb-4 md:pb-5 overflow-hidden">
            <div className="h-24 w-full rounded-xl mb-3 overflow-hidden relative bg-gray-900 border border-white/5">
              <div className="absolute inset-0 opacity-30" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "10px 10px" }} />
              <div className="absolute top-1/2 left-1/4 w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_10px_blue]" />
              <div className="absolute top-1/2 right-1/4 w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_green]" />
              <div className="absolute top-1/2 left-1/4 right-1/4 h-0.5 bg-dashed border-t-2 border-dashed border-white/20" />
              <Car size={16} className="absolute top-1/2 left-1/2 -translate-y-1/2 text-white drop-shadow-lg" />
            </div>
            <div className="flex gap-2">
              <button className="flex-1 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase py-2 rounded-lg hover:bg-red-500 hover:text-white transition-colors">Cancelar</button>
              <button className="flex-1 bg-white/5 text-white text-[10px] font-bold uppercase py-2 rounded-lg hover:bg-white/10 transition-colors">Contatar</button>
            </div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 md:px-5 pb-4 md:pb-5 pt-0">
            <div className="p-2 bg-white/5 rounded-xl flex items-center gap-3 border border-white/5 group-hover:bg-white/10 transition-colors">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-xs shadow-inner overflow-hidden relative shrink-0">
                <img src="https://images.unsplash.com/photo-1548311543-8f0a28f413a9?w=100&q=80" className="w-full h-full object-cover" alt="Driver" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold text-white flex justify-between">João Silva <span className="flex items-center text-yellow-400 gap-0.5"><Star size={8} fill="currentColor" /> 4.9</span></div>
                <div className="text-[9px] text-gray-500 truncate">Tesla Model 3 • DXS-9090</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </SpotlightCard>
  );
};

const WeatherWidget = () => (
  <SpotlightCard className="bg-gradient-to-br from-orange-500/20 to-yellow-500/5 border-orange-500/20 group cursor-pointer" noPadding>
    <div className="p-4 md:p-5 h-full flex flex-col justify-between relative overflow-hidden">
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500 rounded-full blur-[40px] opacity-40 group-hover:opacity-60 group-hover:scale-150 transition-all duration-700 animate-pulse pointer-events-none" />
      <div className="flex justify-between items-start relative z-10">
        <ThermometerSun size={20} className="text-yellow-400 group-hover:rotate-12 transition-transform" />
        <span className="text-[10px] font-bold text-yellow-200/50 uppercase">Clima Hoje</span>
      </div>
      <div className="relative z-10 mt-4 transition-transform duration-500 group-hover:-translate-y-2">
        <div className="text-4xl font-black text-white">24°</div>
        <div className="text-xs text-yellow-200/80 font-medium mt-1 truncate">Parcialmente Nublado</div>
        <div className="text-[9px] text-gray-400 mt-2 flex items-center gap-1 truncate"><MapPin size={8} className="shrink-0" /> Porto Alegre, BR</div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 pt-0 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 z-10 flex justify-between border-t border-white/10 mt-4 bg-black/40 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-1 mt-3"><Droplets size={10} className="text-blue-300" /><span className="text-[9px] text-white font-mono">62%</span></div>
        <div className="flex flex-col items-center gap-1 mt-3"><Wind size={10} className="text-gray-300" /><span className="text-[9px] text-white font-mono">14km</span></div>
        <div className="flex flex-col items-center gap-1 mt-3"><Sun size={10} className="text-orange-300" /><span className="text-[9px] text-white font-mono">UV 6</span></div>
      </div>
    </div>
  </SpotlightCard>
);

export default function HomePage() {
  const user = useStore((s) => s.user);
  const isBackendOnline = useBackendStatus();

  const [mission, setMission] = useState("");
  const [localInput, setLocalInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  const [quickNote, setQuickNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  useInterval(() => {
    if (timeLeft > 0) setTimeLeft(timeLeft - 1);
    else setIsTimerRunning(false);
  }, isTimerRunning ? 1000 : null);

  const handleSetMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (localInput.trim()) {
      setMission(localInput);
      setIsTimerRunning(true);
    }
  };

  const handleSaveNote = async () => {
    if (!quickNote.trim() || !isBackendOnline) return;
    setIsSavingNote(true);
    setNoteStatus("saving");
    try {
      await api.post("/api/notes", { content: quickNote });
      setQuickNote("");
      setNoteStatus("success");
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) setNoteStatus("error");
    } finally {
      setIsSavingNote(false);
      setTimeout(() => setNoteStatus("idle"), 3000);
    }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      handleSaveNote();
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25, ease: "easeOut" }} className="w-full pb-40 h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-transparent">
      <StatusBar isBackendOnline={isBackendOnline} />

      <div className="max-w-7xl mx-auto w-full p-4 md:p-6 space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          <div className="md:col-span-2 relative group rounded-3xl overflow-hidden bg-[#0a0a0b] border border-white/10 min-h-[280px] shadow-2xl flex flex-col justify-center p-6 md:p-12">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-transparent pointer-events-none" />
            <AnimatePresence mode="wait">
              {!mission ? (
                <motion.div key="input" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4 md:space-y-6 relative z-10">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-2"><Sparkles size={12} /> Sistema Pronto</div>
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">
                    Olá, <span className="text-blue-400">{user?.username ?? "Arquiteto"}</span>.<br />Qual o seu{" "}
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">próximo objetivo?</span>
                  </h1>
                  <form onSubmit={handleSetMission} className="relative w-full max-w-lg mt-4">
                    <input autoFocus type="text" value={localInput} onChange={(e) => setLocalInput(e.target.value)} placeholder="Insira a diretiva tática..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 md:py-4 pl-4 md:pl-6 pr-16 text-sm md:text-lg text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600" />
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl hover:scale-105 transition-transform"><ArrowRight size={18} /></button>
                  </form>
                </motion.div>
              ) : (
                <motion.div key="mission" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="space-y-4 md:space-y-6 relative z-10">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full flex items-center gap-2 text-green-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Em Execução</div>
                    <button onClick={() => { setMission(""); setIsTimerRunning(false); setTimeLeft(45 * 60); }} className="text-gray-500 hover:text-white text-xs underline decoration-gray-700 underline-offset-4 cursor-pointer">Cancelar</button>
                  </div>
                  <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tighter max-w-xl break-words">{mission}</h1>
                  <div className="flex items-center gap-4 md:gap-6 mt-4 md:mt-6">
                    <div className="text-5xl md:text-6xl font-mono font-light text-white tabular-nums tracking-tighter shadow-blue-500/50 drop-shadow-lg">{useTimeFormat(timeLeft)}</div>
                    <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="h-14 w-14 md:h-16 md:w-16 shrink-0 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                      {isTimerRunning ? <Pause fill="black" size={24} className="ml-1" /> : <Play fill="black" size={24} className="ml-1" />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="md:col-span-1 xl:col-span-1 flex flex-col gap-4 md:gap-6">
            <EfficiencyWidget />
          </div>

          <div className="md:col-span-1 xl:col-span-1 flex flex-col gap-4 md:gap-6">
            <SpotlightCard className={`flex-1 min-h-[160px] flex flex-col relative overflow-hidden transition-colors ${!isBackendOnline ? "border-red-500/30 opacity-80" : "border-blue-500/10 hover:border-blue-500/30"}`}>
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-[100px] pointer-events-none transition-colors group-hover:bg-blue-500/10" />
              <div className="flex justify-between items-start mb-3 relative z-10">
                <span className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Terminal size={14} className={isBackendOnline ? "text-blue-500/80" : "text-red-500"} /> Captura Rápida</span>
                {!isBackendOnline && <span className="text-[9px] text-red-400 font-mono flex items-center gap-1"><AlertCircle size={10} /> Offline</span>}
                {noteStatus === "saving" && <span className="text-[9px] text-blue-400 font-mono animate-pulse">A guardar...</span>}
                {noteStatus === "success" && <span className="text-[9px] text-green-400 font-mono flex items-center gap-1"><CheckCircle2 size={10} /> Salvo</span>}
                {noteStatus === "error" && <span className="text-[9px] text-red-400 font-mono flex items-center gap-1"><RefreshCw size={10} /> Falha</span>}
              </div>
              {isBackendOnline ? (
                <>
                  <textarea value={quickNote} onChange={(e) => setQuickNote(e.target.value)} onKeyDown={handleNoteKeyDown} placeholder="Descarregue ideias..." className="w-full flex-1 bg-transparent border-none resize-none text-xs md:text-sm text-gray-300 placeholder:text-gray-700 focus:outline-none focus:placeholder:text-gray-500 custom-scrollbar relative z-10 leading-relaxed" />
                  <button onClick={handleSaveNote} disabled={isSavingNote || !quickNote.trim()} className="absolute bottom-3 right-3 p-2 bg-blue-500/20 text-blue-400 hover:bg-blue-500/40 disabled:opacity-0 disabled:pointer-events-none rounded-xl transition-all z-20"><Send size={14} /></button>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-2"><p className="text-[10px] md:text-xs text-red-400/80 mb-2">Servidor Python inacessível.</p></div>
              )}
            </SpotlightCard>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 mt-4 md:mt-6">
          <UberWidget />
          <WeatherWidget />
        </div>
      </div>
    </motion.div>
  );
}
