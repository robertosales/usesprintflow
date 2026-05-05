import { useState, useMemo } from "react";
import { ChevronDown, ChevronRight, Plus, Search, X, Clock, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import type { Demanda } from "../types/demanda";
export type { Demanda };

// ── Constantes de workflow ──────────────────────────────────────────────────────
export const WORKFLOWLABELS: Record<string, string> = {
  filaatendimento: "Fila de Atendimento",
  planejamentoelaboracao: "Planejamento Em Elaboração",
  planejamentoagaprovacao: "Planejamento Ag. Aprovação",
  planejamentoaprovada: "Planejamento Aprovada p/ Exec",
  emexecucao: "Em Execução",
  bloqueada: "Bloqueada",
  homaghomologacao: "Hom Ag. Homologação",
  homhomologada: "Hom Homologada",
  rejeitada: "Rejeitada",
  filaproducao: "Fila para Produção / Infra",
  agaceitefinal: "Ag. Aceite Final",
};

export const FLOWPRINCIPAL = [
  "filaatendimento",
  "planejamentoelaboracao",
  "planejamentoagaprovacao",
  "planejamentoaprovada",
  "emexecucao",
  "homaghomologacao",
  "homhomologada",
  "filaproducao",
  "agaceitefinal",
] as const;

// ── Cores por coluna ──────────────────────────────────────────────────────────
const COLUMN_COLORS: Record<string, { hex: string }> = {
  filaatendimento: { hex: "#64748b" },
  planejamentoelaboracao: { hex: "#3b82f6" },
  planejamentoagaprovacao: { hex: "#6366f1" },
  planejamentoaprovada: { hex: "#8b5cf6" },
  emexecucao: { hex: "#f59e0b" },
  bloqueada: { hex: "#ef4444" },
  homaghomologacao: { hex: "#06b6d4" },
  homhomologada: { hex: "#14b8a6" },
  rejeitada: { hex: "#f43f5e" },
  filaproducao: { hex: "#f97316" },
  agaceitefinal: { hex: "#10b981" },
};

// ── helpers ───────────────────────────────────────────────────────────────────
function hexAlpha(hex: string, a: number) {
  const c = hex.replace("#", "");
  return `rgba(${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)},${a})`;
}

function slaDaysRemaining(demanda: Demanda): number | null {
  const prazo = (demanda as unknown as { prazosolucao?: string | null }).prazosolucao;
  if (!prazo) return null;
  const now = new Date();
  const dead = new Date(prazo);
  return Math.round((dead.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// ── Colunas visíveis ────────────────────────────────────────────────────────────
const ALL_COLS = [...FLOWPRINCIPAL, "bloqueada", "rejeitada"] as string[];
const VISIBLE_COLS = ALL_COLS.filter((v, i, a) => a.indexOf(v) === i);

// ── Demanda Card ────────────────────────────────────────────────────────────
function DemandaCard({ demanda, accentHex, onClick }: { demanda: Demanda; accentHex: string; onClick?: () => void }) {
  const slaD = slaDaysRemaining(demanda);
  const urgent = slaD !== null && slaD <= 3 && slaD >= 0;
  const late = slaD !== null && slaD < 0;

  return (
    <div
      onClick={onClick}
      // FIX: trocado bg-white/text-gray-* por variáveis de tema (bg-card, text-foreground, etc.)
      className="bg-card rounded-lg border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.08)]
        hover:shadow-[0_3px_10px_rgba(0,0,0,0.15)] hover:border-border transition-all duration-150
        overflow-hidden cursor-pointer select-none"
    >
      <div className="h-0.5" style={{ backgroundColor: accentHex }} />
      <div className="p-3">
        <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2 mb-2">
          {demanda.descricao ?? demanda.tipo ?? "Demanda"}
        </p>

        {(demanda.rhm || demanda.projeto) && (
          <div className="flex flex-wrap gap-1 mb-2">
            {demanda.rhm && (
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ backgroundColor: hexAlpha(accentHex, 0.14), color: accentHex }}
              >
                RHM {demanda.rhm}
              </span>
            )}
            {demanda.projeto && (
              // FIX: bg-gray-100/text-gray-600 → bg-muted/text-muted-foreground
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium truncate max-w-[140px]">
                {demanda.projeto}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* FIX: text-gray-400 → text-muted-foreground */}
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <span className="font-mono font-medium">#{String(demanda.id ?? "").slice(0, 8)}</span>
          </div>

          <div className="flex items-center gap-1">
            {late && (
              // FIX: bg-red-50/text-red-600/border-red-200 → usa destructive com alpha p/ dark
              <span className="flex items-center gap-0.5 text-[10px] rounded px-1.5 py-0.5
                bg-destructive/10 text-destructive border border-destructive/25">
                <AlertTriangle className="h-2.5 w-2.5" /> SLA
              </span>
            )}
            {urgent && !late && (
              // FIX: bg-amber-50/text-amber-600/border-amber-200 → warning com alpha
              <span className="flex items-center gap-0.5 text-[10px] rounded px-1.5 py-0.5
                bg-warning/10 text-warning border border-warning/25">
                <Clock className="h-2.5 w-2.5" /> {slaD}d
              </span>
            )}
          </div>
        </div>

        {slaD !== null && !urgent && !late && (
          // FIX: text-gray-400 → text-muted-foreground
          <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />
            <span>{slaD}d restantes</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Collapsed strip ────────────────────────────────────────────────────────────
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
      // FIX: bg-white → bg-card
      className="flex-shrink-0 w-10 flex flex-col items-center rounded-xl border border-border/60
        bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08)] cursor-pointer hover:shadow-md transition-all py-3 gap-3"
      style={{ borderTop: `3px solid ${accentHex}` }}
    >
      {/* FIX: text-gray-400 → text-muted-foreground */}
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span
        className="text-[11px] font-bold flex-1 text-center leading-tight"
        style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", color: accentHex, letterSpacing: "0.04em" }}
      >
        {label}
      </span>
      <span
        className="text-[10px] font-bold rounded-full min-w-[18px] text-center py-0.5 px-1"
        style={{ backgroundColor: hexAlpha(accentHex, 0.14), color: accentHex }}
      >
        {count}
      </span>
    </div>
  );
}

// ── Expanded column ────────────────────────────────────────────────────────────
function ExpandedCol({
  label,
  demandas,
  accentHex,
  onCollapse,
  onCardClick,
  onAdd,
}: {
  label: string;
  demandas: Demanda[];
  accentHex: string;
  onCollapse: () => void;
  onCardClick?: (d: Demanda) => void;
  onAdd?: () => void;
}) {
  return (
    <div
      // FIX: bg-white → bg-card
      className="flex-shrink-0 w-[280px] flex flex-col rounded-xl border border-border/60
        bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all"
      style={{ borderTop: `3px solid ${accentHex}` }}
    >
      {/* FIX: border-gray-100 → border-border */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        {/* FIX: hover:bg-gray-100 → hover:bg-muted */}
        <button onClick={onCollapse} className="p-0.5 rounded hover:bg-muted transition-colors">
          {/* FIX: text-gray-400 → text-muted-foreground */}
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <span className="flex-1 text-[12px] font-bold tracking-wide uppercase truncate" style={{ color: accentHex }}>
          {label}
        </span>
        <span
          className="text-[11px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center"
          style={{ backgroundColor: hexAlpha(accentHex, 0.14), color: accentHex }}
        >
          {demandas.length}
        </span>
        {onAdd && (
          // FIX: hover:bg-gray-100/text-gray-400/hover:text-gray-600 → muted
          <button
            onClick={onAdd}
            className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="p-2 overflow-y-auto flex-1 space-y-2" style={{ maxHeight: "calc(100vh - 260px)" }}>
        {demandas.length === 0 ? (
          // FIX: border-gray-200/text-gray-400 → border-border/text-muted-foreground
          <div className="flex items-center justify-center h-14 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">
            Sem demandas
          </div>
        ) : (
          demandas.map((d) => (
            <DemandaCard key={d.id as string} demanda={d} accentHex={accentHex} onClick={() => onCardClick?.(d)} />
          ))
        )}
      </div>
    </div>
  );
}

// ── Board ──────────────────────────────────────────────────────────────────────
export interface SustentacaoBoardProps {
  demandas?: Demanda[];
  onSelectDemanda?: (demanda: Demanda) => void;
  onCreateDemanda?: (situacao?: string) => void;
}

export function SustentacaoBoard({ demandas: demandasProp, onSelectDemanda, onCreateDemanda }: SustentacaoBoardProps) {
  const demandas = demandasProp ?? [];
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggle = (key: string) =>
    setCollapsed((prev) => {
      const n = new Set(prev);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const filtered = useMemo(() => {
    const safe = demandas ?? [];
    if (!search) return safe;
    const q = search.toLowerCase();
    return safe.filter(
      (d) =>
        String(d.descricao ?? "")
          .toLowerCase()
          .includes(q) ||
        String(d.projeto ?? "")
          .toLowerCase()
          .includes(q) ||
        String(d.rhm ?? "")
          .toLowerCase()
          .includes(q),
    );
  }, [demandas, search]);

  const byStatus = useMemo(() => {
    const map: Record<string, Demanda[]> = {};
    (VISIBLE_COLS ?? []).forEach((k) => {
      map[k] = [];
    });
    (demandas ?? []).filter(Boolean).forEach((d) => {
      const key = (d.situacao as string) ?? "filaatendimento";
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return map;
  }, [demandas]);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* top bar */}
      <div className="flex items-center gap-3 px-1">
        <div className="relative flex-1 max-w-sm">
          {/* FIX: text-gray-400 → text-muted-foreground */}
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          {/* FIX: border-gray-200/bg-white/placeholder:text-gray-400 → variáveis de tema */}
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar demanda..."
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-border bg-background text-foreground text-sm
              placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
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
          const color = COLUMN_COLORS[key] ?? { hex: "#94a3b8" };
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
              label={label}
              demandas={items}
              accentHex={color.hex}
              onCollapse={() => toggle(key)}
              onCardClick={onSelectDemanda}
              onAdd={onCreateDemanda ? () => onCreateDemanda(key) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
}
