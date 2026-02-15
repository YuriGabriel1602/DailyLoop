import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';
import { 
  Home, CheckCircle2, Wallet, BrainCircuit, Bot, 
  X, ArrowRight, Pause, Play, Command, Sparkles, Zap, Moon, Sun, Cloud,
  Shield, Fingerprint, Plus, 
  Calendar, MapPin, TrendingDown, DollarSign, Music, Loader2,
  Globe, Heart, MessageCircle, Share2, Image as ImageIcon, Send,
  Video, Mic, Headphones, Cast, ChevronLeft, Youtube, ExternalLink, MoreHorizontal,
  Clock, Battery, Wifi, Bell, Search, Menu, Car, Navigation, ThermometerSun, Wind,
  Trash2
} from 'lucide-react';

// =============================================================================
// 1. DADOS E MOCKS (SISTEMA DE INTEGRAÇÃO VIVO)
// =============================================================================

const CURRENT_USER = { name: "Arquiteto", handle: "@voce", avatar: "EU", color: "bg-blue-600" };

const WEATHER_DATA = { 
  temp: 24, 
  condition: "Parcialmente Nublado", 
  city: "São Paulo, BR", 
  humidity: "62%",
  uv: "Moderado"
};

// =============================================================================
// 2. HOOKS E UTILITÁRIOS
// =============================================================================

// Hook para formatar tempo (MM:SS)
const useTimeFormat = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Hook de Intervalo Personalizado
function useInterval(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);
  useEffect(() => { savedCallback.current = callback; }, [callback]);
  useEffect(() => {
    if (delay !== null) {
      const id = setInterval(() => savedCallback.current(), delay);
      return () => clearInterval(id);
    }
  }, [delay]);
}

// --- TEMA ---
const THEME = {
  bg: "bg-[#050505]",
  glass: "backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl",
  glassHigh: "backdrop-blur-2xl bg-white/10 border border-white/20 shadow-xl",
};

// =============================================================================
// 3. COMPONENTES VISUAIS
// =============================================================================

const SpotlightCard = memo(({ children, className = "", onClick, noPadding = false }: any) => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  function handleMouseMove({ currentTarget, clientX, clientY }: any) {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  }

  return (
    <div
      className={`group relative border border-white/10 bg-[#0a0a0b] overflow-hidden will-change-transform ${className}`}
      onMouseMove={handleMouseMove}
      onClick={onClick}
    >
      <motion.div
        className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100"
        style={{ background: useMotionTemplate`radial-gradient(650px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.06), transparent 80%)` }}
      />
      <div className={`relative h-full ${noPadding ? '' : 'p-6'}`}>{children}</div>
    </div>
  );
});

const HeaderBack = ({ title, onBack }: { title: string, onBack: () => void }) => (
  <div className={`sticky top-0 z-40 flex items-center gap-4 p-6 ${THEME.glass} border-b border-white/5 mb-6`}>
    <button onClick={onBack} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95">
      <ChevronLeft size={24} />
    </button>
    <h1 className="text-xl font-bold uppercase tracking-widest text-white">{title}</h1>
  </div>
);

// BARRA DE STATUS FUNCIONAL
const StatusBar = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex justify-between items-center px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-md sticky top-0 z-50">
       <div className="flex items-center gap-4">
          <span className="text-xs font-bold text-white tracking-widest">
            {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="h-3 w-px bg-white/20"/>
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-medium uppercase">
             <Cloud size={12} className="text-blue-400"/> {WEATHER_DATA.temp}°C
          </div>
       </div>
       <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-2 py-1 bg-green-500/10 rounded-full border border-green-500/20">
             <Headphones size={10} className="text-green-400"/>
             <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">Online</span>
          </div>
          <div className="flex items-center gap-3 text-gray-400">
             <Wifi size={14} />
             <Battery size={14} />
             <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 border border-white/30"/>
          </div>
       </div>
    </div>
  );
};

// =============================================================================
// 4. HOME VIEW (HUB CENTRAL)
// =============================================================================

interface HomeViewProps {
  mission: string;
  setMission: (m: string) => void;
}

const HomeView = ({ mission, setMission }: HomeViewProps) => {
  const [localInput, setLocalInput] = useState("");
  // Estado do Timer
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutos
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  // Estado do Spotify
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);
  const [songProgress, setSongProgress] = useState(30);
  // Estado do Uber
  const [uberStatus, setUberStatus] = useState("4 min");

  // Timer Logic
  useInterval(() => {
    if (timeLeft > 0) setTimeLeft(timeLeft - 1);
    else setIsTimerRunning(false);
  }, isTimerRunning ? 1000 : null);

  // Spotify Mock Progress
  useInterval(() => {
    setSongProgress(p => (p >= 100 ? 0 : p + 1));
  }, spotifyPlaying ? 1000 : null);

  // Uber Mock Update
  useEffect(() => {
    const statuses = ["4 min", "2 min", "1 min", "Chegando", "Chegou"];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % statuses.length;
      setUberStatus(statuses[i]);
    }, 5000); // Muda a cada 5s para demo
    return () => clearInterval(interval);
  }, []);

  const handleSetMission = (e: React.FormEvent) => {
    e.preventDefault();
    if (localInput.trim()) {
      setMission(localInput);
      setIsTimerRunning(true);
    }
  };

  const toggleTimer = () => setIsTimerRunning(!isTimerRunning);

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
      className="w-full pb-32 h-full overflow-y-auto custom-scrollbar bg-[#050505]"
    >
      <StatusBar />

      <div className="max-w-7xl mx-auto w-full p-4 space-y-4">
        
        {/* BARRA DE APPS */}
        <div className="flex gap-4 px-2 py-2 overflow-x-auto custom-scrollbar snap-x mb-4">
          {[
            { id: 'meet', name: 'Standup', icon: Video, color: 'text-blue-400', bg: 'bg-blue-500/20' },
            { id: 'spotify', name: 'Music', icon: Headphones, color: 'text-green-400', bg: 'bg-green-500/20' },
            { id: 'calendar', name: 'Agenda', icon: Calendar, color: 'text-orange-400', bg: 'bg-orange-500/20' },
            { id: 'ai', name: 'AI', icon: Bot, color: 'text-purple-400', bg: 'bg-purple-500/20' },
          ].map((app) => (
            <div key={app.id} className="flex flex-col items-center gap-2 cursor-pointer group min-w-[70px] snap-center">
              <div className={`relative w-16 h-16 rounded-[1.5rem] ${app.bg} border border-white/10 flex items-center justify-center transition-all group-hover:scale-105 group-hover:border-white/30`}>
                <app.icon className={app.color} size={24} />
              </div>
              <span className="text-[9px] text-gray-400 font-bold uppercase tracking-wider group-hover:text-white transition-colors">{app.name}</span>
            </div>
          ))}
        </div>

        {/* HERO SECTION */}
        <div className="w-full relative group rounded-[2rem] overflow-hidden bg-[#0a0a0b] border border-white/10 min-h-[300px] shadow-2xl transition-all duration-500">
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1534972195531-d756b9bfa9f2?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-30 group-hover:opacity-40 transition-opacity duration-700 mix-blend-screen" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#050505] via-[#050505]/90 to-transparent" />
          
          <div className="relative p-8 md:p-12 h-full flex flex-col justify-center z-10 max-w-3xl">
             <AnimatePresence mode="wait">
               {!mission ? (
                 <motion.div 
                    key="input-mode" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                 >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold uppercase tracking-widest mb-2">
                        <Sparkles size={14}/> Sistema Pronto
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white leading-tight">
                      Qual é o seu <br/>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">próximo objetivo?</span>
                    </h1>
                    <form onSubmit={handleSetMission} className="relative w-full max-w-xl">
                        <input autoFocus type="text" value={localInput} onChange={(e) => setLocalInput(e.target.value)} placeholder="Digite para iniciar o ciclo..." className="w-full bg-white/10 border border-white/20 rounded-2xl py-5 px-6 text-xl text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/15 transition-all placeholder:text-white/30" />
                        <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl hover:scale-105 transition-transform"><ArrowRight size={20} /></button>
                    </form>
                 </motion.div>
               ) : (
                 <motion.div 
                    key="timer-mode" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                    className="space-y-6"
                 >
                    <div className="flex items-center gap-2 mb-4">
                        <div className="px-3 py-1 bg-red-500/20 border border-red-500/30 rounded-full flex items-center gap-2 text-red-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">
                          <div className="w-1.5 h-1.5 bg-red-500 rounded-full" /> {isTimerRunning ? "Ao Vivo" : "Pausado"}
                        </div>
                        <button onClick={() => { setMission(""); setIsTimerRunning(false); setTimeLeft(45*60); }} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-gray-400 hover:text-white text-[10px] font-bold uppercase tracking-widest transition-colors">
                           Cancelar
                        </button>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black text-white mb-6 leading-[1.1] tracking-tighter max-w-xl">{mission}</h1>
                    <div className="flex items-center gap-6">
                        <div className="text-7xl font-mono font-light text-white tabular-nums tracking-tighter shadow-blue-500/50 drop-shadow-lg">
                           {useTimeFormat(timeLeft)}
                        </div>
                        <button onClick={toggleTimer} className="h-20 w-20 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-105 transition-transform shadow-[0_0_30px_rgba(255,255,255,0.3)]">
                          {isTimerRunning ? <Pause fill="black" size={28} className="ml-1" /> : <Play fill="black" size={28} className="ml-1" />}
                        </button>
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>
        </div>

        {/* WIDGETS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
           {/* UBER */}
           <SpotlightCard className="col-span-1 bg-black rounded-[2rem] flex flex-col justify-between" noPadding>
              <div className="p-5">
                 <div className="flex justify-between items-start">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black"><Car size={18}/></div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Uber</span>
                 </div>
                 <div className="mt-4">
                    <div className="text-xl font-bold text-white leading-none">{uberStatus}</div>
                    <div className="text-xs text-gray-500 mt-1">Viagem em andamento</div>
                 </div>
              </div>
              <div className="px-5 pb-5 pt-0">
                 <div className="p-2 bg-white/5 rounded-xl flex items-center gap-3 border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-[10px]">🚗</div>
                    <div><div className="text-[10px] font-bold text-white">Tesla Model 3</div><div className="text-[9px] text-gray-500">DXS-9090</div></div>
                 </div>
              </div>
           </SpotlightCard>

           {/* CLIMA */}
           <SpotlightCard className="col-span-1 bg-gradient-to-br from-orange-500/20 to-yellow-500/5 border-orange-500/20 rounded-[2rem]" noPadding>
              <div className="p-5 h-full flex flex-col justify-between relative overflow-hidden">
                 <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500 rounded-full blur-[40px] opacity-40 animate-pulse"/>
                 <div className="flex justify-between items-start relative z-10">
                    <ThermometerSun size={20} className="text-yellow-400"/>
                    <span className="text-[10px] font-bold text-yellow-200/50 uppercase">Clima</span>
                 </div>
                 <div className="relative z-10">
                    <div className="text-3xl font-black text-white">{WEATHER_DATA.temp}°</div>
                    <div className="text-xs text-yellow-200/80 font-medium">{WEATHER_DATA.condition}</div>
                    <div className="text-[9px] text-gray-400 mt-1 flex items-center gap-1"><MapPin size={8}/> {WEATHER_DATA.city}</div>
                 </div>
              </div>
           </SpotlightCard>

           {/* SPOTIFY */}
           <SpotlightCard className="col-span-2 bg-gradient-to-r from-[#1DB954]/20 to-black rounded-[2rem] border-[#1DB954]/20" noPadding>
              <div className="p-5 flex items-center gap-4 h-full relative overflow-hidden">
                 <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-black to-transparent z-10"/>
                 <img src="https://i.scdn.co/image/ab67616d0000b273574945d81702580554f7a372" className="absolute right-0 top-0 h-full w-2/3 object-cover opacity-60 mix-blend-overlay" />
                 
                 <div className="relative z-20 flex flex-col justify-between h-full w-full">
                    <div className="flex justify-between items-start w-full">
                       <div className="w-8 h-8 bg-[#1DB954] rounded-full flex items-center justify-center text-black shadow-lg shadow-green-900/50"><Headphones size={16} fill="black"/></div>
                       <div className="px-2 py-0.5 bg-black/50 backdrop-blur-md rounded border border-white/10 text-[9px] text-white uppercase font-bold">{spotifyPlaying ? "Tocando Agora" : "Pausado"}</div>
                    </div>
                    <div className="mt-4">
                       <h3 className="text-white font-bold text-lg leading-tight truncate w-3/4">Interstellar Suite</h3>
                       <p className="text-gray-400 text-xs">Hans Zimmer</p>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                       <button onClick={() => setSpotifyPlaying(!spotifyPlaying)} className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center hover:scale-105 transition-transform">
                          {spotifyPlaying ? <Pause size={14} fill="black"/> : <Play size={14} fill="black"/>}
                       </button>
                       <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                          <motion.div animate={{ width: `${songProgress}%` }} className="h-full bg-[#1DB954] rounded-full"/>
                       </div>
                    </div>
                 </div>
              </div>
           </SpotlightCard>
        </div>

        {/* FEED */}
        <div className="mt-8">
           <h2 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-4 px-2 flex items-center gap-2">
              <Sparkles size={14} className="text-blue-500"/> Seu Stream
           </h2>
           <div className="space-y-4">
              <SpotlightCard className="rounded-[1.5rem] bg-[#0f0f11] border-white/5 p-0" noPadding>
                 <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/3 h-40 md:h-auto relative overflow-hidden">
                       <img src="https://i.ytimg.com/vi/5C_HPTJg5ek/maxresdefault.jpg" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                       <div className="absolute top-3 left-3 px-2 py-1 bg-red-600 text-white text-[9px] font-bold uppercase rounded shadow-lg">YouTube</div>
                       <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-colors">
                          <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center"><Play size={16} fill="white"/></div>
                       </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-center">
                       <h3 className="text-white font-bold text-lg leading-tight mb-2">Rust vs Go: Qual escolher para Backend?</h3>
                       <p className="text-gray-400 text-xs mb-3">Fireship • Recomendado</p>
                       <div className="mt-auto flex items-center gap-4">
                          <span className="text-[10px] text-gray-500 flex items-center gap-1"><ExternalLink size={10}/> 450k views</span>
                          <button className="text-xs font-bold text-blue-400 hover:text-white transition-colors flex items-center gap-1">Assistir <ArrowRight size={12}/></button>
                       </div>
                    </div>
                 </div>
              </SpotlightCard>
           </div>
        </div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// 5. TASKS VIEW (FUNCIONAL)
// =============================================================================

const TasksView = ({ onBack }: { onBack: () => void }) => {
  const [tasks, setTasks] = useState([
    { id: 1, title: "Deep Work: Rust Backend", time: "14:00 - 16:00", location: "Home Office", completed: false },
    { id: 2, title: "Reunião de Alinhamento", time: "17:00 - 18:00", location: "Google Meet", completed: true }
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const addTask = () => {
    if(!newTaskTitle.trim()) return;
    setTasks([...tasks, { id: Date.now(), title: newTaskTitle, time: "A Definir", location: "Remoto", completed: false }]);
    setNewTaskTitle("");
  };

  const toggleTask = (id: number) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id: number) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full h-full overflow-y-auto custom-scrollbar">
      <HeaderBack title="Eventos & Metas" onBack={onBack} />
      <div className="px-6 max-w-4xl mx-auto space-y-4 pb-32">
        {/* ADD TASK */}
        <div className="flex gap-2 mb-6">
           <input 
             value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)}
             onKeyDown={e => e.key === 'Enter' && addTask()}
             placeholder="Nova tarefa..." 
             className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-blue-500"
           />
           <button onClick={addTask} className="p-3 bg-white text-black rounded-xl hover:bg-gray-200"><Plus size={20}/></button>
        </div>

        {tasks.map((task) => (
          <SpotlightCard key={task.id} className="p-6 rounded-3xl flex items-center justify-between group cursor-pointer border-white/5">
            <div className="flex items-center gap-6">
              <button onClick={() => toggleTask(task.id)} className={`w-6 h-6 rounded-full border flex items-center justify-center transition-all ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-500 hover:border-white'}`}>
                 {task.completed && <CheckCircle2 size={14} className="text-black"/>}
              </button>
              <div className={task.completed ? "opacity-50 line-through" : ""}>
                <h3 className="text-xl font-bold text-white group-hover:text-blue-400 transition-colors">{task.title}</h3>
                <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 uppercase tracking-wider"><Clock size={12} /> {task.time} • <MapPin size={12} /> {task.location}</div>
              </div>
            </div>
            <button onClick={() => deleteTask(task.id)} className="w-10 h-10 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-500 hover:text-red-500 flex items-center justify-center transition-all"><Trash2 size={18} /></button>
          </SpotlightCard>
        ))}
      </div>
    </motion.div>
  );
};

// =============================================================================
// 6. FINANCE VIEW (VISUALIZAÇÃO)
// =============================================================================

const FinanceView = ({ onBack }: { onBack: () => void }) => (
  <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full h-full overflow-y-auto custom-scrollbar">
    <HeaderBack title="Centro Financeiro" onBack={onBack} />
    <div className="px-6 max-w-5xl mx-auto pb-32">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <SpotlightCard className="p-8 rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-blue-900 text-white shadow-2xl shadow-blue-900/50">
          <span className="text-[10px] font-black uppercase text-blue-200 tracking-widest">Saldo Atual</span>
          <div className="text-5xl font-black mt-4 tracking-tighter">R$ 14.250</div>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold bg-white/20 px-3 py-1 rounded-full w-fit backdrop-blur-md"><TrendingDown size={12} /> -5% esta semana</div>
        </SpotlightCard>
        <SpotlightCard className="md:col-span-2 p-8 rounded-[2.5rem] flex items-end justify-between gap-2 border-t border-white/10">
          {[40, 65, 35, 70, 90, 60, 100, 50, 80, 40, 65, 95].map((h, i) => (
               <motion.div initial={{ height: 0 }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.05 }} key={i} className="w-full bg-white/10 rounded-md hover:bg-blue-500 transition-colors cursor-pointer" />
          ))}
        </SpotlightCard>
      </div>
    </div>
  </motion.div>
);

// =============================================================================
// 7. HIVE VIEW (SOCIAL FUNCIONAL)
// =============================================================================

const HiveView = ({ onBack }: { onBack: () => void }) => {
  const [posts, setPosts] = useState([
    { id: 1, user: { name: "Alice Dev", handle: "@alicedev", avatar: "AD", color: "bg-pink-500" }, content: "O novo módulo de IA do DailyLoop está insano. 🤯 #produtividade", likes: 234, comments: 45, timestamp: "2h atrás", liked: true },
    { id: 2, user: { name: "Lucas Ops", handle: "@lucasops", avatar: "LO", color: "bg-green-500" }, content: "Modo 'Monge' ativado. Zero notificações. 🧘‍♂️", likes: 89, comments: 12, timestamp: "5h atrás", liked: false }
  ]);
  const [content, setContent] = useState('');

  const addPost = () => {
    if(!content.trim()) return;
    setPosts([{ id: Date.now(), user: CURRENT_USER, content, likes: 0, comments: 0, timestamp: "Agora", liked: false }, ...posts]);
    setContent('');
  };

  const toggleLike = (id: number) => {
    setPosts(posts.map(p => p.id === id ? { ...p, liked: !p.liked, likes: p.liked ? p.likes - 1 : p.likes + 1 } : p));
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="w-full h-full flex flex-col">
      <HeaderBack title="The Hive" onBack={onBack} />
      <div className="flex-1 overflow-y-auto px-6 pb-32 max-w-3xl mx-auto w-full custom-scrollbar">
        <div className="mb-8 p-1 rounded-3xl bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500">
           <div className="bg-[#0a0a0b] rounded-[1.4rem] p-4">
              <div className="flex gap-4">
                 <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">EU</div>
                 <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Compartilhe seu progresso..." className="flex-1 bg-transparent text-white text-sm focus:outline-none resize-none h-20 placeholder:text-gray-600" />
              </div>
              <div className="flex justify-between items-center mt-2 border-t border-white/5 pt-2">
                 <div className="flex gap-2 text-gray-500"><ImageIcon size={18} className="hover:text-white cursor-pointer"/><Globe size={18} className="hover:text-white cursor-pointer"/></div>
                 <button onClick={addPost} className="px-4 py-1.5 bg-white text-black text-xs font-bold uppercase rounded-lg hover:bg-gray-200 transition-colors">Publicar</button>
              </div>
           </div>
        </div>
        <div className="space-y-6">
           {posts.map(post => (
              <SpotlightCard key={post.id} className="p-0 rounded-[2rem] bg-[#0f0f11] border-white/5">
                 <div className="p-6">
                    <div className="flex justify-between items-start mb-4">
                       <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl ${post.user.color} flex items-center justify-center font-bold text-white shadow-lg`}>{post.user.avatar}</div>
                          <div><div className="font-bold text-white text-sm">{post.user.name}</div><div className="text-xs text-gray-500">{post.user.handle} • {post.timestamp}</div></div>
                       </div>
                       <MoreHorizontal size={20} className="text-gray-600 cursor-pointer"/>
                    </div>
                    <p className="text-gray-200 text-sm leading-relaxed mb-4">{post.content}</p>
                    <div className="flex gap-6 pt-4 border-t border-white/5">
                       <button onClick={() => toggleLike(post.id)} className={`flex items-center gap-2 text-xs font-bold transition-colors ${post.liked ? 'text-pink-500' : 'text-gray-500 hover:text-white'}`}>
                          <Heart size={18} fill={post.liked ? "currentColor" : "none"}/> {post.likes}
                       </button>
                       <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white"><MessageCircle size={18}/> {post.comments}</button>
                       <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-white ml-auto"><Share2 size={18}/></button>
                    </div>
                 </div>
              </SpotlightCard>
           ))}
        </div>
      </div>
    </motion.div>
  );
};

// =============================================================================
// 8. PROMETHEUS AI (CHAT FUNCIONAL)
// =============================================================================

const PrometheusDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [messages, setMessages] = useState<{role: 'user'|'ai', content: string}[]>([
    { role: 'ai', content: 'Sistemas online. Como posso otimizar seu fluxo hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const userMsg = input;
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);

    // Simula resposta da IA
    setTimeout(() => {
      const responses = [
        "Entendido. Analisando seus padrões de produtividade...",
        "Essa é uma excelente estratégia. Recomendo focar nisso pelos próximos 45 minutos.",
        "Processei sua solicitação. Seus dados financeiros estão estáveis.",
        "Estou aqui para ajudar. O que mais você precisa?"
      ];
      const randomResp = responses[Math.floor(Math.random() * responses.length)];
      setMessages(prev => [...prev, { role: 'ai', content: randomResp }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed top-2 bottom-2 right-2 w-[450px] max-w-[90vw] bg-[#0f0f11] border border-[#2d2d30] rounded-[2rem] shadow-2xl z-50 flex flex-col overflow-hidden">
             <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1a1a1d]">
                <div className="flex items-center gap-3"><Bot className="text-purple-500" size={24}/><h2 className="text-white font-bold text-lg">Prometheus AI</h2></div>
                <button onClick={onClose}><X size={20} className="text-gray-500 hover:text-white"/></button>
             </div>
             <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
                {messages.map((m, i) => (
                   <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${m.role === 'ai' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                         {m.role === 'ai' ? <Bot size={16}/> : <div className="w-2 h-2 bg-blue-400 rounded-full"/>}
                      </div>
                      <div className={`p-3 rounded-2xl text-sm ${m.role === 'ai' ? 'bg-[#1a1a1d] text-gray-300 rounded-tl-none' : 'bg-blue-600/20 text-white rounded-tr-none border border-blue-500/20'}`}>
                         {m.content}
                      </div>
                   </div>
                ))}
                {loading && <div className="flex items-center gap-2 text-gray-500 text-xs ml-12"><Loader2 size={12} className="animate-spin"/> Processando...</div>}
                <div ref={endRef}/>
             </div>
             <div className="p-4 bg-[#0a0a0b] border-t border-white/5 relative">
                <input 
                  value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()}
                  placeholder="Digite um comando..." 
                  className="w-full bg-[#151516] border border-white/10 rounded-xl py-4 pl-6 pr-12 text-sm text-white focus:outline-none focus:border-purple-500/50" 
                />
                <button onClick={handleSend} className="absolute right-8 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-400"><Send size={18}/></button>
             </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// =============================================================================
// 9. ESTRUTURA GLOBAL E NAVEGAÇÃO
// =============================================================================

const FloatingDock = ({ activeTab, setActiveTab, togglePrometheus }: any) => {
  const items = [
    { id: 'home', icon: Home }, 
    { id: 'tasks', icon: CheckCircle2 }, 
    { id: 'finance', icon: Wallet },
    { id: 'hive', icon: Globe } 
  ];
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`flex items-center gap-2 px-4 py-3 rounded-full ${THEME.glass} shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10`}>
        {items.map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} className={`p-3 rounded-full transition-all duration-300 ${activeTab === item.id ? 'bg-white text-black scale-110 shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
            <item.icon size={22} fill={activeTab === item.id ? "currentColor" : "none"} />
          </button>
        ))}
        <div className="w-px h-6 bg-white/10 mx-2" />
        <button onClick={togglePrometheus} className="p-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-full transition-all"><Bot size={22} /></button>
      </motion.div>
    </div>
  );
};

const AuthPortal = ({ onLogin }: { onLogin: () => void }) => (
  <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[#020202]">
    <div className="absolute inset-0 z-0 pointer-events-none"><motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.15, 0.1] }} transition={{ duration: 15, repeat: Infinity, ease: "linear" }} className="absolute top-1/2 left-1/4 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px]" /></div>
    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="z-10 w-full max-w-md">
      <SpotlightCard className="p-10 rounded-[2.5rem] border-white/10 shadow-2xl bg-black/40 backdrop-blur-3xl">
        <h2 className="text-3xl font-black text-white text-center mb-10 uppercase tracking-tighter">Acesso ao Kernel</h2>
        <div className="flex justify-center mb-6"><div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20"><Fingerprint className="text-blue-500" size={32} /></div></div>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onLogin(); }}>
          <input type="text" placeholder="IDENTIFICADOR" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-xs text-white focus:outline-none focus:border-blue-500/50 uppercase tracking-widest font-bold" />
          <input type="password" placeholder="TOKEN" className="w-full bg-white/5 border border-white/10 rounded-xl py-4 px-6 text-xs text-white focus:outline-none focus:border-blue-500/50 uppercase tracking-widest font-bold" />
          <button type="submit" className="w-full py-4 bg-white text-black hover:scale-[1.02] font-black uppercase tracking-[0.2em] rounded-xl transition-all shadow-xl">Autenticar</button>
        </form>
      </SpotlightCard>
    </motion.div>
  </div>
);

// --- APP MASTER ---
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [isPrometheusOpen, setPrometheusOpen] = useState(false);
  const [mission, setMission] = useState('');

  const goBackToHome = () => setActiveTab('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeView mission={mission} setMission={setMission} />;
      case 'tasks': return <TasksView onBack={goBackToHome} />;
      case 'finance': return <FinanceView onBack={goBackToHome} />;
      case 'hive': return <HiveView onBack={goBackToHome} />;
      default: return <HomeView mission={mission} setMission={setMission} />;
    }
  };

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#050505] text-white selection:bg-blue-500/30 font-sans flex flex-col">
      <AnimatePresence mode="wait">
        {!isAuthenticated ? (
          <AuthPortal key="portal" onLogin={() => setIsAuthenticated(true)} />
        ) : (
          <motion.div key="dashboard-view" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} className="w-full h-full relative flex flex-col">
             <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center"><div className="w-[1000px] h-[1000px] bg-blue-900/5 rounded-full blur-[150px]" /></div>
             
             <div className="relative z-10 flex-1 flex flex-col overflow-hidden">
                <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
             </div>

             <FloatingDock activeTab={activeTab} setActiveTab={setActiveTab} togglePrometheus={() => setPrometheusOpen(true)} />
             <PrometheusDrawer isOpen={isPrometheusOpen} onClose={() => setPrometheusOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 0px; display: none; }`}</style>
    </div>
  );
}