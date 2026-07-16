import { useState } from "react";
import { LogOut, Server, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { HeaderBack, SpotlightCard, useBackendStatus } from "../components/ui/primitives";
import { useStore } from "../store/useStore";

export default function SettingsPage() {
  const navigate = useNavigate();
  const isBackendOnline = useBackendStatus();
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const [toggles, setToggles] = useState([true, false, true]);
  const handleToggle = (index: number) => setToggles((prev) => prev.map((v, i) => (i === index ? !v : v)));

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="w-full h-full flex flex-col bg-transparent overflow-y-auto overflow-x-hidden custom-scrollbar">
      <HeaderBack title="Configurações do Sistema" onBack={() => navigate("/")} />
      <div className="flex-1 px-4 md:px-6 pb-40 max-w-4xl mx-auto w-full space-y-4 md:space-y-6">
        <SpotlightCard className={`p-5 md:p-6 border ${isBackendOnline ? "border-green-500/20" : "border-red-500/30"}`}>
          <div className="flex items-center gap-3 md:gap-4">
            <div className={`p-2 md:p-3 shrink-0 rounded-full ${isBackendOnline ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
              <Server size={20} className="md:w-6 md:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs md:text-sm font-bold uppercase tracking-widest text-white truncate">Estado do Núcleo Backend</h2>
              <p className="text-[9px] md:text-[10px] text-gray-500 mt-1 line-clamp-2 md:line-clamp-1">
                {isBackendOnline ? "Comunicação estabelecida com sucesso." : "Servidor Python está offline. Execute o ficheiro main.py."}
              </p>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 md:p-6">
          <h2 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 md:mb-6">Conta</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Username</span><span className="text-white font-mono">{user?.username}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="text-white font-mono truncate ml-4">{user?.email}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Papel</span><span className="text-white font-mono">{user?.role}</span></div>
          </div>
          {user?.role === "admin" && (
            <Link to="/admin" className="mt-4 flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300">
              <ShieldCheck size={14} /> Painel de administração
            </Link>
          )}
          <button onClick={handleLogout} className="mt-6 w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-bold uppercase py-3 rounded-xl transition-colors">
            <LogOut size={14} /> Sair
          </button>
        </SpotlightCard>

        <SpotlightCard className="p-5 md:p-6">
          <h2 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-4 md:mb-6">Preferências</h2>
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
                <div className={`w-8 h-4 md:w-10 md:h-5 shrink-0 rounded-full flex items-center px-1 transition-colors ${item.active ? "bg-blue-500" : "bg-gray-700"}`}>
                  <div className={`w-2.5 h-2.5 md:w-3 md:h-3 bg-white rounded-full transition-transform ${item.active ? "translate-x-3.5 md:translate-x-5" : "translate-x-0"}`} />
                </div>
              </div>
            ))}
          </div>
        </SpotlightCard>
      </div>
    </motion.div>
  );
}
