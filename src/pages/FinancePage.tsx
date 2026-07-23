import { useEffect, useRef, useState } from "react";
import { BarChart3, PieChart as PieIcon, PlusCircle, Receipt, Trash2, TrendingDown, TrendingUp, Upload, Wallet } from "lucide-react";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/PageHeader";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { CategoryDonutChart } from "@/components/charts/CategoryDonutChart";
import { Line3DChart } from "@/components/charts/Line3DChart";
import type { FinanceHistoryPoint } from "@/lib/line3d";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  history: { month: string; income: string; expenses: string; balance: string }[];
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
  const [monthFilter, setMonthFilter] = useState<string | null>(null);

  const refresh = () => {
    api.get<Stats>("/api/finance/stats").then(setStats);
    api.get<Transaction[]>("/api/finance/transactions").then(setTransactions);
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

  const availableMonths = Array.from(new Set(transactions.map((t) => t.date.slice(0, 7)))).sort((a, b) => b.localeCompare(a));
  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  };
  // Sem seleção explícita do usuário ainda: abre no mês mais recente que tem
  // transação, não no mês civil atual — senão a pizza fica vazia pra quem não
  // lançou nada esse mês (o civil), mesmo tendo histórico dos meses anteriores.
  const effectiveMonthFilter = monthFilter ?? availableMonths[0] ?? "all";

  const categoryTotals: Record<string, number> = {};
  transactions
    .filter((t) => t.type === "expense" && (effectiveMonthFilter === "all" || t.date.slice(0, 7) === effectiveMonthFilter))
    .forEach((t) => {
      categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + Number(t.amount);
    });
  const donutData = Object.entries(categoryTotals)
    .filter(([, value]) => value > 0)
    .map(([category, value]) => ({ name: category, value, color: categoryColor(category) }));

  const historyData: FinanceHistoryPoint[] = stats
    ? stats.history.map((h) => ({
        month: h.month,
        income: Number(h.income),
        expenses: Number(h.expenses),
        balance: Number(h.balance),
      }))
    : [];

  const visibleTransactions = transactions
    .filter((t) => effectiveMonthFilter === "all" || t.date.slice(0, 7) === effectiveMonthFilter)
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date) || a.id - b.id);

  return (
    <div className="h-full w-full overflow-y-auto overflow-x-hidden pb-28">
      <PageHeader
        title="Finanças"
        description="Saldo, categorias e orçamentos em um só lugar."
        help={
          <>
            <p>Controle financeiro pessoal: lance receitas e despesas manualmente ou importe um extrato (CSV/OFX) do seu banco.</p>
            <ul>
              <li>A categoria de cada lançamento é sugerida automaticamente pela IA, mas pode ser ajustada.</li>
              <li>Defina um <strong className="text-foreground">orçamento mensal</strong> por categoria — você é avisado assim que ultrapassa o limite.</li>
            </ul>
          </>
        }
      />
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
                  {Math.abs(stats.month_over_month.total_change_percent).toFixed(1)}% de gastos vs mês anterior
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
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                Gastos por Categoria — {effectiveMonthFilter === "all" ? "todos os meses" : monthLabel(effectiveMonthFilter)}, clique numa fatia
              </CardTitle>
              <Select value={effectiveMonthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger size="sm" className="w-36 capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {availableMonths.map((ym) => (
                    <SelectItem key={ym} value={ym} className="capitalize">{monthLabel(ym)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {!stats ? (
                <Skeleton className="mx-auto h-[260px] w-full" />
              ) : donutData.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
                  <PieIcon size={22} className="opacity-40" />
                  <p className="text-xs">Sem despesas registradas ainda.</p>
                </div>
              ) : (
                <CategoryDonutChart
                  data={donutData}
                  transactionsByCategory={(category) =>
                    transactions.filter(
                      (t) =>
                        t.type === "expense" &&
                        t.category === category &&
                        (effectiveMonthFilter === "all" || t.date.slice(0, 7) === effectiveMonthFilter)
                    )
                  }
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-xs font-medium text-muted-foreground">Tendência (últimos 6 meses) — arraste pra girar</CardTitle></CardHeader>
            <CardContent>
              {!stats ? (
                <Skeleton className="h-[260px] w-full" />
              ) : historyData.every((h) => h.income === 0 && h.expenses === 0) ? (
                <div className="flex flex-col items-center gap-2 py-14 text-center text-muted-foreground">
                  <BarChart3 size={22} className="opacity-40" />
                  <p className="text-xs">Sem dados suficientes ainda.</p>
                </div>
              ) : (
                <Line3DChart history={historyData} />
              )}
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 md:gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-xs font-medium text-muted-foreground">Últimas Transações</CardTitle>
              <Select value={effectiveMonthFilter} onValueChange={setMonthFilter}>
                <SelectTrigger size="sm" className="w-40 capitalize"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os meses</SelectItem>
                  {availableMonths.map((ym) => (
                    <SelectItem key={ym} value={ym} className="capitalize">{monthLabel(ym)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {visibleTransactions.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-6 text-center text-muted-foreground">
                  <Receipt size={22} className="opacity-40" />
                  <p className="text-xs">Nenhuma transação nesse período.</p>
                </div>
              ) : (
                <ScrollArea className="h-[340px] pr-3">
                  <div className="space-y-3">
                    {visibleTransactions.map((t) => (
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
                            <p className="text-xs text-muted-foreground">{t.category} · {new Date(t.date).toLocaleDateString("pt-BR")}</p>
                          </div>
                        </div>
                        <span className={cn("shrink-0 text-sm font-medium tabular-nums", t.type === "income" ? "text-emerald-500" : "text-foreground")}>
                          {t.type === "income" ? "+" : "-"} {formatBRL(t.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
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
