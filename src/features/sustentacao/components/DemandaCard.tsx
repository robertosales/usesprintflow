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
      className="cursor-pointer hover:shadow-md transition-shadow group border border-border/60 flex flex-col gap-0 p-0 overflow-hidden"
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, demanda)}
      onClick={() => onOpen(demanda)}
    >
      {/* ── TOPO: RHM + menu ── */}
      <div className="flex items-center justify-between gap-2 px-3 pt-3 pb-1">
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

      {/* ── MEIO: tipo + projeto ── */}
      <div className="flex items-center gap-1.5 flex-wrap px-3 py-1.5">
        <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize">
          {demanda.tipo}
        </Badge>
        <span className="text-[10px] text-muted-foreground truncate">{demanda.projeto}</span>
      </div>

      {/* ── TÍTULO ── */}
      {demanda.descricao && (
        <p className="text-xs font-medium leading-snug line-clamp-2 px-3 pb-2">{demanda.descricao}</p>
      )}

      {/* ── RODAPÉ: responsável ── */}
      {responsavel && (
        <div className="flex items-center gap-1.5 px-3 py-2 mt-auto border-t border-border/40">
          <div
            className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[9px] font-bold flex items-center justify-center shrink-0"
            title={responsavel}
          >
            {getInitials(responsavel)}
          </div>
          <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">{responsavel}</span>
        </div>
      )}
    </Card>
  );
}
