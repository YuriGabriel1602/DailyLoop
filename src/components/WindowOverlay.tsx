import { motion } from "framer-motion";
import { useStore } from "../store/useStore";

export const WindowOverlay = () => {
  const { togglePrometheus } = useStore();
  
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-2xl p-20"
    >
      <div className="w-full max-w-4xl h-[60vh] bg-[#070707] border border-blue-500/30 rounded-lg font-mono p-6">
        <div className="flex justify-between border-b border-blue-500/20 pb-4 mb-4">
          <span className="text-blue-500 text-xs tracking-widest">PROMETHEUS_CORE_v4.0</span>
          <button onClick={() => togglePrometheus(false)} className="text-red-500 hover:underline">EXIT</button>
        </div>
        <div className="text-green-500/80 text-sm">
          <p className="animate-pulse">{">"} Aguardando comando neural...</p>
          <input autoFocus className="w-full bg-transparent outline-none text-white mt-4" placeholder="_" />
        </div>
      </div>
    </motion.div>
  );
};