export interface FinanceHistoryPoint {
  month: string; // "YYYY-MM"
  income: number;
  expenses: number;
  balance: number;
}

const LANES = [
  { key: "balance" as const, label: "Saldo", color: "#3987e5" },
  { key: "income" as const, label: "Entradas", color: "#0ca30c" },
  { key: "expenses" as const, label: "Saídas", color: "#d03b3b" },
];

function formatMonthLabel(monthStr: string) {
  const [y, m] = monthStr.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
}

export function buildLine3DOption(history: FinanceHistoryPoint[]) {
  const months = history.map((h) => formatMonthLabel(h.month));

  const series = LANES.map((lane, laneIndex) => ({
    name: lane.label,
    type: "line3D" as const,
    lineStyle: { width: 5, color: lane.color },
    itemStyle: { color: lane.color },
    data: history.map((h, monthIndex) => [monthIndex, laneIndex, h[lane.key]]),
  }));

  return {
    tooltip: {
      formatter: (params: { value: [number, number, number] }) => {
        const [monthIndex, laneIndex, value] = params.value;
        const lane = LANES[laneIndex];
        return `${months[monthIndex]} · ${lane.label}: ${Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`;
      },
    },
    xAxis3D: { type: "category", data: months, axisLabel: { fontSize: 10, color: "#94a3b8" } },
    yAxis3D: { type: "category", data: LANES.map((l) => l.label), axisLabel: { fontSize: 10, color: "#94a3b8" } },
    zAxis3D: { type: "value", axisLabel: { fontSize: 10, color: "#94a3b8" } },
    grid3D: {
      boxWidth: 100,
      boxDepth: 55,
      boxHeight: 55,
      viewControl: {
        alpha: 18,
        beta: 30,
        distance: 230,
        rotateSensitivity: 1.2,
        zoomSensitivity: 1,
        autoRotate: false,
      },
    },
    series,
  };
}
