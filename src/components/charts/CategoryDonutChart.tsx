import { useState } from "react";
import { motion } from "framer-motion";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

export interface CategoryDatum {
  name: string;
  value: number;
  color: string;
}

export interface CategoryTransaction {
  id: number;
  description: string;
  amount: string;
  date: string;
}

const formatBRL = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = 95;
const EXPLODE = 18;

interface Slice extends CategoryDatum {
  startAngle: number;
  endAngle: number;
  midAngle: number;
}

function buildSlices(data: CategoryDatum[]): Slice[] {
  const total = data.reduce((acc, d) => acc + d.value, 0) || 1;
  let angle = 0;
  return data.map((d) => {
    const sweep = (d.value / total) * Math.PI * 2;
    const startAngle = angle;
    const endAngle = angle + sweep;
    angle = endAngle;
    return { ...d, startAngle, endAngle, midAngle: (startAngle + endAngle) / 2 };
  });
}

function arcPoint(angle: number, radius: number): [number, number] {
  return [CENTER + radius * Math.sin(angle), CENTER - radius * Math.cos(angle)];
}

function arcPath(slice: Slice): string {
  const [x1, y1] = arcPoint(slice.startAngle, RADIUS);
  const [x2, y2] = arcPoint(slice.endAngle, RADIUS);
  const large = slice.endAngle - slice.startAngle > Math.PI ? 1 : 0;
  return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${large} 1 ${x2} ${y2} Z`;
}

function darken(hex: string, amount: number) {
  const n = parseInt(hex.replace("#", ""), 16);
  const r = Math.max(0, Math.round(((n >> 16) & 0xff) * (1 - amount)));
  const g = Math.max(0, Math.round(((n >> 8) & 0xff) * (1 - amount)));
  const b = Math.max(0, Math.round((n & 0xff) * (1 - amount)));
  return `rgb(${r}, ${g}, ${b})`;
}

export function CategoryDonutChart({
  data,
  transactionsByCategory,
  height = 280,
}: {
  data: CategoryDatum[];
  transactionsByCategory: (category: string) => CategoryTransaction[];
  height?: number;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const [hovered, setHovered] = useState<string | null>(null);

  const total = data.reduce((acc, d) => acc + d.value, 0);
  const slices = buildSlices(data);
  const selectedDatum = data.find((d) => d.name === selected) ?? null;
  const selectedTransactions = selected ? transactionsByCategory(selected) : [];

  const openCategory = (category: string, clientX?: number, clientY?: number) => {
    setOrigin(clientX != null && clientY != null ? { x: clientX, y: clientY } : null);
    setSelected(category);
  };

  // Faz o modal "crescer" a partir do ponto exato onde a fatia foi clicada — a caixa
  // fica sempre centralizada na tela, então dá pra converter o clique num
  // transform-origin relativo à própria caixa.
  const dialogStyle: React.CSSProperties | undefined = origin
    ? ({
        transformOrigin: `calc(50% + ${origin.x - window.innerWidth / 2}px) calc(50% + ${origin.y - window.innerHeight / 2}px)`,
        "--tw-enter-scale": 0.04,
      } as React.CSSProperties)
    : undefined;

  return (
    <>
      <p className="text-center text-xs text-muted-foreground">
        Total: <span className="font-medium text-foreground">{formatBRL(total)}</span>
      </p>
      <div className="flex items-center justify-center" style={{ height, perspective: 1100 }}>
        <div style={{ transform: "rotateX(34deg)" }}>
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} style={{ overflow: "visible" }}>
            {/* base escura, sempre no lugar original — é o que fica visível "atrás" quando
                uma fatia é puxada pra frente, dando a sensação de disco com profundidade */}
            <g transform="translate(0, 10)">
              {slices.map((slice) => (
                <path key={`base-${slice.name}`} d={arcPath(slice)} fill={darken(slice.color, 0.42)} stroke="var(--card)" strokeWidth={1.5} />
              ))}
            </g>

            {slices
              .filter((s) => s.name !== selected)
              .map((slice) => (
                <path
                  key={slice.name}
                  d={arcPath(slice)}
                  fill={slice.color}
                  stroke="var(--card)"
                  strokeWidth={2}
                  className="cursor-pointer transition-opacity"
                  opacity={hovered && hovered !== slice.name ? 0.75 : 1}
                  onMouseEnter={() => setHovered(slice.name)}
                  onMouseLeave={() => setHovered(null)}
                  onClick={(e) => openCategory(slice.name, e.clientX, e.clientY)}
                />
              ))}

            {/* a fatia selecionada é desenhada por último — some do lugar original (só a
                base escura fica ali) e reaparece deslocada pra frente/fora, com sombra */}
            {slices
              .filter((s) => s.name === selected)
              .map((slice) => (
                <motion.path
                  key={`exploded-${slice.name}`}
                  d={arcPath(slice)}
                  fill={slice.color}
                  stroke="var(--card)"
                  strokeWidth={2}
                  className="cursor-pointer"
                  initial={{ x: 0, y: 0 }}
                  animate={{ x: Math.sin(slice.midAngle) * EXPLODE, y: -Math.cos(slice.midAngle) * EXPLODE - 8 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  style={{ filter: "drop-shadow(0 8px 8px rgb(0 0 0 / 0.35))" }}
                  onClick={(e) => openCategory(slice.name, e.clientX, e.clientY)}
                />
              ))}
          </svg>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1.5">
        {data.map((entry) => (
          <button
            key={entry.name}
            onClick={(e) => openCategory(entry.name, e.clientX, e.clientY)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <span className="size-2 rounded-full" style={{ background: entry.color }} />
            {entry.name}
          </button>
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="sm:max-w-md duration-300" style={dialogStyle}>
          {selectedDatum && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full" style={{ background: selectedDatum.color }} />
                  {selectedDatum.name}
                </DialogTitle>
                <DialogDescription>
                  {formatBRL(selectedDatum.value)} · {total > 0 ? ((selectedDatum.value / total) * 100).toFixed(1) : "0"}% do total do período
                </DialogDescription>
              </DialogHeader>
              <div className="max-h-[260px] w-full overflow-y-auto overflow-x-hidden pr-2">
                <div className="w-full space-y-2.5">
                  {selectedTransactions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma transação encontrada.</p>
                  ) : (
                    selectedTransactions.map((t) => (
                      <div key={t.id} className="flex w-full items-start justify-between gap-3 border-b pb-2 last:border-0">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm break-words">{t.description}</p>
                          <p className="text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString("pt-BR")}</p>
                        </div>
                        <span className="shrink-0 text-sm font-medium tabular-nums">{formatBRL(Number(t.amount))}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <Badge variant="outline" className="w-fit text-[10px] font-normal text-muted-foreground">
                {selectedTransactions.length} transaç{selectedTransactions.length === 1 ? "ão" : "ões"}
              </Badge>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
