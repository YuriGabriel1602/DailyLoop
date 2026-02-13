export const TasksModule = () => {
  return (
    <div className="col-span-12 p-10 bg-white/5 rounded-[40px] border border-white/10 backdrop-blur-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
      <h2 className="text-4xl font-extralight tracking-tighter mb-8">Priority <span className="text-blue-500">Queue</span></h2>
      <div className="space-y-4">
        {["Refatorar Módulo Neural", "Sincronizar Banco de Dados"].map((task, i) => (
          <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl flex justify-between items-center">
            <span className="text-gray-400 font-light">{task}</span>
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_10px_#3b82f6]" />
          </div>
        ))}
      </div>
    </div>
  );
};