import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Code, Globe, Hash, ImageIcon, MessageSquare, Send, TrendingDown, TrendingUp, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { HeaderBack, SpotlightCard } from "../components/ui/primitives";

export default function HivePage() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([
    { id: 1, author: "Prometheus", handle: "@sys_admin", content: "Sincronização global de servidores concluída. A latência média caiu 12%. Recomendação: aproveitem para deep work.", tag: "System Update", color: "text-purple-400", bg: "bg-purple-500/10", border: "border-purple-500/20", likes: 342, comments: 15, time: "Há 1h" },
    { id: 2, author: "Elena_Dev", handle: "@elena_0x", content: "Resultados insanos com Gemini 2.0 Flash na categorização de dados em tempo real! Alguém mais testando?", tag: "Marco Atingido", color: "text-green-400", bg: "bg-green-500/10", border: "border-green-500/20", likes: 89, comments: 12, time: "Há 2h" },
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
      <HeaderBack title="The Hive" onBack={() => navigate("/")} />
      <div className="flex-1 max-w-6xl mx-auto w-full px-4 md:px-6 pb-40 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">
          <SpotlightCard className="p-4 md:p-6 border-blue-500/20 focus-within:border-blue-500/50 transition-colors shadow-lg">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-blue-500" />
              <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Transmitir Sinal à Rede</span>
            </div>
            <textarea
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              placeholder="Partilhe um progresso tático, uma ideia de arquitetura ou inicie um protocolo..."
              className="w-full bg-transparent border-none resize-none text-white placeholder:text-gray-700 focus:outline-none min-h-[60px] text-xs md:text-sm leading-relaxed"
            />
            <div className="flex flex-wrap justify-between items-center mt-2 pt-4 border-t border-white/5 gap-3">
              <div className="flex gap-1 md:gap-2">
                <button className="p-2 text-gray-500 hover:text-blue-400 hover:bg-blue-500/10 rounded-xl transition-colors"><ImageIcon size={16} /></button>
                <button className="p-2 text-gray-500 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl transition-colors"><Code size={16} /></button>
                <button className="p-2 text-gray-500 hover:text-green-400 hover:bg-green-500/10 rounded-xl transition-colors"><Hash size={16} /></button>
              </div>
              <button onClick={handleTransmit} disabled={!newPost.trim()} className="px-4 md:px-6 py-2 md:py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-50 disabled:grayscale text-white text-[10px] md:text-xs font-bold uppercase tracking-wider rounded-xl transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)] active:scale-95 flex items-center gap-2">
                Emitir <Send size={12} />
              </button>
            </div>
          </SpotlightCard>

          <div className="space-y-4">
            <AnimatePresence>
              {posts.map((post) => (
                <motion.div key={post.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }}>
                  <SpotlightCard className="p-4 md:p-6 group transition-all hover:border-white/20">
                    <div className="flex flex-wrap justify-between items-start mb-4 gap-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full bg-gradient-to-tr from-gray-800 to-gray-900 border border-white/10 flex items-center justify-center font-bold text-white shadow-inner relative overflow-hidden">
                          <div className="absolute inset-0 bg-white/5 group-hover:bg-white/10 transition-colors" />
                          {post.author.charAt(0)}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs md:text-sm font-bold text-white flex items-center gap-2 truncate">{post.author} <span className="text-[9px] md:text-[10px] font-normal text-gray-500 font-mono hidden sm:inline">{post.handle}</span></h4>
                          <p className="text-[9px] text-gray-600 mt-0.5">{post.time}</p>
                        </div>
                      </div>
                      <div className={`px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[8px] md:text-[9px] font-bold uppercase tracking-widest border shrink-0 ${post.bg} ${post.color} ${post.border}`}>{post.tag}</div>
                    </div>
                    <p className="text-xs md:text-sm text-gray-300 leading-relaxed mb-4 md:mb-6 font-light">{post.content}</p>
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
            <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500 mb-4 md:mb-6 flex items-center gap-2"><Activity size={14} /> Em Alta</h3>
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
}
