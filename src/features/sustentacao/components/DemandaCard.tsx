import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MoreHorizontal, User, ArrowRightLeft, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import type { Demanda } from "../types/demanda";
import { getResponsavelAtivo } from "../types/demanda";

const TIPO_COLORS: Record<string, string> = {
  incidente:   "#ef4444",
  problema:    "#f97316",
  mudanca:     "#8b5cf6",
  requisicao:  "#3b82f6",
  melhoria:    "#10b981",
  corretiva:   "#f59e0b",
  evolutiva:   "#06b6d4",
};

interface Props {
  demanda: Demanda;
  onOpen: (d: Demanda) => void;
  onDelete?: (d: Demanda) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, d: Demanda) => void;
  /** Colunas disponíveis para mover via menu de contexto. */
  moveOptions?: { key: string; label: string }[];
  onMove?: (d: Demanda, targetKey: string) => void;
}

import { getInitials, formatPersonName } from "@/lib/personName";

export function DemandaCard({
  demanda,
  onOpen,
  onDelete,
  draggable,
  onDragStart,
  moveOptions,
  onMove,
}: Props) {
  const responsavel = getResponsavelAtivo(demanda);

  const tipoKey = (demanda.tipo ?? "").toLowerCase().replace(/\s+/g, "_");
  const tipoColor = TIPO_COLORS[tipoKey] ?? "#64748b";
  const hexAlpha = (hex: string, a: number) => {
    const c = hex.replace("#", "");
    return `rgba(${parseInt(c.slice(0,2),16)},${parseInt(c.slice(2,4),16)},${parseInt(c.slice(4,6),16)},${a})`;
  };

  // Colunas anteriores ao status atual para regressão
  const currentIdx = (moveOptions ?? []).findIndex((o) => o.key === demanda.situacao);
  const previousCols = currentIdx > 0 ? (moveOptions ?? []).slice(0, currentIdx) : [];
  const nextCols = currentIdx >= 0 ? (moveOptions ?? []).slice(currentIdx + 1) : (moveOptions ?? []);

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow group border border-border/60 flex flex-col gap-2"
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, demanda)}
      onClick={() => onOpen(demanda)}
    >
      {/* ── LINHA 1: RHM + menu ── */}
      <div className="flex items-center justify-between gap-1">
        <div className="flex items-center gap-1.5 flex-wrap min-w-0">
          <span className="text-xs font-mono font-bold text-info shrink-0">{demanda.rhm}</span>
          {demanda.sla === "24x7" && (
            <Badge variant="destructive" className="text-[10px] h-4 px-1 shrink-0">
              24x7
            </Badge>
          )}
          {demanda.situacao === "bloqueada" && (
            <Badge className="text-[10px] h-4 px-1 bg-destructive/10 text-destructive border-destructive/20 shrink-0">
              Bloqueada
            </Badge>
          )}
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 -mr-1">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onOpen(demanda);
              }}
            >
              Detalhes
            </DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(demanda);
                }}
              >
                Excluir
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── LINHA 2: Título + projeto + TIPO ── */}
      <div className="space-y-0.5 min-w-0">
        {demanda.descricao && (
          <p className="text-xs font-semibold leading-snug line-clamp-2 text-foreground">{demanda.descricao}</p>
        )}
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[10px] text-muted-foreground truncate">{demanda.projeto}</p>
          {/* NOVO: Tipo da demanda */}
          {demanda.tipo && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-medium capitalize shrink-0"
              style={{
                backgroundColor: hexAlpha(tipoColor, 0.14),
                color: tipoColor,
              }}
            >
              {demanda.tipo}
            </span>
          )}
        </div>
      </div>

      {/* ── LINHA 3: responsável ── */}
      <div className="flex items-center justify-end gap-2 pt-0.5">
        {responsavel ? (
          <div className="flex items-center gap-1 min-w-0">
            <div
              className="h-4 w-4 rounded-full bg-info/15 text-info text-[8px] font-bold flex items-center justify-center shrink-0"
              title={responsavel}
            >
              {getInitials(responsavel)}
            </div>
            <span className="text-[10px] text-muted-foreground truncate max-w-[110px]">{formatPersonName(responsavel)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-muted-foreground/40">
            <User className="h-3 w-3" />
            <span className="text-[10px]">Sem responsável</span>
          </div>
        )}
      </div>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={() => onOpen(demanda)}>Abrir detalhes</ContextMenuItem>
        {moveOptions && onMove && (
          <>
            {/* Avançar status */}
            {nextCols.length > 0 && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <ArrowRightLeft className="h-3.5 w-3.5 mr-2" />
                  Avançar para
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="max-h-[60vh] overflow-y-auto">
                  {nextCols.map((opt) => (
                    <ContextMenuItem key={opt.key} onClick={() => onMove(demanda, opt.key)}>
                      {opt.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
            {/* Regredir status — NÃO aciona EncerramentoDialog */}
            {previousCols.length > 0 && (
              <ContextMenuSub>
                <ContextMenuSubTrigger>
                  <ChevronLeft className="h-3.5 w-3.5 mr-2 text-muted-foreground" />
                  Regredir para
                </ContextMenuSubTrigger>
                <ContextMenuSubContent className="max-h-[60vh] overflow-y-auto">
                  {previousCols.map((opt) => (
                    <ContextMenuItem key={opt.key} onClick={() => onMove(demanda, opt.key)}>
                      {opt.label}
                    </ContextMenuItem>
                  ))}
                </ContextMenuSubContent>
              </ContextMenuSub>
            )}
          </>
        )}
        {onDelete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive" onClick={() => onDelete(demanda)}>
              Excluir
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}
