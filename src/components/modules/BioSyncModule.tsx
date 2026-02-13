import { Activity, Heart, Wind } from "lucide-react";
import { motion } from "framer-motion";

export const BioSyncModule = () => (
  <div className="space-y-8 animate-in fade-in duration-700">
    <div className="grid grid-cols-3 gap-4">
      {[
        { label: "Ritmo", val: "72", unit: "BPM", icon: Heart, color: "text-red-500" },
        { label: "Oxigênio", val: "98", unit: "%", icon: Wind, color: "text-blue-400" },
        { label: "Stress", val: "Lo", unit: "lvl", icon: Activity, color: "text-green-400" }
      ].map((stat, i) => (
        <div key={i} className="p-6 rounded-3xl bg-white/5 border border-white/5">
          <stat.icon size={16} className={`${stat.color} mb-4`} />
          <p className="text-[10px] uppercase tracking-widest text-gray-500">{stat.label}</p>
          <p className="text-2xl font-mono">{stat.val}<span className="text-xs ml-1 opacity-30">{stat.unit}</span></p>
        </div>
      ))}
    </div>
    {/* Gráfico Simulado */}
    <div className="h-40 w-full bg-white/5 rounded-3xl border border-white/5 flex items-end p-4 gap-1">
      {[...Array(40)].map((_, i) => (
        <motion.div 
          key={i}
          animate={{ height: [`${20+Math.random()*60}%`, `${10+Math.random()*80}%`] }}
          transition={{ repeat: Infinity, duration: 1, delay: i * 0.05 }}
          className="flex-1 bg-blue-500/20 rounded-t-full" 
        />
      ))}
    </div>
  </div>
);