import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { TrendingDown, TrendingUp, Upload, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { HeaderBack, SpotlightCard } from "../components/ui/primitives";

interface Transaction {
  id: number;
  description: string;
  amount: string;
  category: string;
  type: "income" | "expense";
  date: string;
}

interface Stats {
  balance: string;
  income: string;
  expenses: string;
  by_category: Record<string, string>;
  month_over_month: { total_change_percent: number | null };
  budgets: { category: string; monthly_limit: string; spent_this_month: string; percent_used: number; over_budget: boolean }[];
}

const formatBRL = (value: string | number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function FinancePage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = () => {
    api.get<Stats>("/api/finance/stats").then(setStats);
    api.get<Transaction[]>("/api/finance/transactions").then((rows) => setTransactions(rows.slice(0, 6)));
  };

  useEffect(refresh, []);

  const addTransaction = async () => {
    if (!description.trim() || !amount) return;
    try {
      await api.post("/api/finance/transactions", { description, amount, type });
      setDescription("");
      setAmount("");
      refresh();
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 401)) alert("Não foi possível salvar a transação.");
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportStatus("Importando...");
    try {
      const form = new FormData();
      form.append("file", file);
      const result = await api.postForm<{ imported: number; skipped_duplicates: number }>("/api/finance/import", form);
      setImportStatus(`${result.imported} importadas, ${result.skipped_duplicates} duplicadas puladas.`);
      refresh();
    } catch (err) {
      setImportStatus(err instanceof ApiError ? err.message : "Falha ao importar.");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setImportStatus(null), 5000);
    }
  };

  const categoryEntries = stats ? Object.entries(stats.by_category) : [];
  const maxCategoryValue = Math.max(1, ...categoryEntries.map(([, v]) => Number(v)));

  return (
    <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -15 }} transition={{ duration: 0.25 }} className="w-full h-full flex flex-col bg-transparent overflow-y-auto overflow-x-hidden custom-scrollbar">
      <HeaderBack title="Centro Financeiro" onBack={() => navigate("/")} />
      <div className="flex-1 px-4 md:px-6 max-w-5xl mx-auto w-full pb-40 space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <SpotlightCard className="sm:col-span-2 md:col-span-1 p-6 md:p-8 bg-gradient-to-br from-blue-900 to-black text-white shadow-2xl overflow-hidden group border-blue-500/20">
            <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/20 rounded-full blur-[50px] group-hover:scale-150 transition-transform duration-700 pointer-events-none" />
            <span className="text-[10px] font-black uppercase text-blue-300 tracking-widest relative z-10 flex items-center gap-2"><Wallet size={12} /> Saldo Total</span>
            <div className="text-3xl md:text-4xl lg:text-5xl font-black mt-4 tracking-tighter relative z-10 truncate">{stats ? formatBRL(stats.balance) : "—"}</div>
            {stats?.month_over_month.total_change_percent != null && (
              <div className={`mt-4 flex items-center gap-2 text-xs relative z-10 truncate ${stats.month_over_month.total_change_percent >= 0 ? "text-red-400" : "text-green-400"}`}>
                <TrendingUp size={14} className="shrink-0" /> {stats.month_over_month.total_change_percent.toFixed(1)}% vs Mês Anterior
              </div>
            )}
          </SpotlightCard>

          <SpotlightCard className="p-5 md:p-6 flex flex-col justify-center">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Entradas</span>
            <div className="text-2xl md:text-3xl font-black text-white truncate">{stats ? formatBRL(stats.income) : "—"}</div>
          </SpotlightCard>

          <SpotlightCard className="p-5 md:p-6 flex flex-col justify-center">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-2">Saídas</span>
            <div className="text-2xl md:text-3xl font-black text-white truncate">{stats ? formatBRL(stats.expenses) : "—"}</div>
          </SpotlightCard>
        </div>

        <SpotlightCard className="p-5 md:p-6 flex flex-col md:flex-row gap-3 md:items-center">
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (ex: Ifood almoço)" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
          <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor (ex: 45,90)" className="w-full md:w-40 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50" />
          <select value={type} onChange={(e) => setType(e.target.value as "income" | "expense")} className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white focus:outline-none">
            <option value="expense">Despesa</option>
            <option value="income">Renda</option>
          </select>
          <button onClick={addTransaction} className="bg-white text-black font-semibold rounded-xl px-4 py-2 text-sm shrink-0">Adicionar</button>
          <label className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-4 py-2 text-sm text-gray-300 cursor-pointer shrink-0 transition-colors">
            <Upload size={14} /> Importar CSV/OFX
            <input ref={fileInputRef} type="file" accept=".csv,.ofx,.qfx" className="hidden" onChange={handleImport} />
          </label>
        </SpotlightCard>
        {importStatus && <p className="text-xs text-gray-400 -mt-2">{importStatus}</p>}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <SpotlightCard className="lg:col-span-2 p-5 md:p-6 min-h-[220px] flex flex-col justify-between">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Gastos por Categoria</span>
            {categoryEntries.length === 0 ? (
              <p className="text-xs text-gray-600 mt-8 text-center">Sem despesas registradas ainda.</p>
            ) : (
              <div className="flex items-end justify-between h-32 md:h-40 gap-1 md:gap-2 mt-4">
                {categoryEntries.map(([category, value], i) => (
                  <div key={category} className="flex-1 flex flex-col items-center gap-2 group cursor-pointer h-full">
                    <div className="w-full flex items-end justify-center h-full bg-white/5 rounded-t-lg overflow-hidden relative">
                      <motion.div initial={{ height: 0 }} animate={{ height: `${(Number(value) / maxCategoryValue) * 100}%` }} transition={{ delay: i * 0.1, type: "spring" }} className="w-full bg-blue-500/50 group-hover:bg-blue-400 transition-colors" />
                    </div>
                    <span className="text-[9px] text-gray-600 font-mono truncate max-w-full">{category}</span>
                  </div>
                ))}
              </div>
            )}
          </SpotlightCard>

          <SpotlightCard className="lg:col-span-1 p-5 md:p-6 flex flex-col">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest mb-4">Últimas Transações</span>
            <div className="flex-1 space-y-4">
              {transactions.length === 0 && <p className="text-xs text-gray-600">Nenhuma transação ainda.</p>}
              {transactions.map((t) => (
                <div key={t.id} className="flex justify-between items-center group">
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center ${t.type === "income" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"}`}>
                      {t.type === "income" ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors truncate">{t.description}</p>
                      <p className="text-[9px] text-gray-600 truncate">{t.category}</p>
                    </div>
                  </div>
                  <span className={`text-[10px] md:text-xs font-mono shrink-0 ${t.type === "income" ? "text-green-400" : "text-white"}`}>
                    {t.type === "income" ? "+" : "-"} {formatBRL(t.amount)}
                  </span>
                </div>
              ))}
            </div>
          </SpotlightCard>
        </div>

        {stats && stats.budgets.length > 0 && (
          <SpotlightCard className="p-5 md:p-6">
            <span className="text-[10px] font-black uppercase text-gray-500 tracking-widest">Orçamentos</span>
            <div className="mt-4 space-y-3">
              {stats.budgets.map((b) => (
                <div key={b.category}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300">{b.category}</span>
                    <span className={b.over_budget ? "text-red-400" : "text-gray-500"}>{formatBRL(b.spent_this_month)} / {formatBRL(b.monthly_limit)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                    <div className={`h-full ${b.over_budget ? "bg-red-500" : "bg-blue-500"}`} style={{ width: `${Math.min(100, b.percent_used)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </SpotlightCard>
        )}
      </div>
    </motion.div>
  );
}
