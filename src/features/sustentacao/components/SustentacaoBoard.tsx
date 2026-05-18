import { useState, useMemo } from "react";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Search,
  X,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  User,
  ActivitySquare,
  ChevronUp,
  ChevronLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { KanbanResponsavelFilter } from "@/shared/components/common/KanbanResponsavelFilter";
import type { ResponsavelFilterItem } from "@/shared/components/common/KanbanResponsavelFilter";
import { useWorkflowSteps } from "../hooks/useWorkflowSteps";
import { useProjetos } from "../hooks/useProjetos";

import type { Demanda } from "../types/demanda";
import { SITUACAO_LABELS } from "../types/demanda";
export type { Demanda };

export const WORKFLOWLABELS: Record<string, string> = SITUACAO_LABELS;

const PAPEL_COLORS: Record<string, string> = {
  desenvolvedor: "#3b82f6",
  analista:      "#10b981",
  arquiteto:     "#8b5cf6",
  testador:      "#f59e0b",
  gestor:        "#ec4899",
};

const PAPEL_LABELS: Record<string, string> = {
  desenvolvedor: "Desenvolvedor",
  analista:      "Analista",
  arquiteto:     "Arquiteto",
  testador:      "Testador",
  gestor:        "Gestor",
};

const TIPO_COLORS: Record<string, string> = {
  incidente:       "#ef4444",
  problema:        "#f97316",
  mudanca:         "#8b5cf6",
  requisicao:      "#3b82f6",
  melhoria:        "#10b981",
  corretiva:       "#f59e0b",
  evolutiva:       "#06b6d4",
};

function hexAlpha(hex: string, a: number) {
  const c = hex.replace("#", "");
  return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
}

function slaDaysRemaining(demanda: Demanda): number | null {
  const prazo = (demanda as any).prazosolucao;
  if (!prazo) return null;
  const now = new Date();
  const dead = new Date(prazo);
  return Math.round((dead.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

import { getInitials, formatDisplayName } from "@/lib/nameUtils";

type RespItem = { papel: string; nome: string; created_at: string };

function getResponsaveisList(demanda: Demanda): RespItem[] {
  const lista = (demanda as any).responsaveis_list as RespItem[] | undefined;

  if (lista && lista.length > 0) {
    const seen = new Set<string>();
    return lista.filter((r) => {
      if (!r.nome || seen.has(r.nome)) return false;
      seen.add(r.nome);
      return true;
    });
  }

  const campos: [string, string | null | undefined][] = [
    ["desenvolvedor",  demanda.responsavel_dev],
    ["analista",       demanda.responsavel_requisitos],
    ["arquiteto",      demanda.responsavel_arquiteto],
    ["testador",       demanda.responsavel_teste],
  ];
  return campos
    .filter(([, nome]) => !!nome)
    .map(([papel, nome]) => ({ papel, nome: nome!, created_at: "" }));
}

// ── Avatar individual com tooltip ──────────────────────────────────
function ResponsavelAvatar({
  nome, papel, size = "sm", highlight = false,
}: { nome: string; papel: string; size?: "sm" | "md"; highlight?: boolean }) {
  const color = PAPEL_COLORS[papel] ?? "#64748b";
  const dim = size === "md" ? "h-6 w-6 text-[9px]" : "h-5 w-5 text-[8px]";
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`${dim} rounded-full flex items-center justify-center font-bold shrink-0 border-2 transition-transform hover:scale-110`}
            style={{
              backgroundColor: hexAlpha(color, 0.2),
              color,
              borderColor: highlight ? color : hexAlpha(color, 0.4),
              boxShadow: highlight ? `0 0 0 2px ${hexAlpha(color, 0.25)}` : undefined,
            }}
          >
            {getInitials(nome)}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs py-1.5 px-2.5">
          <div className="font-semibold">{formatDisplayName(nome)}</div>
          <div className="text-muted-foreground mt-0.5">{PAPEL_LABELS[papel] ?? papel}</div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ── Grupo expand/collapse ───────────────────────────────────────────
function ResponsaveisGroup({ responsaveis }: { responsaveis: RespItem[] }) {
  const [expanded, setExpanded] = useState(false);

  if (responsaveis.length === 0) {
    return (
      <div className="flex items-center gap-1 text-muted-foreground/40">
        <User className="h-3 w-3" />
      </div>
    );
  }

  const ultimo = responsaveis[responsaveis.length - 1];
  const demais = responsaveis.slice(0, -1);
  const ultimoColor = PAPEL_COLORS[ultimo.papel] ?? "#64748b";

  if (!expanded) {
    return (
      <div className="flex items-center gap-1">
        <ResponsavelAvatar nome={ultimo.nome} papel={ultimo.papel} size="md" highlight />
        {demais.length > 0 && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                  className="h-5 min-w-[22px] px-1.5 rounded-full text-[8px] font-bold border transition-all hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: hexAlpha(ultimoColor, 0.1),
                    color: ultimoColor,
                    borderColor: hexAlpha(ultimoColor, 0.35),
                  }}
                >
                  +{demais.length} <ChevronDown className="inline h-2.5 w-2.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs max-w-[200px] space-y-0.5">
                <div className="font-semibold mb-1 text-muted-foreground">Outros responsáveis:</div>
                {demais.map((r, i) => (
                  <div key={`${r.nome}-${i}`} className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
                      style={{ background: PAPEL_COLORS[r.papel] ?? "#64748b" }} />
                    <span>{formatDisplayName(r.nome)}</span>
                    <span className="text-muted-foreground">· {PAPEL_LABELS[r.papel] ?? r.papel}</span>
                  </div>
                ))}
                <div className="text-muted-foreground mt-1 text-[10px]">Clique para ver todos</div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col gap-0.5 rounded-lg border border-border/60 bg-muted/40 p-1.5 w-full"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[9px] text-muted-foreground font-medium uppercase tracking-wide">Responsáveis</span>
        <button
          onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
          className="h-4 w-4 rounded flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
      </div>
      {responsaveis.map((r, i) => {
        const color = PAPEL_COLORS[r.papel] ?? "#64748b";
        const isUltimo = i === responsaveis.length - 1;
        return (
          <div key={`${r.nome}-${i}`} className="flex items-center gap-1.5 py-0.5">
            <ResponsavelAvatar nome={r.nome} papel={r.papel} size="sm" highlight={isUltimo} />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] font-medium text-foreground truncate">
                {formatDisplayName(r.nome)}
              </span>
              <span className="text-[9px]" style={{ color: hexAlpha(color, 0.85) }}>
                {PAPEL_LABELS[r.papel] ?? r.papel}
              </span>
            </div>
            {isUltimo && (
              <span className="text-[8px] px-1 py-0.5 rounded border shrink-0"
                style={{ color, borderColor: hexAlpha(color, 0.3), background: hexAlpha(color, 0.08) }}>
                último
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Badge de tipo da demanda ────────────────────────────────────────
function TipoBadge({ tipo }: { tipo?: string | null }) {
  if (!tipo) return null;
  const key = tipo.toLowerCase().replace(/\s+/g, "_");
  const color = TIPO_COLORS[key] ?? "#64748b";
  return (
    <span
      className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 capitalize"
      style={{ backgroundColor: hexAlpha(color, 0.14), color }}
    >
      {tipo}
    </span>
  );
}

function DemandaCard({
  demanda, accentHex, allColumns, onClick, onMove, onNovaAtividade,
}: {
  demanda: Demanda; accentHex: string;
  allColumns: { key: string; label: string; hex: string }[];
  onClick?: () => void; onMove?: (targetKey: string) => void; onNovaAtividade?: () => void;
}) {
  const slaD = slaDaysRemaining(demanda);
  const urgent = slaD !== null && slaD <= 3 && slaD >= 0;
  const late   = slaD !== null && slaD < 0;
  const responsaveis = getResponsaveisList(demanda);

  // Colunas anteriores ao status atual para regressão
  const currentIdx = allColumns.findIndex((c) => c.key === demanda.situacao);
  const previousCols = currentIdx > 0 ? allColumns.slice(0, currentIdx) : [];
  const nextCols = currentIdx >= 0 ? allColumns.slice(currentIdx + 1) : allColumns;

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          onClick={onClick}
          className="bg-card rounded-lg border border-border/60 shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:shadow-[0_3px_10px_rgba(0,0,0,0.15)] hover:border-border transition-all duration-150 overflow-hidden cursor-pointer select-none group"
        >
          <div className="h-0.5" style={{ backgroundColor: accentHex }} />
          <div className="p-3 flex flex-col gap-2">
            <p className="text-[13px] font-semibold leading-snug text-foreground line-clamp-2">
              {demanda.descricao ?? demanda.tipo ?? "Demanda"}
            </p>
            {(demanda.rhm || demanda.projeto || demanda.tipo) && (
              <div className="flex flex-wrap gap-1">
                {demanda.rhm && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: hexAlpha(accentHex, 0.14), color: accentHex }}>
                    RHM {demanda.rhm}
                  </span>
                )}
                {demanda.projeto && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium truncate max-w-[140px]">
                    {demanda.projeto}
                  </span>
                )}
                {/* NOVO: Badge de tipo */}
                <TipoBadge tipo={demanda.tipo} />
              </div>
            )}
            <div className="flex items-start justify-between gap-2 mt-0.5">
              <div className="flex items-center gap-1.5 pt-0.5">
                {late && (
                  <span className="flex items-center gap-0.5 text-[10px] rounded px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/25">
                    <AlertTriangle className="h-2.5 w-2.5" /> SLA
                  </span>
                )}
                {urgent && !late && (
                  <span className="flex items-center gap-0.5 text-[10px] rounded px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/25">
                    <Clock className="h-2.5 w-2.5" /> {slaD}d
                  </span>
                )}
                {slaD !== null && !urgent && !late && (
                  <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" /> {slaD}d
                  </span>
                )}
                {onNovaAtividade && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={(e) => { e.stopPropagation(); onNovaAtividade(); }}
                          className="h-5 w-5 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary hover:bg-primary/10"
                        >
                          <ActivitySquare className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">Nova atividade</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              <div className="flex-1 min-w-0 flex justify-end">
                <ResponsaveisGroup responsaveis={responsaveis} />
              </div>
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onClick}>Abrir detalhes</ContextMenuItem>
        {onNovaAtividade && (
          <ContextMenuItem onClick={(e) => { e.stopPropagation(); onNovaAtividade(); }}>
            <ActivitySquare className="h-3.5 w-3.5 mr-2 text-primary" />
            Nova atividade
          </ContextMenuItem>
        )}
        {onMove && (
          <>
            <ContextMenuSeparator />
            {/* Avançar status */}
            {nextCols.length > 0 && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />Avançar para
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="max-h-[60vh] overflow-y-auto w-52">
                  {nextCols.map((col) => (
                    <ContextMenuItem key={col.key} onClick={() => onMove(col.key)}>
                      <span className="inline-block h-2 w-2 rounded-full mr-2 shrink-0"
                        style={{ background: col.hex }} />
                      {col.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
            {/* Regredir status — SEM exigir EncerramentoDialog */}
            {previousCols.length > 0 && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <ChevronLeft className="h-3.5 w-3.5 mr-2 text-muted-foreground" />Regredir para
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="max-h-[60vh] overflow-y-auto w-52">
                  {previousCols.map((col) => (
                    <ContextMenuItem key={col.key} onClick={() => onMove(col.key)}>
                      <span className="inline-block h-2 w-2 rounded-full mr-2 shrink-0"
                        style={{ background: col.hex }} />
                      {col.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}

function CollapsedCol({ label, count, accentHex, onClick }: { label: string; count: number; accentHex: string; onClick: () => void }) {
  return (
    <div onClick={onClick}
      className="flex-shrink-0 w-10 flex flex-col items-center rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08)] cursor-pointer hover:shadow-md transition-all py-3 gap-3"
      style={{ borderTop: `3px solid ${accentHex}` }}>
      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <span className="text-[11px] font-bold flex-1 text-center leading-tight"
        style={{ writingMode: "vertical-lr", transform: "rotate(180deg)", color: accentHex, letterSpacing: "0.04em" }}>
        {label}
      </span>
      <span className="text-[10px] font-bold rounded-full min-w-[18px] text-center py-0.5 px-1"
        style={{ backgroundColor: hexAlpha(accentHex, 0.14), color: accentHex }}>
        {count}
      </span>
    </div>
  );
}

function ExpandedCol({ label, colKey, demandas, accentHex, allColumns, onCollapse, onCardClick, onAdd, onMove, onNovaAtividade }: {
  label: string; colKey: string; demandas: Demanda[]; accentHex: string;
  allColumns: { key: string; label: string; hex: string }[];
  onCollapse: () => void; onCardClick?: (d: Demanda) => void;
  onAdd?: () => void; onMove?: (demanda: Demanda, targetKey: string) => void;
  onNovaAtividade?: (demanda: Demanda) => void;
}) {
  return (
    <div className="flex-shrink-0 w-[280px] flex flex-col rounded-xl border border-border/60 bg-card shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition-all"
      style={{ borderTop: `3px solid ${accentHex}` }}>
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border">
        <button onClick={onCollapse} className="p-0.5 rounded hover:bg-muted transition-colors">
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <span className="flex-1 text-[12px] font-bold tracking-wide uppercase truncate" style={{ color: accentHex }}>{label}</span>
        <span className="text-[11px] font-bold rounded-full h-5 min-w-[20px] px-1.5 flex items-center justify-center"
          style={{ backgroundColor: hexAlpha(accentHex, 0.14), color: accentHex }}>
          {demandas.length}
        </span>
        {onAdd && (
          <button onClick={onAdd} className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      <div className="p-2 overflow-y-auto flex-1 space-y-2" style={{ maxHeight: "calc(100vh - 260px)" }}>
        {demandas.length === 0 ? (
          <div className="flex items-center justify-center h-14 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">
            Sem demandas
          </div>
        ) : (
          demandas.map((d) => (
            <DemandaCard key={d.id as string} demanda={d} accentHex={accentHex} allColumns={allColumns}
              onClick={() => onCardClick?.(d)}
              onMove={onMove ? (targetKey) => onMove(d, targetKey) : undefined}
              onNovaAtividade={onNovaAtividade ? () => onNovaAtividade(d) : undefined}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ── Filtro multi-select de projetos ─────────────────────────────────
function ProjetoMultiFilter({
  projetos, selected, onChange,
}: { projetos: string[]; selected: string[]; onChange: (v: string[]) => void }) {
  const [open, setOpen] = useState(false);

  const toggle = (p: string) => {
    onChange(selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p]);
  };

  const label = selected.length === 0
    ? "Todos os projetos"
    : selected.length === 1
    ? selected[0]
    : `${selected.length} projetos`;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-border bg-background text-sm text-foreground hover:bg-muted transition-colors">
          <span className="text-muted-foreground text-xs mr-0.5">Projeto:</span>
          <span className="font-medium truncate max-w-[160px]">{label}</span>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-1 shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <div className="space-y-1">
          {projetos.map((p) => (
            <label key={p} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm">
              <Checkbox
                checked={selected.includes(p)}
                onCheckedChange={() => toggle(p)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className="truncate">{p}</span>
            </label>
          ))}
        </div>
        {selected.length > 0 && (
          <button
            onClick={() => onChange([])}
            className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground text-center py-1 border-t border-border"
          >
            Limpar seleção
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}

export interface SustentacaoBoardProps {
  demandas?: Demanda[];
  onSelectDemanda?: (demanda: Demanda, initialTab?: string) => void;
  onCreateDemanda?: (situacao?: string) => void;
  onMoveDemanda?: (demanda: Demanda, targetKey: string) => void;
}

export function SustentacaoBoard({ demandas: demandasProp, onSelectDemanda, onCreateDemanda, onMoveDemanda }: SustentacaoBoardProps) {
  const demandas = demandasProp ?? [];
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [selectedResp, setSelectedResp] = useState<string[]>([]);
  const [selectedProjetos, setSelectedProjetos] = useState<string[]>([]);

  // 1. Colunas dinâmicas da tabela workflow_columns via useWorkflowSteps
  const { steps, loading: loadingSteps } = useWorkflowSteps();
  const { projetos } = useProjetos();

  // Converte steps do hook para o formato interno
  const allColumns = useMemo(() =>
    steps.map((s) => ({ key: s.key, label: s.label, hex: s.hex })),
  [steps]);

  const toggle = (key: string) =>
    setCollapsed((prev) => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });

  // Lista de nomes de projetos únicos do time
  const projetoNames = useMemo(() =>
    projetos.map((p) => p.nome).filter(Boolean),
  [projetos]);

  const responsaveisFilter = useMemo<ResponsavelFilterItem[]>(() => {
    const map = new Map<string, ResponsavelFilterItem>();
    demandas.forEach((d) => {
      const lista = getResponsaveisList(d);
      lista.forEach(({ papel, nome }) => {
        if (nome && !map.has(nome)) {
          map.set(nome, { userId: nome, name: nome, color: PAPEL_COLORS[papel] } as any);
        }
      });
    });
    return Array.from(map.values());
  }, [demandas]);

  const filtered = useMemo(() => {
    let items = demandas;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter((d) =>
        String(d.descricao ?? "").toLowerCase().includes(q) ||
        String(d.projeto ?? "").toLowerCase().includes(q) ||
        String(d.rhm ?? "").toLowerCase().includes(q));
    }
    // 2. Filtro multi-projeto: união dos projetos selecionados
    if (selectedProjetos.length > 0) {
      items = items.filter((d) => selectedProjetos.includes(d.projeto ?? ""));
    }
    if (selectedResp.length > 0) {
      items = items.filter((d) => {
        const nomes = getResponsaveisList(d).map((r) => r.nome);
        return nomes.some((n) => selectedResp.includes(n));
      });
    }
    return items;
  }, [demandas, search, selectedProjetos, selectedResp]);

  const byStatus = useMemo(() => {
    const map: Record<string, Demanda[]> = {};
    allColumns.forEach((c) => { map[c.key] = []; });
    filtered.filter(Boolean).forEach((d) => {
      const key = (d.situacao as string) ?? allColumns[0]?.key ?? "fila_atendimento";
      if (!map[key]) map[key] = [];
      map[key].push(d);
    });
    return map;
  }, [filtered, allColumns]);

  if (loadingSteps) {
    return (
      <div className="flex items-center justify-center h-32 text-sm text-muted-foreground">
        Carregando fluxo de trabalho...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-3">
      <div className="flex items-center gap-3 px-1 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar demanda..."
            className="w-full pl-9 pr-3 h-9 rounded-lg border border-border bg-background text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50"
          />
          {search && (
            <button onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {/* 2. Filtro multi-projeto */}
        {projetoNames.length > 0 && (
          <ProjetoMultiFilter
            projetos={projetoNames}
            selected={selectedProjetos}
            onChange={setSelectedProjetos}
          />
        )}
        {responsaveisFilter.length > 0 && (
          <KanbanResponsavelFilter responsaveis={responsaveisFilter} selected={selectedResp} onChange={setSelectedResp} />
        )}
        {(selectedResp.length > 0 || selectedProjetos.length > 0) && (
          <button
            onClick={() => { setSelectedResp([]); setSelectedProjetos([]); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-3 w-3" /> Limpar filtros
          </button>
        )}
        <Badge variant="outline" className="text-xs font-mono h-9 px-3">
          {filtered.length} demanda{filtered.length !== 1 ? "s" : ""}
        </Badge>
      </div>
      <div className="flex gap-2 pb-4 overflow-x-auto flex-1" style={{ minHeight: 120 }}>
        {allColumns.map((col) => {
          const items = byStatus[col.key] ?? [];
          if (collapsed.has(col.key)) {
            return <CollapsedCol key={col.key} label={col.label} count={items.length} accentHex={col.hex} onClick={() => toggle(col.key)} />;
          }
          return (
            <ExpandedCol key={col.key} colKey={col.key} label={col.label} demandas={items} accentHex={col.hex}
              allColumns={allColumns}
              onCollapse={() => toggle(col.key)}
              onCardClick={(d) => onSelectDemanda?.(d)}
              onAdd={onCreateDemanda ? () => onCreateDemanda(col.key) : undefined}
              onMove={onMoveDemanda}
              onNovaAtividade={(d) => onSelectDemanda?.(d, "horas")}
            />
          );
        })}
      </div>
    </div>
  );
}
