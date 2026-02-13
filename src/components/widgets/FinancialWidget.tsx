import { useStore } from "../../store/useStore";
import { motion } from "framer-motion";
import { PieChart, ArrowUpRight, ArrowDownLeft } from "lucide-react";

export const FinancialWidget = () => {
  const { finances } = useStore();
  
  const income = finances.filter(f => f.type === 'income').reduce((acc, curr) => acc + curr.value, 0);
  const expense = finances.filter(f => f.type === 'expense').reduce((acc, curr) => acc + curr.value, 0);
  const total = income - expense;

  // Gera o gradiente cônico para o gráfico de pizza
  const generatePieChart = () => {
    if (finances.length === 0) return 'conic-gradient(#333 0deg 360deg)';
    
    let currentDeg = 0;
    const totalVal = finances.reduce((acc, curr) => acc + curr.value, 0);
    
    const stops = finances.map(f => {
      const deg = (f.value / totalVal) * 360;
      const stop = `${f.color} ${currentDeg}deg ${currentDeg + deg}deg`;
      currentDeg += deg;
      return stop;
    }).join(', ');
    
    return `conic-gradient(${stops})`;
  };

  return (
    <div className="h-full w-full p-6 flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-[10px] uppercase tracking-[0.3em] text-emerald-400 font-bold flex items-center gap-2">
          <PieChart size={12} /> Fluxo de Caixa
        </h3>
        <span className={`text-xs font-mono font-bold ${total >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
          R$ {total.toFixed(2)}
        </span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row items-center gap-8 justify-center">
        {/* Gráfico */}
        <div className="relative w-40 h-40 rounded-full shadow-[0_0_30px_rgba(0,0,0,0.5)] flex-shrink-0" style={{ background: generatePieChart() }}>
          <div className="absolute inset-2 bg-[#080808] rounded-full flex items-center justify-center flex-col">
             <span className="text-[9px] text-gray-500 uppercase tracking-widest">Saldo</span>
             <span className="text-white font-bold text-lg">R$ {total}</span>
          </div>
        </div>

        {/* Lista de Transações */}
        <div className="flex-1 w-full space-y-3 overflow-y-auto custom-scrollbar max-h-60 pr-2">
          {finances.map((item, i) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] border border-white/5"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                <span className="text-xs text-gray-300">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-gray-400">R$ {item.value}</span>
                {item.type === 'income' 
                  ? <ArrowUpRight size={12} className="text-emerald-500" /> 
                  : <ArrowDownLeft size={12} className="text-red-500" />
                }
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};