import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  CheckCircle2, Circle, MinusCircle, Clock,
  ChevronDown, ChevronUp, ShieldCheck,
} from "lucide-react";
import { useRdmChecklist } from "../hooks/useRdmChecklist";
import type { RdmChecklistStatus } from "../types/rdm";
import { RDM_CHECKLIST_STATUS_LABELS } from "../types/rdm";

// ── Constantes de fase ────────────────────────────────────────────────────
const FASES = [
  {
    key:   "pre_implantacao" as const,
    label: "Pré-Implantação",
    step:  1,
    color: {
      ring:     "ring-blue-500/40",
      bar:      "bg-blue-500",
      badge:    "bg-blue-500/15 text-blue-400 border-blue-500/20",
      stepDone: "bg-blue-500 text-white",
      stepAct:  "bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/40",
    },
  },
  {
    key:   "execucao" as const,
    label: "Execução",
    step:  2,
    color: {
      ring:     "ring-orange-500/40",
      bar:      "bg-orange-500",
      badge:    "bg-orange-500/15 text-orange-400 border-orange-500/20",
      stepDone: "bg-orange-500 text-white",
      stepAct:  "bg-orange-500/20 text-orange-400 ring-2 ring-orange-500/40",
    },
  },
  {
    key:   "pos_implantacao" as const,
    label: "Pós-Implantação",
    step:  3,
    color: {
      ring:     "ring-emerald-500/40",
      bar:      "bg-emerald-500",
      badge:    "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
      stepDone: "bg-emerald-500 text-white",
      stepAct:  "bg-emerald-500/20 text-emerald-400 ring-2 ring-emerald-500/40",
    },
  },
] as const;

type FaseKey = typeof FASES[number]["key"];

const STATUS_ICON: Record<RdmChecklistStatus, React.ReactNode> = {
  pendente:      <Circle       className="h-4 w-4 text-slate-400" />,
  em_andamento:  <Clock        className="h-4 w-4 text-yellow-400" />,
  concluido:     <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
  nao_aplicavel: <MinusCircle  className="h-4 w-4 text-muted-foreground" />,
};

const NEXT_STATUS: Record<RdmChecklistStatus, RdmChecklistStatus> = {
  pendente:      "em_andamento",
  em_andamento:  "concluido",
  concluido:     "nao_aplicavel",
  nao_aplicavel: "pendente",
};

// ── Helpers ───────────────────────────────────────────────────────────────
function calcProgress(items: { status: string }[]) {
  if (items.length === 0) return 0;
  const done = items.filter((i) => i.status === "concluido" || i.status === "nao_aplicavel").length;
  return Math.round((done / items.length) * 100);
}

interface Props { rdmId: string }

export function RdmChecklistPanel({ rdmId }: Props) {
  const { grouped, progress, loading, update } = useRdmChecklist(rdmId);

  // Fase expandida (uma por vez)
  const [faseAberta, setFaseAberta] = useState<FaseKey>("pre_implantacao");

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  const totalItems = Object.values(grouped).flat().length;

  return (
    <div className="space-y-5">

      {/* ===== Barra de progresso global ===== */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">Progresso Total</span>
          <span className="text-muted-foreground font-mono">{progress}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ===== Steps visuais das 3 fases ===== */}
      <div className="grid grid-cols-3 gap-2">
        {FASES.map((fase, idx) => {
          const items       = grouped[fase.key] ?? [];
          const pct         = calcProgress(items);
          const concluida   = pct === 100;
          const ativa       = fase.key === faseAberta;

          return (
            <button
              key={fase.key}
              onClick={() => setFaseAberta(fase.key)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all text-center",
                ativa
                  ? cn("border-border bg-muted/40", fase.color.ring, "ring-1")
                  : "border-border bg-muted/10 hover:bg-muted/30"
              )}
            >
              {/* Número do step */}
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  concluida
                    ? fase.color.stepDone
                    : ativa
                      ? fase.color.stepAct
                      : "bg-muted text-muted-foreground"
                )}
              >
                {concluida ? <CheckCircle2 className="h-4 w-4" /> : idx + 1}
              </span>

              <p className="text-[11px] font-semibold leading-tight">{fase.label}</p>

              {/* Mini barra de progresso da fase */}
              <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", fase.color.bar)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">
                {items.filter((i) =>
                  i.status === "concluido" || i.status === "nao_aplicavel"
                ).length}/{items.length} &middot; {pct}%
              </p>

              {/* Conector entre steps */}
              {idx < FASES.length - 1 && (
                <span className="absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-muted-foreground text-xs">
                  ›
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ===== Itens da fase aberta ===== */}
      {FASES.map((fase) => {
        if (fase.key !== faseAberta) return null;
        const items    = grouped[fase.key] ?? [];
        const pct      = calcProgress(items);
        const concluida = pct === 100;

        return (
          <div
            key={fase.key}
            className={cn(
              "rounded-xl border border-border bg-muted/10 overflow-hidden",
            )}
          >
            {/* Cabeçalho da fase */}
            <div
              className="flex items-center justify-between px-4 py-3 cursor-pointer"
              onClick={() => {}}
            >
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold",
                    concluida ? fase.color.stepDone : fase.color.stepAct
                  )}
                >
                  {concluida ? <CheckCircle2 className="h-3.5 w-3.5" /> : fase.step}
                </span>
                <span className="text-sm font-semibold">{fase.label}</span>
                {concluida && (
                  <span className={cn(
                    "text-[10px] font-medium px-1.5 py-0.5 rounded-full border",
                    fase.color.badge
                  )}>
                    Concluída
                  </span>
                )}
              </div>
              <span className="text-xs text-muted-foreground font-mono">{pct}%</span>
            </div>

            {/* Barra da fase */}
            <div className="h-1 w-full bg-muted">
              <div
                className={cn("h-full transition-all duration-500", fase.color.bar)}
                style={{ width: `${pct}%` }}
              />
            </div>

            {/* Lista de itens */}
            <div className="divide-y divide-border/50">
              {items.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">
                  Nenhum item nesta fase.
                </p>
              )}
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() =>
                    update(item.id, {
                      status: NEXT_STATUS[item.status as RdmChecklistStatus],
                      concluido_em:
                        NEXT_STATUS[item.status as RdmChecklistStatus] === "concluido"
                          ? new Date().toISOString()
                          : null,
                    })
                  }
                  className={cn(
                    "w-full flex items-start gap-3 px-4 py-2.5 text-left transition-colors text-sm",
                    "hover:bg-muted/60"
                  )}
                >
                  <span className="mt-0.5 shrink-0">
                    {STATUS_ICON[item.status as RdmChecklistStatus] ?? STATUS_ICON.pendente}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={cn(
                        "text-sm leading-snug",
                        item.status === "concluido"     && "line-through text-muted-foreground",
                        item.status === "nao_aplicavel" && "text-muted-foreground/60"
                      )}
                    >
                      {item.descricao}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {RDM_CHECKLIST_STATUS_LABELS[item.status as RdmChecklistStatus]}
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* Rodapé da fase com total */}
            {items.length > 0 && (
              <div className="flex items-center justify-between px-4 py-2 border-t border-border/50 bg-muted/20">
                <p className="text-[11px] text-muted-foreground">
                  {items.filter((i) => i.status === "concluido" || i.status === "nao_aplicavel").length} de{" "}
                  {items.length} itens resolvidos
                </p>
                {concluida && (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5" /> Fase concluída
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}

      {totalItems === 0 && (
        <p className="text-center text-sm text-muted-foreground py-6">
          Nenhum item de checklist cadastrado.
        </p>
      )}
    </div>
  );
}
