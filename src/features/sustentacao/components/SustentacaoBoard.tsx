import { useState, useMemo } from "react";
import type { Demanda } from "@/types/demanda";
import { WORKFLOWLABELS, FLOWPRINCIPAL } from "@/components/DemandaDetail";
import { ChevronDown, ChevronRight, Plus, Settings2, Search, X, Clock, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// ── helpers ───────────────────────────────────────────────────────────────────

const COLUMN_COLORS: Record<string, { hex: string; bgLight: string }> = {
  filaatendimento: { hex: "#64748b", bgLight: "#f8fafc" },
  planejamentoelaboracao: { hex: "#3b82f6", bgLight: "#eff6ff" },
  planejamentoagaprovacao: { hex: "#6366f1", bgLight: "#eef2ff" },
  planejamentoaprovada: { hex: "#8b5cf6", bgLight: "#f5f3ff" },
  emexecucao: { hex: "#f59e0b", bgLight: "#fffbeb" },
  bloqueada: { hex: "#ef4444", bgLight: "#fef2f2" },
  homaghomologacao: { hex: "#06b6d4", bgLight: "#ecfeff" },
  homhomologada: { hex: "#14b8a6", bgLight: "#f0fdfa" },
  rejeitada: { hex: "#f43f5e", bgLight: "#fff1f2" },
  filaproducao: { hex: "#f97316", bgLight: "#fff7ed" },
  agaceitefinal: { hex: "#10b981", bgLight: "#ecfdf5" },
};

function hexAlpha(hex: string, a: number) {
  const c = hex.replace("#", "");
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
}

function slaDaysRemaining(demanda: Demanda): number | null {
  if (!demanda.prazosolucao) return null;
  const now = new Date();
  const dead = new Date(demanda.prazosolucao);
  return Math.round((dead.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Demanda Card ──────────────────────────────────────────────────────────────

function DemandaCard({ demanda, accentHex, onClick }: { demanda: Demanda; accentHex: string; onClick?: () => void }) {
  const slaD = slaDaysRemaining(demanda);
  const slaUrgent = slaD !== null && slaD <= 3 && slaD >= 0;
  const slaLate = slaD !== null && slaD < 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.06)]
        hover:shadow-[0_3px_10px_rgba(0,0,0,0.10)] transition-all duration-150 overflow-hidden cursor-pointer select-none"
    >
      <div className="h-0.5" style={{ backgroundColor: accentHex }} />

      <div className="p-3">
        <p className="text-[13px] font-semibold leading-snug text-gray-800 line-clamp-2 mb-2">
          {demanda.descricao ?? demanda.tipo ?? "Demanda"}
        </p>

        {(demanda.rhm || demanda.projeto) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {demanda.rhm && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: hexAlpha(accentHex, 0.12), color: accentHex }}
              >
                RHM {demanda.rhm}
              </span>
            )}
            {demanda.projeto && (
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium truncate max-w-[140px]">
                {demanda.projeto}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="font-mono font-medium">#{demanda.id?.slice(0, 8)}</span>
          </div>

          <div className="flex items-center gap-1">
            {slaLate && (
              <span className="flex items-center gap-0.5 text-[10px] bg-red-50 text-red-600 border border-red-200 rounded px-1.5 py-0.5">
                <AlertTriangle className="h-2.5 w-2.5" />
                SLA
              </span>
            )}
            {slaUrgent && !slaLate && (
              <span className="flex items-center gap-0.5 text-[10px] bg-amber-50 text-amber-600 border border-amber-200 rounded px-1.5 py-0.5">
                <Clock className="h-2.5 w-2.5" />
                {slaD}d
              </span>
            )}
          </div>
        </div>

        {slaD !== null && !slaUrgent && !slaLate && (
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-gray-400">
            <Clock className="h-2.5 w-2.5" />
            <span>{slaD}d restantes</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Collapsed strip ───────────────────────────────────────────────────────────

function CollapsedCol({
  label,
  count,
  accentHex,
  onClick,
}: {
  label: string;
  count: number;
  accentHex: string;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-10 flex flex-col items-center rounded-xl border border-border/60
        bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] cursor-pointer hover:shadow-md transition-all py-3 gap-3"
      style={{ borderTop: `3px solid ${accentHex}` }}
    >
      <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0" />
      <span
        className="text-[11px] font-bold flex-1 text-center leading-tight"
        style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", color: accentHex, letterSpacing: "0.04em" }}
      >
        {label}
      </span>
      <span
        className="text-[10px] font-bold rounded-full min-w-[18px] text-center py-0.5 px-1"
        style={{ backgroundColor: hexAlpha(accentHex, 0.12), color: accentHex }}
      >
        {count}
      </span>
    </div>
  );
}

// ── Expanded column ───────────────────────────────────────────────────────────

function ExpandedCol({
  colKey,
  label,
  demandas,
  accentHex,
  onCollapse,
  onCardClick,
}: {
  colKey: string;
  label: string;
  demandas: Demanda[];
  accentHex: string;
  onCollapse: () => void;
  onCardClick?: (d: Demanda) => void;
}) {
  return (
    <div
      className="flex-shrink-0 w-[280px] flex flex-col rounded-xl border border-border/60
        bg-white shadow-[0_1px_3px_rgba(0,0,0,0.06)] transition-all"
      style={{ borderTop: `3px solid ${accentHex}` }}
    >
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
        <button onClick={onCollapse} className="p-0.5 rounded hover:bg-gray-100 transition-colors">
          <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
        </button>
        <span className="flex-1 text-[12px] font-bold tracking-wide uppercase truncate" style={{ color: accentHex }}>
          {label}
        </span>
        <span
          className="text-[11px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center"
          style={{ backgroundColor: hexAlpha(accentHex, 0.12), color: accentHex }}
        >
          {demandas.length}
        </span>
        <button className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
          <Plus className="h-3.5 w-3.5" />
        </button>
        <button className="p-1 rounded hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="p-2 overflow-y-auto flex-1 space-y-2" style={{ maxHeight: "calc(100vh - 260px)" }}>
        {demandas.length === 0 ? (
          <div className="flex items-center justify-center h-14 rounded-lg border-2 border-dashed border-gray-200 text-xs text-gray-400">
            Sem demandas
          </div>
        ) : (
          demandas.map((d) => (
            <DemandaCard key={d.id} demanda={d} accentHex={accentHex} onClick={() => onCardClick?.(d)} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Colunas visíveis ──────────────────────────────────────────────────────────

const ALL_COLUMNS = [...FLOWPRINCIPAL, "bloqueada", "rejeitada"] as string[];
const VISIBLE_COLS = ALL_COLUMNS.filter((v, i, a) => a.indexOf(v) === i);

// ── Board ─────────────────────────────────────────────────────────────────────

interface SustentacaoBoardProps {
  /**
   * Lista de demandas a exibir.
   * Passe via hook do seu contexto, ex:
   *   const { demandas } = useSustentacao();
   *   <SustentacaoBoard demandas={demandas} onSelectDemanda={...} />
   */
  demandas: Demanda[];
  onSelectDemanda?: (demanda: Demanda) => void;
}

export function SustentacaoBoard({ demandas, onSelectDemanda }: SustentacaoBoardProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const filtered = useMemo(() => {
    if (!search) return demandas;
    const q = search.toLowerCase();
    return demandas.filter(
      (d) =>
        (d.descricao ?? "").toLowerCase().includes(q) ||
        (d.projeto ?? "").toLowerCase().includes(q) ||
        (d.rhm ?? "").toLowerCase().includes(q),
    );
  }, [demandas, search]);

  const byStatus = useMemo(() => {
    const map: Record<string, Demanda[]> = {};
    VISIBLE_COLS.forEach((k) => {
      map[k] = [];
    });
    filtered.forEach((d) => {
      const key = d.situacao ?? "filaatendimento";
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return map;
  }, [filtered]);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* top bar */}
      <div className="flex items-center gap-3 px-1">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search"
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-gray-200 bg-white text-sm
              placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <Badge variant="outline" className="text-xs font-mono h-9 px-3">
          {filtered.length} demanda{filtered.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* board */}
      <div className="flex gap-2 pb-4 overflow-x-auto flex-1" style={{ minHeight: 120 }}>
        {VISIBLE_COLS.map((key) => {
          const label = WORKFLOWLABELS[key] ?? key;
          const color = COLUMN_COLORS[key] ?? { hex: "#94a3b8", bgLight: "#f8fafc" };
          const items = byStatus[key] ?? [];
          const isCol = collapsed.has(key);

          if (isCol) {
            return (
              <CollapsedCol
                key={key}
                label={label}
                count={items.length}
                accentHex={color.hex}
                onClick={() => toggle(key)}
              />
            );
          }
          return (
            <ExpandedCol
              key={key}
              colKey={key}
              label={label}
              demandas={items}
              accentHex={color.hex}
              onCollapse={() => toggle(key)}
              onCardClick={onSelectDemanda}
            />
          );
        })}
      </div>
    </div>
  );
}
