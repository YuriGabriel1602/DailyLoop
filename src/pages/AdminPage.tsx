import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, ShieldOff, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { HeaderBack, SpotlightCard } from "../components/ui/primitives";

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
  is_active: boolean;
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<string[]>([]);

  const loadUsers = () => api.get<AdminUser[]>("/api/admin/users").then(setUsers);
  const loadLogs = () => api.get<{ lines: string[] }>("/api/admin/logs?lines=200").then((r) => setLogs(r.lines));

  useEffect(() => {
    loadUsers();
    loadLogs();
  }, []);

  const toggleActive = async (u: AdminUser) => {
    const updated = await api.patch<AdminUser>(`/api/admin/users/${u.id}`, { is_active: !u.is_active });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
  };

  const changeRole = async (u: AdminUser, role: "user" | "admin") => {
    const updated = await api.patch<AdminUser>(`/api/admin/users/${u.id}`, { role });
    setUsers((prev) => prev.map((x) => (x.id === u.id ? updated : x)));
  };

  const deleteUser = async (u: AdminUser) => {
    if (!confirm(`Excluir a conta de ${u.username}?`)) return;
    await api.delete(`/api/admin/users/${u.id}`);
    setUsers((prev) => prev.filter((x) => x.id !== u.id));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="w-full h-full flex flex-col bg-transparent overflow-y-auto overflow-x-hidden custom-scrollbar">
      <HeaderBack title="Administração" onBack={() => navigate("/")} />
      <div className="flex-1 px-4 md:px-6 pb-40 max-w-5xl mx-auto w-full space-y-4 md:space-y-6">
        <SpotlightCard className="p-5 md:p-6">
          <h2 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Usuários</h2>
          <div className="space-y-3">
            {users.map((u) => (
              <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white/[0.02] border border-white/5 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate">{u.username} <span className="text-gray-500 font-normal">({u.email})</span></p>
                  <p className={`text-[10px] uppercase font-mono mt-0.5 ${u.is_active ? "text-green-400" : "text-red-400"}`}>{u.is_active ? "ativo" : "desativado"}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <select value={u.role} onChange={(e) => changeRole(u, e.target.value as "user" | "admin")} className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-xs text-white">
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                  <button onClick={() => toggleActive(u)} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300" title={u.is_active ? "Desativar" : "Ativar"}>
                    <ShieldOff size={14} />
                  </button>
                  <button onClick={() => deleteUser(u)} className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-lg text-gray-300">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-5 md:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[10px] md:text-xs font-bold text-gray-500 uppercase tracking-widest">Logs do sistema</h2>
            <button onClick={loadLogs} className="p-2 bg-white/5 hover:bg-white/10 rounded-lg text-gray-300"><RefreshCw size={14} /></button>
          </div>
          <div className="bg-black/40 rounded-xl p-3 max-h-80 overflow-y-auto custom-scrollbar font-mono text-[10px] text-gray-400 space-y-0.5">
            {logs.length === 0 ? <p>Sem logs ainda.</p> : logs.map((line, i) => <p key={i} className="whitespace-pre-wrap break-all">{line}</p>)}
          </div>
        </SpotlightCard>
      </div>
    </motion.div>
  );
}
