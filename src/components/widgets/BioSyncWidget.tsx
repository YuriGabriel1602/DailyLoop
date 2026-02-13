import { useStore } from "../../store/useStore";
import { Activity, Brain, Zap, Heart } from "lucide-react";

export const BioSyncWidget = () => {
  const { bio } = useStore();

  const metrics = [
    { label: 'Batimentos', value: bio.heartRate, unit: 'BPM', icon: Heart, color: 'text-red-500', bg: 'bg-red-500/10' },
    { label: 'Nível de Estresse', value: bio.stress, unit: '%', icon: Activity, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    { label: 'Foco Neural', value: bio.focus, unit: '%', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    { label: 'Energia', value: 100 - bio.stress, unit: '%', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
  ];

  return (
    <div className="h-full w-full p-6 flex flex-col justify-center">
      <h3 className="text-[10px] uppercase tracking-[0.3em] text-pink-400 font-bold mb-8 text-center">
        Monitoramento Biométrico
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className={`p-4 rounded-2xl border border-white/5 ${m.bg} flex flex-col items-center justify-center gap-2 group hover:scale-105 transition-transform duration-300`}>
            <m.icon size={24} className={`${m.color} animate-pulse`} />
            <div className="text-center">
              <span className="text-2xl font-bold text-white block">{m.value}</span>
              <span className="text-[8px] uppercase tracking-widest text-gray-400">{m.label}</span>
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-center text-[9px] text-gray-600 mt-8 uppercase tracking-widest">
        Dados sincronizados via Google Fit API (Simulado)
      </p>
    </div>
  );
};