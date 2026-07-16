import { useEffect, useRef, useState } from "react";
import { BarChart3, PieChart as PieIcon, PlusCircle, Receipt, Trash2, TrendingDown, TrendingUp, Upload, Wallet } from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

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
  month_over_month: {
    total_change_percent: number | null;
    current_month_by_category: Record<string, string>;
    previous_month_by_category: Record<string, string>;
  };
  budgets: { id: number; category: string; monthly_limit: string; spent_this_month: string; percent_used: number; over_budget: boolean }[];
}

// Paleta categórica validada (references/palette.md do skill dataviz), ordem fixa —
// cada categoria sempre com a mesma cor em todos os gráficos da tela.
const CATEGORY_COLORS: Record<string, string> = {
  "Alimentação": "#3987e5",
  "Transporte": "#008300",
  "Moradia": "#d55181",
  "Lazer": "#c98500",
  "Saúde": "#199e70",
  "Educação": "#d95926",
  "Renda": "#9085e9",
  "Outros": "#e66767",
};
const FALLBACK_COLOR = "#e66767";
const categoryColor = (category: string) => CATEGORY_COLORS[category] ?? FALLBACK_COLOR;
const BUDGET_CATEGORIES = Object.keys(CATEGORY_COLORS).filter((c) => c !== "Renda");

// Paleta de status (fixa, nunca reusada como cor de categoria) — valores hardcoded
// direto nas classes Tailwind abaixo (good #0ca30c / warning #fab219 / critical #d03b3b)
// porque o JIT do Tailwind precisa da string literal completa pra gerar a classe.

const formatBRL = (value: string | number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      {label && <p className="mb-1 font-medium text-popover-foreground">{label}</p>}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-1.5 text-muted-foreground">
          <span className="size-2 rounded-full" style={{ background: entry.color || entry.payload?.fill }} />
          <span>{entry.name}:</span>
          <span className="font-medium text-popover-foreground">{formatBRL(entry.value)}</span>
        </div>
      ))}
    </div>
  );
}

export default function FinancePage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"income" | "expense">("expense");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [budgetCategory, setBudgetCategory] = useState(BUDGET_CATEGORIES[0]);
  const [budgetLimit, setBudgetLimit] = useState("");
  const [savingBudget, setSavingBudget] = useState(false);

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
      if (!(err instanceof ApiError && err.status === 401)) toast.error("Não foi possível salvar a transação.");
    }
  };

  const saveBudget = async () => {
    if (!budgetLimit) return;
    setSavingBudget(true);
    try {
      await api.put("/api/finance/budgets", { category: budgetCategory, monthly_limit: budgetLimit });
      setBudgetLimit("");
      refresh();
      toast.success(`Orçamento de ${budgetCategory} definido.`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível salvar o orçamento.");
    } finally {
      setSavingBudget(false);
    }
  };

  const removeBudget = async (id: number) => {
    try {
      await api.delete(`/api/finance/budgets/${id}`);
      refresh();
    } catch {
      toast.error("Não foi possível remover o orçamento.");
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

  const donutData = stats
    ? Object.entries(stats.by_category).map(([category, value]) => ({ name: category, value: Number(value) }))
    : [];

  const comparisonData = stats
    ? Array.from(
        new Set([
          ...Object.keys(stats.month_over_month.current_month_by_category),
          ...Object.keys(stats.month_over_month.previous_month_by_category),
        ])
      ).map((category) => ({
        category,
        "Este mês": Number(stats.month_over_month.current_month_by_category[category] ?? 0),
        "Mês anterior": Number(stats.month_over_month.previous_month_by_category[category] ?? 0),
      }))
    : [];

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader title="Finanças" description="Saldo, categorias e orçamentos em um só lugar." />
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 md:space-y-6 md:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:gap-6">
          <Card className="sm:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Wallet size={13} /> Saldo Total</CardTitle>
            </CardHeader>
            <CardContent>
              {stats ? (
                <div className="text-3xl font-semibold tracking-tight">
                  <AnimatedNumber value={Number(stats.balance)} formatter={formatBRL} />
                </div>
              ) : (
                <Skeleton className="h-9 w-32" />
              )}
              {stats?.month_over_month.total_change_percent != null && (
                <div className={cn("mt-2 flex items-center gap-1 text-xs", stats.month_over_month.total_change_percent >= 0 ? "text-destructive" : "text-emerald-500")}>
                  {stats.month_over_month.total_change_percent >= 0 ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                  {Math.abs(stats.month_over_month.total_change_percent).toFixed(1)}% vs mês anterior
                </div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Entradas</CardTitle></CardHeader>
            <CardContent>
              {stats ? (
                <div className="text-2xl font-semibold"><AnimatedNumber value={Number(stats.income)} formatter={formatBRL} /></div>
              ) : (
                <Skeleton className="h-8 w-28" />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Saídas</CardTitle></CardHeader>
            <CardContent>
              {stats ? (
                <div className="text-2xl font-semibold"><AnimatedNumber value={Number(stats.expenses)} formatter={formatBRL} /></div>
              ) : (
                <Skeleton className="h-8 w-28" />
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="flex-row flex-wrap items-center gap-3 p-4">
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (ex: Ifood almoço)" className="flex-1 min-w-[160px]" />
          <Input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Valor (ex: 45,90)" className="w-36" />
          <Select value={type} onValueChange={(v) => setType(v as "income" | "expense")}>
            <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="expense">Despesa</SelectItem>
              <SelectItem value="income">Renda</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={addTransaction}>Adicionar</Button>
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
            <Upload size={14} /> Importar CSV/OFX
          </Button>
          <input ref={fileInputRef} type="file" accept=".csv,.ofx,.qfx" className="hidden" onChange={handleImport} />
        </Card>
        {importStatus && <p className="-mt-2 text-xs text-muted-foreground">{importStatus}</p>}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 md:gap-6">
          <Card>
            <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Gastos por Categoria</CardTitle></CardHeader>
            <CardContent>
              {!stats ? (
                <Skeleton className="mx-auto h-[220px] w-[220px] rounded-full" />
              ) : donutData.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
                  <PieIcon size={22} className="opacity-40" />
                  <p className="text-xs">Sem despesas registradas ainda.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={donutData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={2} isAnimationActive animationDuration={500}>
                      {donutData.map((entry) => (
                        <Cell key={entry.name} fill={categoryColor(entry.name)} stroke="var(--card)" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                      iconSize={8}
                      iconType="circle"
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Comparativo Mês a Mês</CardTitle></CardHeader>
            <CardContent>
              {!stats ? (
                <Skeleton className="h-[220px] w-full" />
              ) : comparisonData.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
                  <BarChart3 size={22} className="opacity-40" />
                  <p className="text-xs">Sem dados suficientes ainda.</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={comparisonData} barCategoryGap="25%">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                    <XAxis dataKey="category" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={{ stroke: "var(--border)" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={36} />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
                    <Legend formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} iconSize={8} iconType="circle" />
                    <Bar dataKey="Mês anterior" fill="var(--muted-foreground)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive animationDuration={500} />
                    <Bar dataKey="Este mês" fill="var(--primary)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive animationDuration={500} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
          <Card className="lg:col-span-2">
            <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Últimas Transações</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {transactions.length === 0 && (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
                  <Receipt size={22} className="opacity-40" />
                  <p className="text-xs">Nenhuma transação ainda.</p>
                </div>
              )}
              {transactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className="flex size-8 shrink-0 items-center justify-center rounded-full"
                      style={{ background: `color-mix(in oklch, ${categoryColor(t.category)} 18%, transparent)`, color: categoryColor(t.category) }}
                    >
                      {t.type === "income" ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{t.description}</p>
                      <p className="text-xs text-muted-foreground">{t.category}</p>
                    </div>
                  </div>
                  <span className={cn("shrink-0 text-sm font-medium tabular-nums", t.type === "income" ? "text-emerald-500" : "text-foreground")}>
                    {t.type === "income" ? "+" : "-"} {formatBRL(t.amount)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Orçamentos</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-1.5">
                <Select value={budgetCategory} onValueChange={setBudgetCategory}>
                  <SelectTrigger size="sm" className="flex-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BUDGET_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Input value={budgetLimit} onChange={(e) => setBudgetLimit(e.target.value)} placeholder="Limite (ex: 300)" className="w-28" />
                <Button size="icon-sm" variant="secondary" onClick={saveBudget} disabled={savingBudget || !budgetLimit}>
                  <PlusCircle size={15} />
                </Button>
              </div>

              {!stats || stats.budgets.length === 0 ? (
                <p className="text-xs text-muted-foreground">Nenhum orçamento definido.</p>
              ) : (
                stats.budgets.map((b) => {
                  const statusClass = b.over_budget
                    ? "[&>[data-slot=progress-indicator]]:bg-[#d03b3b]"
                    : b.percent_used >= 75
                      ? "[&>[data-slot=progress-indicator]]:bg-[#fab219]"
                      : "[&>[data-slot=progress-indicator]]:bg-[#0ca30c]";
                  return (
                    <div key={b.id} className="group">
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                        <span className="font-medium">{b.category}</span>
                        <div className="flex items-center gap-2">
                          <span className={cn("tabular-nums", b.over_budget && "text-destructive")}>
                            {formatBRL(b.spent_this_month)} / {formatBRL(b.monthly_limit)}
                          </span>
                          <button
                            onClick={() => removeBudget(b.id)}
                            className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-destructive"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <Progress value={Math.min(100, b.percent_used)} className={cn("h-1.5", statusClass)} />
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
