import { useStore } from "../../store/useStore";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, Clock, Tag } from "lucide-react";

export const AgendaWidget = () => {
  const { tasks, toggleTask } = useStore();

  const getCategoryColor = (cat: string) => {
    switch (cat) {
      case 'work': return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'health': return 'bg-green-500/20 text-green-300 border-green-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  return (
    <div className="h-full w-full p-6 flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-[10px] uppercase tracking-[0.3em] text-blue-400 font-bold flex items-center gap-2">
          <Clock size={12} /> Cronograma Neural
        </h3>
        <span className="text-[9px] text-gray-500 uppercase tracking-widest">{tasks.filter(t => !t.done).length} Pendentes</span>
      </div>
      
      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2">
        {tasks.map((task, i) => (
          <motion.div 
            key={task.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={`group flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 ${
              task.done 
              ? 'bg-blue-900/5 border-blue-500/5 opacity-40 grayscale' 
              : 'bg-white/[0.03] border-white/5 hover:border-blue-500/20 hover:bg-white/[0.05]'
            }`}
          >
            <button 
              onClick={() => toggleTask(task.id)} 
              className={`transition-colors ${task.done ? 'text-blue-500' : 'text-gray-600 group-hover:text-blue-400'}`}
            >
              {task.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            </button>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <p className={`text-sm font-medium truncate ${task.done ? 'line-through text-gray-500' : 'text-gray-200'}`}>
                  {task.title}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-500 font-mono flex items-center gap-1">
                  {task.time}
                </span>
                <span className={`text-[9px] px-2 py-0.5 rounded-md uppercase tracking-wider border ${getCategoryColor(task.category)} flex items-center gap-1`}>
                  <Tag size={8} /> {task.category}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
        
        {tasks.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center opacity-30">
            <p className="text-xs uppercase tracking-widest">Nenhuma tarefa designada</p>
          </div>
        )}
      </div>
    </div>
  );
};