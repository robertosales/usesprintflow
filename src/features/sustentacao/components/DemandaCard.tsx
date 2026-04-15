import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Demanda } from "../types/demanda";
import { getResponsavelAtivo } from "../types/demanda";

interface Props {
  demanda: Demanda;
  onOpen: (d: Demanda) => void;
  onDelete?: (d: Demanda) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, d: Demanda) => void;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function DemandaCard({ demanda, onOpen, onDelete, draggable, onDragStart }: Props) {
  const responsavel = getResponsavelAtivo(demanda);

  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow group border border-border/60"
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, demanda)}
      onClick={() => onOpen(demanda)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 min-w-0 flex-1">
          {/* ── Linha 1: RHM + badges de alerta ── */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-mono font-bold text-info">{demanda.rhm}</span>
            {demanda.sla === "24x7" && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1">
                24x7
              </Badge>
            )}
            {demanda.situacao === "bloqueada" && (
              <Badge className="text-[10px] h-4 px-1 bg-destructive/10 text-destructive border-destructive/20">
                Bloqueada
              </Badge>
            )}
          </div>

          {/* ── Linha 2: Projeto ── */}
          <p className="text-xs text-muted-foreground truncate">{demanda.projeto}</p>

          {/* ── Linha 3: Título/descrição ── */}
          {demanda.descricao && <p className="text-xs font-medium leading-tight line-clamp-2">{demanda.descricao}</p>}

          {/* ── Linha 4: Tipo + Responsável ── */}
          <div className="flex items-center justify-between gap-1.5 pt-0.5">
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize shrink-0">
              {demanda.tipo}
            </Badge>

            {/* ✅ NOVO: avatar com iniciais + nome do responsável ativo */}
            {responsavel ? (
              <div className="flex items-center gap-1 min-w-0">
                <div
                  className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0"
                  title={responsavel}
                >
                  {getInitials(responsavel)}
                </div>
                <span className="text-[10px] text-muted-foreground truncate max-w-[100px]">{responsavel}</span>
              </div>
            ) : (
              <span className="text-[10px] text-muted-foreground/50 italic">Sem responsável</span>
            )}
          </div>
        </div>

        {/* ── Menu de ações ── */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 shrink-0">
              <MoreHorizontal className="h-3.5 w-3.5" />
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
    </Card>
  );
}
