import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Cpu, Globe, Activity } from "lucide-react";

const SYSTEM_LORE = [
  {
    threshold: 0,
    title: "DailyLoop Core",
    icon: Shield,
    bio: "Motor de sincronização neural de baixa latência. Projetado para isolar ruído cognitivo e maximizar a retenção de foco."
  },
  {
    threshold: 25,
    title: "Prometheus AI",
    icon: Cpu,
    bio: "Entidade de suporte cognitivo. Monitora padrões de trabalho e sugere otimizações em tempo real via terminal neural."
  },
  {
    threshold: 50,
    title: "The Hive",
    icon: Globe,
    bio: "Rede global de foco coletivo. Conecta usuários em frequências sincronizadas para reduzir a sensação de isolamento digital."
  },
  {
    threshold: 75,
    title: "Bio-Sync Protocol",
    icon: Activity,
    bio: "Módulo de monitoramento fisiológico. Ajusta a intensidade do ciclo de trabalho baseado no seu ritmo cardíaco e níveis de stress."
  }
];

const NeuralHandshake = ({ onComplete }: { onComplete: () => void }) => {
  const [progress, setProgress] = useState(0);
  const [isKeyPressed, setIsKeyPressed] = useState(false);

  // Encontra a "biografia" atual baseada no progresso
  const currentLore = [...SYSTEM_LORE].reverse().find(l => progress >= l.threshold) || SYSTEM_LORE[0];

  useEffect(() => {
    let interval: any;
    if (isKeyPressed) {
      interval = setInterval(() => {
        setProgress(p => {
          if (p >= 100) {
            clearInterval(interval);
            setTimeout(onComplete, 500);
            return 100;
          }
          return p + 1.2;
        });
      }, 20);
    } else {
      interval = setInterval(() => setProgress(p => (p > 0 ? p - 2 : 0)), 20);
    }
    return () => clearInterval(interval);
  }, [isKeyPressed, onComplete]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => e.code === "Space" && setIsKeyPressed(true);
    const up = (e: KeyboardEvent) => e.code === "Space" && setIsKeyPressed(false);
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); };
  }, []);

  return (
    <div className="relative h-screen w-screen flex items-center justify-center bg-[#020202] overflow-hidden p-20">
      
      {/* 1. DECORAÇÕES TÉCNICAS (Bordas e Coordenadas) */}
      <div className="absolute inset-10 border border-white/5 pointer-events-none">
        <div className="absolute top-0 left-0 p-4 font-mono text-[10px] text-blue-500/40 uppercase tracking-widest">
          Protocol: DailyLoop_v2 // Auth_Required
        </div>
        <div className="absolute bottom-0 right-0 p-4 font-mono text-[10px] text-blue-500/40 uppercase tracking-widest">
          Coordinates: 45.32.11N / 122.67.56W
        </div>
      </div>

      {/* 2. CONTEÚDO LATERAL (Biografia Dinâmica) */}
      <div className="absolute left-24 top-1/2 -translate-y-1/2 w-80 space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentLore.title}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <currentLore.icon className="text-blue-500" size={24} />
              <h3 className="text-xs font-bold tracking-[0.4em] uppercase text-white/80">{currentLore.title}</h3>
            </div>
            <p className="text-sm font-light leading-relaxed text-gray-500 italic">
              "{currentLore.bio}"
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Indicadores de Status Estáticos */}
        <div className="pt-8 border-t border-white/5 space-y-2 opacity-30 font-mono text-[9px] uppercase tracking-tighter">
          <p className={isKeyPressed ? "text-blue-400" : ""}>- Encriptação de Canal: {isKeyPressed ? "OK" : "PENDING"}</p>
          <p className={progress > 50 ? "text-blue-400" : ""}>- Sincronização Hive: {progress > 50 ? "ESTABLISHED" : "WAITING"}</p>
          <p className={progress > 90 ? "text-blue-400" : ""}>- Memória Prometheus: {progress > 90 ? "LOADED" : "BUFFERING"}</p>
        </div>
      </div>

      {/* 3. O REATOR CENTRAL (O Scanner) */}
      <div className="relative flex flex-col items-center">
        <motion.div 
          animate={{ scale: isKeyPressed ? 1.05 : 1 }}
          className="relative w-72 h-72 rounded-full flex items-center justify-center bg-black border border-white/10 shadow-[0_0_50px_rgba(0,0,0,1)]"
        >
          {/* Progress Circle SVG */}
          <svg className="absolute inset-0 -rotate-90" width="288" height="288">
            <circle cx="144" cy="144" r="140" stroke="rgba(255,255,255,0.03)" strokeWidth="1" fill="none" />
            <motion.circle
              cx="144" cy="144" r="140"
              stroke="#3b82f6" strokeWidth="2" fill="none"
              strokeDasharray={2 * Math.PI * 140}
              strokeDashoffset={2 * Math.PI * 140 * (1 - progress / 100)}
              className="drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
            />
          </svg>

          <div className="text-center">
            <motion.span className="text-6xl font-bold tracking-tighter tabular-nums text-white">
              {Math.floor(progress)}%
            </motion.span>
            <p className="text-[10px] tracking-[0.3em] uppercase text-blue-500/60 font-bold mt-2">Neural Link</p>
          </div>
        </motion.div>

        <p className="mt-12 text-[10px] tracking-[0.5em] uppercase text-white/20 animate-pulse">
          Mantenha [Espaço] Pressionado para Conectar
        </p>
      </div>

      {/* 4. FUNDO ATMOSFÉRICO (Aurora) */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-blue-600/5 blur-[120px] rounded-full -translate-y-1/2 translate-x-1/2" />
    </div>
  );
};

export default NeuralHandshake;