import React, { useState, useEffect, useRef, memo } from 'react';
import { motion, AnimatePresence, useMotionTemplate, useMotionValue } from 'framer-motion';
import { 
  Home, CheckCircle2, Wallet, Bot, Settings,
  X, ArrowRight, Pause, Play, Sparkles, Cloud,
  MapPin, Music, Loader2, Globe, Send,
  ChevronLeft, Battery, Wifi, Car, ThermometerSun,
  Trash2, Fingerprint, Copy, Server, Disc, BrainCircuit, Terminal,
  Plus, Search, Youtube, Wind, Droplets, Sun, Star, AlertCircle,
  RefreshCw, TrendingUp, TrendingDown, Activity,
  MessageSquare, Zap, ImageIcon, Code, Hash
} from 'lucide-react';

// =============================================================================
// 1. CONFIGURAÇÕES BASE E SEGURANÇA
// =============================================================================

const REDIRECT_URI = "http://127.0.0.1:1420"; 
const AUTH_ENDPOINT = "https://accounts.spotify.com/authorize";
const SCOPES = [
  "streaming", "user-read-email", "user-read-private", "user-library-read", 
  "user-library-modify", "user-read-playback-state", "user-modify-playback-state", 
  "user-read-currently-playing", "playlist-read-private", "playlist-read-collaborative" 
].join(" ");

const THEME = { glass: "backdrop-blur-xl bg-white/5 border border-white/10 shadow-2xl" };

// Funções de Segurança PKCE
const generateRandomString = (length: number) => {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return values.reduce((acc, x) => acc + possible[x % possible.length], "");
};

const sha256 = async (plain: string) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(plain);
  return window.crypto.subtle.digest('SHA-256', data);
};

const base64encode = (input: ArrayBuffer) => {
  const uint8Array = new Uint8Array(input);
  let str = '';
  for (let i = 0; i < uint8Array.length; i++) { str += String.fromCharCode(uint8Array[i]); }
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

type ChatRole = 'user' | 'assistant';
interface ChatMessage { role: ChatRole; content: string; }

const useTimeFormat = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

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

// =============================================================================
// 2. HOOKS DE SERVIÇO OTIMIZADOS
// =============================================================================

const useBackendStatus = () => {
    const [isOnline, setIsOnline] = useState(true);
    useEffect(() => {
        const checkStatus = async () => {
            try {
                const res = await fetch("http://127.0.0.1:8000/", { method: "GET" });
                setIsOnline(res.ok);
            } catch (error) { setIsOnline(false); }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 15000); // Relaxado para 15s para poupar rede
        return () => clearInterval(interval);
    }, []);
    return isOnline;
};

// Hook do Spotify Otimizado (Sem re-renderizações por segundo)
const useSpotify = (token: string | null) => {
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [isPaused, setIsPaused] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchState = async () => {
    if (!token) return;
    try {
      const res = await fetch("https://api.spotify.com/v1/me/player", { headers: { Authorization: `Bearer ${token}` } });
      if (res.status === 204) { setError("Abra o Spotify num dispositivo"); return; }
      if (res.status === 401) { setError("Sessão expirada"); window.localStorage.removeItem("spotify_token"); return; }
      if (res.ok) {
        const data = await res.json();
        setError(null);
        if (data && data.item) { 
          // Só atualiza o estado se a música ou o status de pause mudou (evita re-renders pesados)
          setCurrentTrack((prev: any) => prev?.id === data.item.id ? prev : data.item);
          setIsPaused(prev => prev === !data.is_playing ? prev : !data.is_playing);
        }
      }
    } catch (e) { console.error("Spotify Sync Error", e); }
  };

  useEffect(() => {
    fetchState(); 
    const interval = setInterval(fetchState, 5000); 
    return () => clearInterval(interval);
  }, [token]);

  const togglePlay = async () => {
    if (!token) return;
    const endpoint = isPaused ? "https://api.spotify.com/v1/me/player/play" : "https://api.spotify.com/v1/me/player/pause";
    try { 
      await fetch(endpoint, { method: "PUT", headers: { Authorization: `Bearer ${token}` } }); 
      setIsPaused(!isPaused); 
      setTimeout(fetchState, 500);
    } catch (e) {}
  };

  return { currentTrack, isPaused, error, togglePlay };
};

// =============================================================================
// 3. COMPONENTES VISUAIS REUTILIZÁVEIS
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
    <div className={`group relative border border-white/10 bg-[#0a0a0b] overflow-hidden will-change-transform rounded-3xl ${className}`} onMouseMove={handleMouseMove} onClick={onClick}>
      <motion.div className="pointer-events-none absolute -inset-px opacity-0 transition duration-300 group-hover:opacity-100 z-0" style={{ background: useMotionTemplate`radial-gradient(650px circle at ${mouseX}px ${mouseY}px, rgba(255,255,255,0.06), transparent 80%)` }} />
      <div className={`relative z-10 h-full ${noPadding ? '' : 'p-5 md:p-6'}`}>{children}</div>
    </div>
  );
});

const HeaderBack = ({ title, onBack }: { title: string, onBack: () => void }) => (
  <div className="sticky top-0 z-40 flex items-center gap-4 p-4 md:p-6 bg-[#050505]/80 backdrop-blur-xl border-b border-white/5 mb-6">
    <button onClick={onBack} className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all active:scale-95 border border-white/5 hover:border-white/10">
      <ChevronLeft size={20} />
    </button>
    <h1 className="text-xs md:text-sm font-bold uppercase tracking-widest text-white truncate">{title}</h1>
  </div>
);

const StatusBar = ({ isBackendOnline }: { isBackendOnline: boolean }) => {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const timer = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(timer); }, []);
  return (
    <div className="flex justify-between items-center px-4 md:px-6 py-4 border-b border-white/5 bg-[#050505]/80 backdrop-blur-md sticky top-0 z-50">
       <div className="flex items-center gap-3 md:gap-4">
          <span className="text-xs font-bold text-white tracking-widest">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <div className="h-3 w-px bg-white/20"/>
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-gray-400 font-medium uppercase"><Cloud size={12} className="text-blue-400"/> Sistema Online</div>
       </div>
       <div className="flex items-center gap-3 md:gap-4">
          <div className={`flex items-center gap-2 px-2 py-1 rounded-full border transition-colors ${isBackendOnline ? 'bg-green-500/10 border-green-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
              <Server size={10} className={isBackendOnline ? 'text-green-400' : 'text-red-400'}/>
              <span className={`text-[9px] font-bold uppercase tracking-wider ${isBackendOnline ? 'text-green-400' : 'text-red-400'}`}>
                  {isBackendOnline ? 'Online' : 'Offline'}
              </span>
          </div>
          <div className="flex items-center gap-2 md:gap-3 text-gray-400"><Wifi size={14} /><Battery size={14} className="hidden sm:block" /><div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 border border-white/30"/></div>
       </div>
    </div>
  );
};

// =============================================================================
// 4. WIDGETS INTERATIVOS GERAIS
// =============================================================================

const YouTubeWidget = ({ youtubeKey }: { youtubeKey: string }) => {
    const [searchQuery, setSearchQuery] = useState("");
    const [videos, setVideos] = useState<any[]>([
        { id: "5C_HPTJg5ek", title: "Rust vs Go: Qual escolher para Backend?", channel: "Fireship", views: "450k", thumb: "https://i.ytimg.com/vi/5C_HPTJg5ek/maxresdefault.jpg" },
        { id: "Wk10Y_W5K5Q", title: "Como atingir o Estado de Fluxo (Deep Work)", channel: "Arquiteto Neural", views: "1.2M", thumb: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800&q=80" },
    ]);
    const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!searchQuery.trim() || !youtubeKey) return;
        setIsSearching(true);
        try {
            const res = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=3&q=${encodeURIComponent(searchQuery)}&type=video&key=${youtubeKey}`);
            const data = await res.json();
            if (data.items) {
                const newVideos = data.items.map((item: any) => ({
                    id: item.id.videoId,
                    title: item.snippet.title.replace(/&quot;/g, '"'),
                    channel: item.snippet.channelTitle,
                    views: "Novo", 
                    thumb: item.snippet.thumbnails.high.url
                }));
                setVideos(newVideos);
            }
        } catch (error) { console.error("Erro no YouTube:", error); } 
        finally { setIsSearching(false); }
    };

    return (
        <SpotlightCard className="col-span-1 md:col-span-2 xl:col-span-2 row-span-2 flex flex-col relative group" noPadding>
            <div className="p-4 md:p-5 border-b border-white/5 bg-black/40 backdrop-blur-md flex justify-between items-center z-10 flex-wrap gap-3">
                <span className="text-gray-500 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                    <Youtube size={14} className="text-red-500" /> O Seu Stream
                </span>
                <form onSubmit={handleSearch} className="relative w-full sm:w-48 max-w-full">
                    <input 
                        type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder={youtubeKey ? "Pesquisar..." : "API Ausente"}
                        disabled={!youtubeKey}
                        className="w-full bg-white/5 border border-white/10 rounded-full py-1.5 pl-3 pr-8 text-[10px] text-white focus:outline-none focus:border-red-500/50 transition-colors placeholder:text-gray-600 disabled:opacity-50"
                    />
                    <button type="submit" disabled={!youtubeKey || isSearching} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                        {isSearching ? <Loader2 size={12} className="animate-spin" /> : <Search size={12}/>}
                    </button>
                </form>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-5 space-y-4 min-h-[250px] max-h-[400px]">
                {playingVideoId ? (
                    <div className="w-full h-48 md:h-56 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative bg-black">
                        <iframe width="100%" height="100%" src={`https://www.youtube.com/embed/${playingVideoId}?autoplay=1`} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
                        <button onClick={() => setPlayingVideoId(null)} className="absolute top-2 left-2 p-1.5 bg-black/60 backdrop-blur-md text-white rounded-lg hover:bg-red-500 transition-colors"><X size={14}/></button>
                    </div>
                ) : (
                    videos.map((vid, idx) => (
                        <div key={idx} onClick={() => setPlayingVideoId(vid.id)} className="flex items-center gap-3 md:gap-4 group/item cursor-pointer bg-white/[0.02] hover:bg-white/[0.05] p-2 rounded-2xl transition-colors border border-transparent hover:border-white/10">
                            <div className="w-24 md:w-32 h-16 md:h-20 rounded-xl overflow-hidden relative shrink-0 bg-gray-900">
                                <img src={vid.thumb} className="w-full h-full object-cover opacity-80 group-hover/item:opacity-100 transition-opacity transform group-hover/item:scale-105" alt="Thumbnail"/>
                                <div className="absolute inset-0 bg-black/20 group-hover/item:bg-transparent transition-colors flex items-center justify-center">
                                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all transform scale-50 group-hover/item:scale-100"><Play size={14} fill="white"/></div>
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 pr-2">
                                <h3 className="text-xs md:text-sm font-bold text-white leading-tight truncate">{vid.title}</h3>
                                <p className="text-[10px] text-gray-500 mt-1 truncate">{vid.channel}</p>
                                <div className="flex items-center gap-2 mt-2"><span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/5">{vid.views}</span></div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </SpotlightCard>
    );
};

const UberWidget = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    return (
        <SpotlightCard className="bg-black cursor-pointer group transition-all duration-500" noPadding onClick={() => setIsExpanded(!isExpanded)}>
            <div className="p-4 md:p-5 relative z-10">
                <div className="flex justify-between items-start">
                    <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-black shadow-[0_0_15px_rgba(255,255,255,0.2)] group-hover:scale-110 transition-transform"><Car size={18}/></div>
                    <span className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1 group-hover:text-white transition-colors">Uber <ChevronLeft size={10} className={`transform transition-transform ${isExpanded ? '-rotate-90' : ''}`}/></span>
                </div>
                <div className="mt-4">
                    <div className="text-xl font-bold text-white leading-none flex items-end gap-2">4 min <span className="text-[10px] text-green-400 font-normal mb-0.5 animate-pulse">A Chegar</span></div>
                    <div className="text-xs text-gray-500 mt-1 truncate">Viagem para o Escritório</div>
                </div>
            </div>
            <AnimatePresence>
                {isExpanded ? (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="px-4 md:px-5 pb-4 md:pb-5 overflow-hidden">
                        <div className="h-24 w-full rounded-xl mb-3 overflow-hidden relative bg-gray-900 border border-white/5">
                            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '10px 10px' }} />
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
                                <img src="https://images.unsplash.com/photo-1548311543-8f0a28f413a9?w=100&q=80" className="w-full h-full object-cover" alt="Driver"/>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[10px] font-bold text-white flex justify-between">João Silva <span className="flex items-center text-yellow-400 gap-0.5"><Star size={8} fill="currentColor"/> 4.9</span></div>
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
            <div className="absolute -right-4 -top-4 w-24 h-24 bg-yellow-500 rounded-full blur-[40px] opacity-40 group-hover:opacity-60 group-hover:scale-150 transition-all duration-700 animate-pulse pointer-events-none"/>
            <div className="flex justify-between items-start relative z-10">
                <ThermometerSun size={20} className="text-yellow-400 group-hover:rotate-12 transition-transform"/>
                <span className="text-[10px] font-bold text-yellow-200/50 uppercase">Clima Hoje</span>
            </div>
            <div className="relative z-10 mt-4 transition-transform duration-500 group-hover:-translate-y-2">
                <div className="text-4xl font-black text-white">24°</div>
                <div className="text-xs text-yellow-200/80 font-medium mt-1 truncate">Parcialmente Nublado</div>
                <div className="text-[9px] text-gray-400 mt-2 flex items-center gap-1 truncate"><MapPin size={8} className="shrink-0"/> Porto Alegre, BR</div>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-4 md:p-5 pt-0 opacity-0 group-hover:opacity-100 translate-y-4 group-hover:translate-y-0 transition-all duration-500 z-10 flex justify-between border-t border-white/10 mt-4 bg-black/40 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-1 mt-3"><Droplets size={10} className="text-blue-300"/><span className="text-[9px] text-white font-mono">62%</span></div>
                <div className="flex flex-col items-center gap-1 mt-3"><Wind size={10} className="text-gray-300"/><span className="text-[9px] text-white font-mono">14km</span></div>
                <div className="flex flex-col items-center gap-1 mt-3"><Sun size={10} className="text-orange-300"/><span className="text-[9px] text-white font-mono">UV 6</span></div>
            </div>
        </div>
    </SpotlightCard>
);

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
                <motion.div key={i} initial={{ height: "10%" }} animate={{ height: `${h}%` }} transition={{ delay: i * 0.1, type: "spring" }} className={`w-full rounded-t-sm transition-all duration-300 group-hover:opacity-100 ${i === 5 ? 'bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]' : 'bg-gray-800 opacity-50'}`} />
            ))}
        </div>
    </SpotlightCard>
);

// =============================================================================
// 5. AS 5 SESSÕES PRINCIPAIS DO SISTEMA (Totalmente Funcionais)
// =============================================================================

// --- 1. HOME VIEW ---
const HomeView = ({ mission, setMission, spotifyToken, loginSpotify, userName, backendConfig, isBackendOnline }: any) => {
  const [localInput, setLocalInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(45 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  const [quickNote, setQuickNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [noteStatus, setNoteStatus] = useState<"idle" | "saving" | "success" | "error">("idle");

  useInterval(() => { if (timeLeft > 0) setTimeLeft(timeLeft - 1); else setIsTimerRunning(false); }, isTimerRunning ? 1000 : null);

  const handleSetMission = (e: React.FormEvent) => { e.preventDefault(); if (localInput.trim()) { setMission(localInput); setIsTimerRunning(true); } };

  const handleSaveNote = async () => {
    if (!quickNote.trim() || !isBackendOnline) return;
    setIsSavingNote(true); setNoteStatus("saving");
    try {
      const res = await fetch("http://127.0.0.1:8000/api/notes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content: quickNote }) });
      if (res.ok) { setQuickNote(""); setNoteStatus("success"); setTimeout(() => setNoteStatus("idle"), 3000); } 
      else { setNoteStatus("error"); setTimeout(() => setNoteStatus("idle"), 3000); }
    } catch (error) { setNoteStatus("error"); setTimeout(() => setNoteStatus("idle"), 3000); } 
    finally { setIsSavingNote(false); }
  };

  const handleNoteKeyDown = (e: React.KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleSaveNote(); } };

  return (
    // Transições agora usam o eixo Y para evitar scrollbars horizontais temporárias (Jitter)
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25, ease: 'easeOut' }} className="w-full pb-40 h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-transparent">
      <StatusBar isBackendOnline={isBackendOnline} />
      
      <div className="max-w-7xl mx-auto w-full p-4 md:p-6 space-y-4 md:space-y-6">
        
        {/* Bloco Superior (Hero, Eficiência, Quick Note, YouTube) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
           
           {/* HERO (Foco) */}
           <div className="md:col-span-2 relative group rounded-3xl overflow-hidden bg-[#0a0a0b] border border-white/10 min-h-[280px] shadow-2xl flex flex-col justify-center p-6 md:p-12">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-900/10 via-transparent to-transparent pointer-events-none"/>
              <AnimatePresence mode="wait">
               {!mission ? (
                 <motion.div key="input" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="space-y-4 md:space-y-6 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest mb-2"><Sparkles size={12}/> Sistema Pronto</div>
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-white leading-tight tracking-tight">Olá, <span className="text-blue-400">{userName}</span>.<br/>Qual o seu <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">próximo objetivo?</span></h1>
                    <form onSubmit={handleSetMission} className="relative w-full max-w-lg mt-4">
                        <input autoFocus type="text" value={localInput} onChange={(e) => setLocalInput(e.target.value)} placeholder="Insira a diretiva tática..." className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 md:py-4 pl-4 md:pl-6 pr-16 text-sm md:text-lg text-white focus:outline-none focus:border-blue-500/50 focus:bg-white/10 transition-all placeholder:text-gray-600" />
                        <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-white text-black rounded-xl hover:scale-105 transition-transform"><ArrowRight size={18}/></button>
                    </form>
                 </motion.div>
               ) : (
                 <motion.div key="mission" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="space-y-4 md:space-y-6 relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                       <div className="px-3 py-1 bg-green-500/20 border border-green-500/30 rounded-full flex items-center gap-2 text-green-400 text-[10px] font-bold uppercase tracking-widest animate-pulse">Em Execução</div>
                       <button onClick={() => { setMission(""); setIsTimerRunning(false); setTimeLeft(45*60); }} className="text-gray-500 hover:text-white text-xs underline decoration-gray-700 underline-offset-4 cursor-pointer">Cancelar</button>
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
             <SpotlightCard className={`flex-1 min-h-[160px] flex flex-col relative overflow-hidden transition-colors ${!isBackendOnline ? 'border-red-500/30 opacity-80' : 'border-blue-500/10 hover:border-blue-500/30'}`}>
               <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-[100px] pointer-events-none transition-colors group-hover:bg-blue-500/10" />
               <div className="flex justify-between items-start mb-3 relative z-10">
                 <span className="text-gray-500 text-[10px] md:text-xs font-bold uppercase tracking-widest flex items-center gap-2"><Terminal size={14} className={isBackendOnline ? "text-blue-500/80" : "text-red-500"} /> Captura Rápida</span>
                 {!isBackendOnline && <span className="text-[9px] text-red-400 font-mono flex items-center gap-1"><AlertCircle size={10}/> Offline</span>}
                 {noteStatus === "saving" && <span className="text-[9px] text-blue-400 font-mono animate-pulse">A guardar...</span>}
                 {noteStatus === "success" && <span className="text-[9px] text-green-400 font-mono flex items-center gap-1"><CheckCircle2 size={10}/> Salvo</span>}
                 {noteStatus === "error" && <span className="text-[9px] text-red-400 font-mono flex items-center gap-1"><RefreshCw size={10}/> Falha</span>}
                 {noteStatus === "idle" && isBackendOnline && quickNote.length > 0 && <span className="hidden md:inline-block text-[9px] text-gray-500 font-mono opacity-0 group-hover:opacity-100 transition-opacity">Ctrl+Enter p/ Salvar</span>}
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

           <div className="md:col-span-1 xl:col-span-1 flex flex-col gap-4 md:gap-6">
             <YouTubeWidget youtubeKey={backendConfig?.youtube_api_key || ""} />
           </div>
        </div>

        {/* Bloco Inferior (Uber, Clima, Spotify) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 mt-4 md:mt-6">
            <div className="col-span-1"><UberWidget /></div>
            <div className="col-span-1"><WeatherWidget /></div>
            
            <SpotlightCard className={`sm:col-span-2 xl:col-span-2 flex items-center transition-colors relative overflow-hidden min-h-[100px] ${spotifyToken ? 'bg-[#1DB954]/10 border-[#1DB954]/30 cursor-default' : 'bg-[#0a0a0b] border-white/10 cursor-pointer hover:border-white/20'}`} onClick={!spotifyToken ? loginSpotify : undefined}>
                 {spotifyToken ? (
                    <div className="flex items-center justify-between w-full relative z-10 px-2 md:px-4">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/50 flex items-center justify-center shadow-[0_0_15px_rgba(29,185,84,0.3)]"><Music size={18} className="text-[#1DB954]"/></div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-white text-xs md:text-sm truncate">Spotify Sincronizado</h3>
                                <p className="text-[9px] md:text-[10px] text-[#1DB954] mt-0.5 uppercase tracking-widest flex items-center gap-1 truncate"><Sparkles size={10} className="shrink-0"/> Motor Sonoro Ativo</p>
                            </div>
                        </div>
                        <div className="hidden sm:block text-[10px] text-gray-500 text-right pr-2">Controlos no<br/>Player Flutuante</div>
                    </div>
                 ) : (
                    <div className="flex items-center gap-3 md:gap-4 w-full relative z-10 px-2 md:px-4 group">
                        <div className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-white/5 rounded-full flex items-center justify-center border border-white/10 group-hover:border-[#1DB954]/50 group-hover:bg-[#1DB954]/10 transition-colors"><Music size={18} className="text-gray-400 group-hover:text-[#1DB954]"/></div>
                        <div className="min-w-0">
                            <h3 className="font-bold text-white text-xs md:text-sm mb-0.5 group-hover:text-[#1DB954] transition-colors truncate">Conectar Spotify</h3>
                            <p className="text-[9px] md:text-[10px] text-gray-500 truncate">Autorizar Link Neural</p>
                        </div>
                        <ArrowRight size={16} className="text-gray-600 ml-auto group-hover:text-[#1DB954] group-hover:translate-x-1 transition-all shrink-0"/>
                    </div>
                 )}
                 {spotifyToken && <Disc size={150} className="absolute -bottom-10 -right-10 opacity-10 animate-spin-slow text-[#1DB954] pointer-events-none hidden sm:block"/>}
             </SpotlightCard>
        </div>
      </div>
    </motion.div>
  );
};

// --- 2. TASKS VIEW ---
const TasksView = ({ onBack }: { onBack: () => void }) => {
  const [tasks, setTasks] = useState([
      { id: 1, title: "Deep Work: Finalizar Arquitetura Base", category: "Focus", completed: false },
      { id: 2, title: "Revisão de Código (Pull Requests)", category: "Work", completed: true },
      { id: 3, title: "Leitura Neural: Artigo sobre IA", category: "Learn", completed: false },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  
  const addTask = () => { 
      if(!newTaskTitle.trim()) return; 
      setTasks([{ id: Date.now(), title: newTaskTitle, category: "Focus", completed: false }, ...tasks]); 
      setNewTaskTitle(""); 
  };
  
  const toggleTask = (id: number) => setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  const deleteTask = (id: number) => setTasks(tasks.filter(t => t.id !== id));

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="w-full h-full flex flex-col bg-transparent overflow-y-auto overflow-x-hidden custom-scrollbar">
      <HeaderBack title="Eventos & Metas" onBack={onBack} />
      <div className="flex-1 px-4 md:px-6 pb-40 max-w-4xl mx-auto w-full space-y-6 md:space-y-8">
        
        <SpotlightCard className="p-2 flex gap-2 items-center focus-within:border-blue-500/50 transition-colors">
            <input 
                value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTask()} 
                placeholder="Qual o próximo alvo tático?..." 
                className="flex-1 bg-transparent px-3 md:px-4 py-2 md:py-3 text-sm md:text-base text-white focus:outline-none placeholder:text-gray-600" 
            />
            <button onClick={addTask} className="p-2 md:p-3 bg-white hover:bg-gray-200 text-black rounded-xl transition-colors shrink-0"><Plus size={18}/></button>
        </SpotlightCard>

        <div className="space-y-3">
            <AnimatePresence>
                {tasks.map((task, i) => (
                    <motion.div key={task.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }} transition={{ delay: i * 0.05, duration: 0.2 }}>
                        <SpotlightCard className={`p-4 md:p-5 flex items-center justify-between transition-all duration-300 group border-transparent hover:border-white/10 ${task.completed ? 'opacity-50' : ''}`} noPadding>
                            <div className="flex items-center gap-3 md:gap-4 min-w-0 pr-2">
                                <button onClick={() => toggleTask(task.id)} className={`w-5 h-5 md:w-6 md:h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${task.completed ? 'bg-green-500 border-green-500' : 'border-gray-600 hover:border-gray-400'}`}>
                                    {task.completed && <CheckCircle2 size={12} className="text-black"/>}
                                </button>
                                <div className="min-w-0">
                                    <h3 className={`text-xs md:text-sm font-bold transition-all truncate ${task.completed ? 'text-gray-500 line-through' : 'text-white'}`}>{task.title}</h3>
                                    <span className="text-[9px] uppercase tracking-widest text-blue-400/80 mt-1 font-mono">{task.category}</span>
                                </div>
                            </div>
                            <button onClick={() => deleteTask(task.id)} className="w-8 h-8 shrink-0 rounded-full bg-white/5 hover:bg-red-500/20 text-gray-600 hover:text-red-500 flex items-center justify-center transition-colors md:opacity-0 group-hover:opacity-100">
                                <Trash2 size={14} />
                            </button>
                        </SpotlightCard>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

// --- 3. FINANCE VIEW ---
const FinanceView = ({ onBack }: { onBack: () => void }) => {
    const chartData = [40, 65, 30, 85, 45, 90, 20];
    const transactions = [
        { id: 1, name: "Uber *Trip", amount: "- 24,90 €", type: "expense", date: "Hoje" },
        { id: 2, name: "Pagamento Cliente", amount: "+ 4.500,00 €", type: "income", date: "Ontem" },
        { id: 3, name: "AWS Web Services", amount: "- 150,00 €", type: "expense", date: "Ontem" },
    ];

    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="w-full h-full flex flex-col bg-transparent overflow-y-auto overflow-x-hidden custom-scrollbar">
        <HeaderBack title="Centro Financeiro" onBack={onBack} />
        <div className="flex-1 px-4 md:px-6 max-w-5xl mx-auto w-full pb-40 space-y-4 md:space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
            <SpotlightCard className="sm:col-span-2 md:col-span-1 p-6 md:p-8 bg-gradient-to-br from-blue-900 to-black text-white shadow-2xl overflow-hidden group border-blue-500/20">
              <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-[50px] group-hover:scale-150 transition-transform duration-700 pointer-events-none"/>
              <span className="text-[10px] font-black uppercase text-blue-300 tracking-widest relative z-10 flex items-center gap-2"><Wallet size={12}/> Saldo Total</span>
              <div className="text-3xl md:text-4xl lg:text-5xl font-black mt-4 tracking-tighter relative z-10 truncate">14.250 €</div>
              <div className="mt-4 flex items-center gap-2 text-xs text-green-400 relative z-10 truncate"><TrendingUp size={14} className="shrink-0"/> +12% vs Mês Anterior</div>
            </SpotlightCard>
            
            <SpotlightCard className="p-5 md:p-6 flex flex-col justify-center">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Entradas</span>
                <div className="text-2xl md:text-3xl font-black text-white truncate">5.200 €</div>
                <div className="h-1 w-full bg-white/5 mt-4 rounded-full overflow-hidden"><div className="h-full bg-green-500 w-[70%]"/></div>
            </SpotlightCard>

            <SpotlightCard className="p-5 md:p-6 flex flex-col justify-center">
                <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Saídas</span>
                <div className="text-2xl md:text-3xl font-black text-white truncate">1.150 €</div>
                <div className="h-1 w-full bg-white/5 mt-4 rounded-full overflow-hidden"><div className="h-full bg-red-500 w-[30%]"/></div>
            </SpotlightCard>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              <SpotlightCard className="lg:col-span-2 p-5 md:p-6 min-h-[220px] flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Fluxo Semanal</span>
                  <div className="flex items-end justify-between h-32 md:h-40 gap-1 md:gap-2 mt-4">
                      {chartData.map((val, i) => (
                          <div key={i} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full">
                              <div className="w-full flex items-end justify-center h-full bg-white/5 rounded-t-lg overflow-hidden relative">
                                  <motion.div initial={{ height: 0 }} animate={{ height: `${val}%` }} transition={{ delay: i * 0.1, type: "spring" }} className="w-full bg-blue-500/50 group-hover:bg-blue-400 transition-colors" />
                              </div>
                              <span className="text-[9px] text-gray-600 font-mono">D-{6-i}</span>
                          </div>
                      ))}
                  </div>
              </SpotlightCard>
              
              <SpotlightCard className="lg:col-span-1 p-5 md:p-6 flex flex-col">
                  <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">Últimas Transações</span>
                  <div className="flex-1 space-y-4">
                      {transactions.map(t => (
                          <div key={t.id} className="flex justify-between items-center group">
                              <div className="flex items-center gap-3 min-w-0 pr-2">
                                  <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${t.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                      {t.type === 'income' ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                  </div>
                                  <div className="min-w-0">
                                      <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">{t.name}</p>
                                      <p className="text-[9px] text-gray-600 truncate">{t.date}</p>
                                  </div>
                              </div>
                              <span className={`text-[10px] md:text-xs font-mono shrink-0 ${t.type === 'income' ? 'text-green-400' : 'text-white'}`}>{t.amount}</span>
                          </div>
                      ))}
                  </div>
              </SpotlightCard>
          </div>
        </div>
      </motion.div>
    );
};

// --- 4. THE HIVE VIEW ---
const HiveView = ({ onBack }: { onBack: () => void }) => {
    const [posts, setPosts] = useState([
        { id: 1, author: "Prometheus", handle: "@sys_admin", content: "Sincronização global de servidores concluída. A latência média caiu 12%. Recomendação: aproveitem para deep work.", tag: "System Update", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", likes: 342, comments: 15, time: "Há 1h" },
        { id: 2, author: "Elena_Dev", handle: "@elena_0x", content: "Resultados insanos com Gemini 2.0 Flash na categorização de dados em tempo real! Alguém mais testando?", tag: "Marco Atingido", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", likes: 89, comments: 12, time: "Há 2h" }
    ]);
    const [newPost, setNewPost] = useState("");

    const handleTransmit = () => {
        if (!newPost.trim()) return;
        const newSignal = { id: Date.now(), author: "Arquiteto", handle: "@arquiteto_primario", content: newPost, tag: "Sinal Local", color: "text-gray-300", bg: "bg-white/5", border: "border-white/10", likes: 0, comments: 0, time: "Agora" };
        setPosts([newSignal, ...posts]);
        setNewPost("");
    };

    return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="w-full h-full flex flex-col bg-transparent overflow-y-auto overflow-x-hidden custom-scrollbar">
        <HeaderBack title="The Hive" onBack={onBack} />
        <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 pb-40 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            
            <div className="lg:col-span-2 space-y-4 md:space-y-6">
                <SpotlightCard className="p-4 md:p-6 border-blue-500/20 focus-within:border-blue-500/50 transition-colors shadow-lg">
                    <div className="flex items-center gap-2 mb-4">
                        <Activity size={16} className="text-blue-500"/>
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Transmitir Sinal à Rede</span>
                    </div>
                    <textarea 
                        value={newPost} onChange={e => setNewPost(e.target.value)}
                        placeholder="Partilhe um progresso tático, uma ideia de arquitetura ou inicie um protocolo..."
                        className="w-full bg-transparent border-none resize-none text-white placeholder:text-gray-700 focus:outline-none min-h-[60px] text-xs md:text-sm leading-relaxed"
                    />
                    <div className="flex flex-wrap justify-between items-center mt-2 pt-4 border-t border-white/5 gap-3">
                        <div className="flex gap-1 md:gap-2">
                            <button className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors"><ImageIcon size={16}/></button>
                            <button className="p-2 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-colors"><Code size={16}/></button>
                            <button className="p-2 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-xl transition-colors"><Hash size={16}/></button>
                        </div>
                        <button onClick={handleTransmit} disabled={!newPost.trim()} className="px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:grayscale text-white text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95 flex items-center gap-2">
                            Emitir <Send size={12}/>
                        </button>
                    </div>
                </SpotlightCard>

                <div className="space-y-4">
                    <AnimatePresence>
                        {posts.map(post => (
                            <motion.div key={post.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                                <SpotlightCard className="p-4 md:p-6 group transition-all hover:border-white/20">
                                    <div className="flex flex-wrap justify-between items-start mb-4 gap-2">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center font-bold text-white shadow-inner relative overflow-hidden">
                                                <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors"/>
                                                {post.author.charAt(0)}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="text-xs md:text-sm font-bold text-white flex items-center gap-2 truncate">{post.author} <span className="text-[9px] md:text-[10px] font-normal text-gray-500 font-mono hidden sm:inline">{post.handle}</span></h4>
                                                <p className="text-[9px] text-gray-600 mt-0.5">{post.time}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-widest border shrink-0 ${post.bg} ${post.color} ${post.border}`}>
                                            {post.tag}
                                        </div>
                                    </div>
                                    <p className="text-xs md:text-sm text-gray-300 leading-relaxed mb-4 md:mb-6 font-light">
                                        {post.content}
                                    </p>
                                    <div className="flex items-center gap-4 md:gap-8 text-gray-500 flex-wrap">
                                        <button className="flex items-center gap-1.5 hover:text-yellow-400 transition-colors group/btn">
                                            <div className="p-1 md:p-1.5 rounded-full group-hover/btn:bg-yellow-400/10"><Zap size={14} /></div>
                                            <span className="text-[10px] md:text-xs font-mono">Impulso ({post.likes})</span>
                                        </button>
                                        <button className="flex items-center gap-1.5 hover:text-white transition-colors group/btn">
                                            <div className="p-1 md:p-1.5 rounded-full group-hover/btn:bg-white/10"><MessageSquare size={14} /></div>
                                            <span className="text-[10px] md:text-xs font-mono">{post.comments} Resp</span>
                                        </button>
                                    </div>
                                </SpotlightCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>

            <div className="lg:col-span-1 space-y-4 md:space-y-6">
                <SpotlightCard className="flex flex-col items-center justify-center p-6 md:p-8 relative overflow-hidden border-blue-500/10 min-h-[150px]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0,transparent_70%)] pointer-events-none" />
                    <Globe size={40} className="text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.5)] mb-4 animate-[spin_20s_linear_infinite]" />
                    <h3 className="text-2xl md:text-3xl font-black text-white tracking-tighter tabular-nums">1.284</h3>
                    <p className="text-[9px] md:text-[10px] text-blue-400 uppercase tracking-widest mt-1 font-bold">Nós Ativos</p>
                </SpotlightCard>

                <SpotlightCard className="p-5 md:p-6">
                    <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 md:mb-6 flex items-center gap-2">
                        <Activity size={14}/> Em Alta
                    </h3>
                    <div className="space-y-4">
                        {[
                            { tag: "#DeepWork", volume: "842", trend: "up" },
                            { tag: "#RustLang", volume: "320", trend: "up" },
                            { tag: "#Burnout", volume: "156", trend: "down" },
                        ].map((topic, i) => (
                            <div key={i} className="flex items-center justify-between group cursor-pointer border-b border-white/5 pb-3 last:border-0 last:pb-0">
                                <div className="min-w-0 pr-2">
                                    <p className="text-xs md:text-sm font-bold text-gray-300 group-hover:text-blue-400 transition-colors truncate">{topic.tag}</p>
                                    <p className="text-[9px] text-gray-600 mt-1 font-mono">{topic.volume} sinais</p>
                                </div>
                                {topic.trend === "up" ? (
                                    <div className="w-6 h-6 md:w-8 md:h-8 shrink-0 rounded-full bg-green-500/10 flex items-center justify-center text-green-500/70 group-hover:text-green-400 transition-colors"><TrendingUp size={12} /></div>
                                ) : (
                                    <div className="w-6 h-6 md:w-8 md:h-8 shrink-0 rounded-full bg-red-500/10 flex items-center justify-center text-red-500/70 group-hover:text-red-400 transition-colors"><TrendingDown size={12} /></div>
                                )}
                            </div>
                        ))}
                    </div>
                </SpotlightCard>
            </div>
        </div>
      </motion.div>
    );
};

// --- 5. SETTINGS VIEW ---
const SettingsView = ({ onBack, config, isBackendOnline }: any) => {
  const [toggles, setToggles] = useState([true, false, true]);
  const handleToggle = (index: number) => setToggles(prev => prev.map((v, i) => i === index ? !v : v));

  return (
      <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="w-full h-full flex flex-col bg-transparent overflow-y-auto overflow-x-hidden custom-scrollbar">
          <HeaderBack title="Configurações do Sistema" onBack={onBack}/>
          <div className="flex-1 px-4 md:px-6 pb-40 max-w-4xl mx-auto w-full space-y-4 md:space-y-6">
              
              <SpotlightCard className={`p-5 md:p-6 border ${isBackendOnline ? 'border-green-500/20' : 'border-red-500/30'}`}>
                  <div className="flex items-center gap-3 md:gap-4 mb-2">
                      <div className={`p-2 md:p-3 shrink-0 rounded-full ${isBackendOnline ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                          <Server size={20} className="md:w-6 md:h-6" />
                      </div>
                      <div className="min-w-0">
                          <h2 className="text-xs md:text-sm font-bold uppercase tracking-widest text-white truncate">Estado do Núcleo Backend</h2>
                          <p className="text-[9px] md:text-[10px] text-gray-500 mt-1 line-clamp-2 md:line-clamp-1">{isBackendOnline ? 'Comunicação estabelecida com sucesso na porta 8000.' : 'Servidor Python está offline. Execute o ficheiro main.py.'}</p>
                      </div>
                  </div>
              </SpotlightCard>

              <SpotlightCard className="p-5 md:p-6">
                  <h2 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 md:mb-6">Chaves de Integração</h2>
                  <div className="space-y-4 md:space-y-6">
                      <div>
                          <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 uppercase mb-2">Spotify Client ID</label>
                          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-2 md:p-3 overflow-hidden">
                              <code className="text-xs md:text-sm text-gray-300 font-mono truncate flex-1">{config?.spotify_client_id || "Não Detetado"}</code>
                          </div>
                      </div>
                      <div>
                          <label className="block text-[9px] md:text-[10px] font-bold text-gray-400 uppercase mb-2">YouTube API Key</label>
                          <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-2 md:p-3 overflow-hidden">
                              <code className="text-xs md:text-sm text-gray-300 font-mono truncate flex-1">{config?.youtube_api_key ? "••••••••••••••••••••••••••••••••" : "Não Detetado"}</code>
                          </div>
                      </div>
                      <div className="pt-4 border-t border-white/5">
                          <label className="block text-[9px] md:text-[10px] font-bold text-blue-400 uppercase mb-2">Redirect URI (Spotify)</label>
                          <div className="flex gap-2">
                              <div className="flex-1 bg-blue-500/10 border border-blue-500/20 rounded-xl px-3 py-2 md:px-4 md:py-3 flex items-center overflow-hidden">
                                  <code className="text-xs md:text-sm text-blue-300 font-mono truncate w-full">{REDIRECT_URI}</code>
                              </div>
                              <button onClick={() => navigator.clipboard.writeText(REDIRECT_URI)} className="px-3 md:px-4 shrink-0 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-colors"><Copy size={16}/></button>
                          </div>
                      </div>
                  </div>
              </SpotlightCard>

              <SpotlightCard className="p-5 md:p-6">
                  <h2 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 md:mb-6">Preferências Neurais</h2>
                  <div className="space-y-3 md:space-y-4">
                      {[
                          { title: "Foco Estrito", desc: "Bloqueia distrações", active: toggles[0] },
                          { title: "Áudio", desc: "Avisos sonoros", active: toggles[1] },
                          { title: "Animações", desc: "Efeitos avançados", active: toggles[2] },
                      ].map((item, i) => (
                          <div key={i} onClick={() => handleToggle(i)} className="cursor-pointer flex items-center justify-between p-3 md:p-4 bg-white/[0.02] border border-white/5 rounded-xl hover:border-white/10 transition-colors">
                              <div className="pr-2">
                                  <h4 className="text-xs md:text-sm font-bold text-white truncate">{item.title}</h4>
                                  <p className="text-[9px] md:text-[10px] text-gray-500 mt-0.5 truncate">{item.desc}</p>
                              </div>
                              <div className={`w-8 h-4 md:w-10 md:h-5 shrink-0 rounded-full flex items-center px-1 transition-colors ${item.active ? 'bg-blue-500' : 'bg-gray-700'}`}>
                                  <div className={`w-2.5 h-2.5 md:w-3 md:h-3 bg-white rounded-full transition-transform ${item.active ? 'translate-x-3.5 md:translate-x-5' : 'translate-x-0'}`} />
                              </div>
                          </div>
                      ))}
                  </div>
              </SpotlightCard>
          </div>
      </motion.div>
  );
};


// =============================================================================
// 6. GAVETA DA IA PROMETHEUS
// =============================================================================

const PrometheusDrawer = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => {
  const [chat, setChat] = useState<ChatMessage[]>([{ role: 'assistant', content: 'Núcleo Prometheus online.' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chat]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setChat(prev => [...prev, { role: 'user', content: userMsg }]);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message: userMsg }) });
      if (response.ok) {
        const data = await response.json();
        setChat(prev => [...prev, { role: 'assistant', content: data.response }]);
      } else { setChat(prev => [...prev, { role: 'assistant', content: "⚠️ Erro no processamento neural." }]); }
    } catch (error) { setChat(prev => [...prev, { role: 'assistant', content: "🔴 Sinal Perdido: Backend offline." }]); } finally { setLoading(false); }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm" />
          <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '110%' }} transition={{ type: "spring", damping: 30, stiffness: 300 }} className="fixed bg-[#0f0f11] border border-white/5 rounded-l-3xl shadow-2xl z-50 flex flex-col overflow-hidden w-[95vw] sm:w-[420px] max-w-full h-[100dvh] sm:h-[calc(100vh-32px)] top-0 sm:top-4 right-0">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-gradient-to-r from-[#1a1a1d] to-[#0f0f11]"><div className="flex items-center gap-3 text-purple-500"><Bot size={20} /><span className="font-black text-xs sm:text-sm tracking-[0.2em] uppercase">Prometheus IA</span></div><button onClick={onClose} className="p-2 text-gray-500 hover:text-white transition-colors"><X size={18} /></button></div>
            <div className="flex-1 p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto custom-scrollbar">
              {chat.map((msg, i) => (
                <div key={i} className={`flex gap-3 sm:gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0 border shadow-inner ${msg.role === 'assistant' ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>{msg.role === 'assistant' ? <Bot size={16} /> : <Fingerprint size={16} />}</div>
                  <div className={`p-3 sm:p-4 bg-white/[0.03] border border-white/5 text-xs sm:text-sm text-gray-300 leading-relaxed max-w-[85%] rounded-2xl shadow-sm break-words ${msg.role === 'assistant' ? 'rounded-tl-none' : 'rounded-tr-none'}`}>{msg.content}</div>
                </div>
              ))}
              {loading && <div className="text-gray-500 text-[10px] sm:text-xs ml-10 sm:ml-14 flex items-center gap-2"><Loader2 size={12} className="animate-spin"/> A processar...</div>}
              <div ref={endRef} />
            </div>
            <div className="p-4 sm:p-6 bg-[#0a0a0b] border-t border-white/5 relative">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()} placeholder="Injetar comando neural..." className="w-full bg-[#151516] border border-white/10 rounded-2xl py-3 sm:py-4 pl-4 sm:pl-6 pr-12 sm:pr-14 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors" />
                <button onClick={handleSend} disabled={loading} className="absolute right-6 sm:right-8 top-1/2 -translate-y-1/2 text-purple-500 hover:text-purple-400 disabled:opacity-50 transition-colors"><ArrowRight size={16} /></button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// =============================================================================
// 7. ORQUESTRADOR PRINCIPAL
// =============================================================================

const FloatingDock = ({ activeTab, setActiveTab, togglePrometheus }: any) => {
  const items = [
    { id: 'home', icon: Home, tooltip: "Painel" }, 
    { id: 'tasks', icon: CheckCircle2, tooltip: "Metas" }, 
    { id: 'finance', icon: Wallet, tooltip: "Finanças" }, 
    { id: 'hive', icon: Globe, tooltip: "The Hive" }, 
    { id: 'settings', icon: Settings, tooltip: "Sistema" }
  ];
  return (
    <div className="fixed bottom-4 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 w-full px-4 sm:w-auto sm:px-0">
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className={`flex items-center justify-between sm:justify-center gap-1 sm:gap-2 px-3 sm:px-4 py-2 sm:py-3 rounded-2xl sm:rounded-full ${THEME.glass} shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-white/10 overflow-x-auto custom-scrollbar`}>
        {items.map((item) => (
          <div key={item.id} className="relative group shrink-0">
              <button onClick={() => setActiveTab(item.id)} className={`p-2.5 sm:p-3 rounded-full transition-all duration-300 ${activeTab === item.id ? 'bg-white text-black scale-105 sm:scale-110 shadow-[0_0_20px_rgba(255,255,255,0.4)]' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}>
                <item.icon size={20} fill={activeTab === item.id ? "currentColor" : "none"} className="sm:w-[22px] sm:h-[22px]" />
              </button>
              <div className="hidden sm:block absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">{item.tooltip}</div>
          </div>
        ))}
        <div className="w-px h-6 bg-white/10 mx-1 sm:mx-2 shrink-0" />
        <div className="relative group shrink-0">
            <button onClick={togglePrometheus} className="p-2.5 sm:p-3 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded-full transition-all relative">
                <Bot size={20} className="sm:w-[22px] sm:h-[22px]" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 sm:w-2 sm:h-2 bg-purple-500 rounded-full animate-pulse" />
            </button>
            <div className="hidden sm:block absolute -top-10 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 text-white text-[9px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">Prometheus IA</div>
        </div>
      </motion.div>
    </div>
  );
};

export const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('home');
  const [mission, setMission] = useState('');
  const [isPrometheusOpen, setPrometheusOpen] = useState(false);
  const [spotifyToken, setSpotifyToken] = useState<string | null>(null);
  const [backendConfig, setBackendConfig] = useState<any>({});
  
  const isBackendOnline = useBackendStatus();

  useEffect(() => {
    const initAuth = async () => {
       let fetchedConfig: any = {};
       try {
          const res = await fetch("http://127.0.0.1:8000/api/config");
          fetchedConfig = await res.json();
          setBackendConfig(fetchedConfig);
       } catch (err) { console.error("A aguardar servidor Python..."); }

       const urlParams = new URLSearchParams(window.location.search);
       const code = urlParams.get('code');
       const error = urlParams.get('error');

       if (error) {
          window.history.replaceState({}, document.title, window.location.pathname);
          return;
       }

       if (code) {
           const codeVerifier = window.localStorage.getItem('spotify_code_verifier');
           if (codeVerifier && fetchedConfig.spotify_client_id) {
               fetch("https://accounts.spotify.com/api/token", {
                   method: 'POST',
                   headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                   body: new URLSearchParams({
                       client_id: fetchedConfig.spotify_client_id,
                       grant_type: 'authorization_code',
                       code: code,
                       redirect_uri: REDIRECT_URI,
                       code_verifier: codeVerifier,
                   }),
               })
               .then(res => res.json())
               .then(data => {
                   if (data.access_token) {
                       window.localStorage.setItem("spotify_token", data.access_token);
                       setSpotifyToken(data.access_token);
                       window.history.replaceState({}, document.title, window.location.pathname); 
                   }
               })
               .catch(err => console.error(err));
           }
       } else {
           const token = window.localStorage.getItem("spotify_token");
           if (token) setSpotifyToken(token);
       }
    };
    initAuth();
  }, []);

  const loginSpotify = async () => {
    if (!backendConfig.spotify_client_id) { 
        alert("Erro: Client ID não encontrado. Servidor offline."); return; 
    }
    const codeVerifier = generateRandomString(64);
    window.localStorage.setItem('spotify_code_verifier', codeVerifier);
    const hashed = await sha256(codeVerifier);
    const codeChallenge = base64encode(hashed);

    const params = new URLSearchParams({
      client_id: backendConfig.spotify_client_id,
      response_type: 'code',
      redirect_uri: REDIRECT_URI,
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: codeChallenge,
    });
    window.location.href = `${AUTH_ENDPOINT}?${params.toString()}`;
  };
  
  // Hook otimizado isolado aqui (Performance Boost!)
  const { currentTrack, isPaused, togglePlay } = useSpotify(spotifyToken);

  const renderContent = () => {
    switch (activeTab) {
      case 'home': return <HomeView key="home" mission={mission} setMission={setMission} spotifyToken={spotifyToken} loginSpotify={loginSpotify} userName="Arquiteto" backendConfig={backendConfig} isBackendOnline={isBackendOnline} />;
      case 'tasks': return <TasksView key="tasks" onBack={() => setActiveTab('home')} />;
      case 'finance': return <FinanceView key="finance" onBack={() => setActiveTab('home')} />;
      case 'hive': return <HiveView key="hive" onBack={() => setActiveTab('home')} />;
      case 'settings': return <SettingsView key="settings" onBack={() => setActiveTab('home')} config={backendConfig} isBackendOnline={isBackendOnline} />;
      default: return <HomeView key="home" mission={mission} setMission={setMission} userName="Arquiteto" backendConfig={backendConfig} isBackendOnline={isBackendOnline} />;
    }
  };

  return (
    <div className="w-full h-full relative flex flex-col overflow-x-hidden">
       {/* Fundos estáticos corrigidos (Não causam barras de scroll horizontais agora) */}
       <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center -translate-x-1/2 left-1/2">
           <div className="w-[150vw] h-[150vw] max-w-[1000px] max-h-[1000px] bg-blue-900/5 rounded-full blur-[100px] md:blur-[150px]" />
       </div>
       
       <div className="relative z-10 flex-1 flex flex-col h-full overflow-hidden">
          {/* Animações agora operam no eixo Y para evitar scroll-jitter horizontal */}
          <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
       </div>

       <FloatingDock activeTab={activeTab} setActiveTab={setActiveTab} togglePrometheus={() => setPrometheusOpen(true)} />
       <PrometheusDrawer isOpen={isPrometheusOpen} onClose={() => setPrometheusOpen(false)} />

       {spotifyToken && currentTrack && (
        <motion.div drag dragMomentum={false} className="fixed bottom-20 sm:bottom-24 right-4 sm:right-6 z-[60] cursor-grab active:cursor-grabbing group touch-none">
            <div className="bg-black/90 backdrop-blur-xl border border-white/10 p-2.5 sm:p-3 rounded-full flex items-center gap-3 sm:gap-4 shadow-[0_0_30px_rgba(0,0,0,0.5)] transition-all group-hover:border-[#1DB954]/30 max-w-[calc(100vw-32px)]">
                <img src={currentTrack.album.images[0]?.url} alt="Album" className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full object-cover border border-[#1DB954]/50 shrink-0 ${!isPaused ? 'animate-[spin_10s_linear_infinite]' : ''}`}/>
                <div className="flex flex-col pr-1 sm:pr-2 min-w-[80px] max-w-[100px] sm:max-w-[120px]">
                    <span className="text-[10px] sm:text-xs font-bold text-white truncate">{currentTrack.name}</span>
                    <span className="text-[9px] sm:text-[10px] text-gray-400 truncate">{currentTrack.artists[0].name}</span>
                </div>
                <button onClick={togglePlay} className="p-1.5 sm:p-2 text-white bg-white/5 rounded-full hover:text-[#1DB954] hover:bg-white/10 transition-colors shrink-0">
                    {isPaused ? <Play size={16} fill="currentColor" className="ml-0.5 sm:w-[18px] sm:h-[18px]"/> : <Pause size={16} fill="currentColor" className="sm:w-[18px] sm:h-[18px]"/>}
                </button>
            </div>
        </motion.div>
      )}
    </div>
  );
};

export default Dashboard;