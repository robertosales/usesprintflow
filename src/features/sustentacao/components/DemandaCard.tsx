import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { MoreHorizontal, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { Demanda } from "../types/demanda";
import { SITUACAO_LABELS, SITUACAO_COLORS, getResponsavelAtivo } from "../types/demanda";

interface Props {
  demanda: Demanda;
  onOpen: (d: Demanda) => void;
  onDelete?: (d: Demanda) => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, d: Demanda) => void;
}

export function DemandaCard({ demanda, onOpen, onDelete, draggable, onDragStart }: Props) {
  const papel = getResponsavelAtivo(demanda);

  return (
    <Card
      className="p-3 cursor-pointer hover:shadow-md transition-shadow group border"
      draggable={draggable}
      onDragStart={(e) => onDragStart?.(e, demanda)}
      onClick={() => onOpen(demanda)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-info">{demanda.rhm}</span>
            {demanda.sla === '24x7' && (
              <Badge variant="destructive" className="text-[10px] h-4 px-1">24x7</Badge>
            )}
            {demanda.situacao === 'bloqueada' && (
              <Badge className="text-[10px] h-4 px-1 bg-destructive/10 text-destructive border-destructive/20">Bloqueada</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">{demanda.projeto}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="outline" className="text-[10px] h-4 px-1.5 capitalize">{demanda.tipo}</Badge>
            {papel && (
              <span className="text-[10px] text-muted-foreground">→ {papel}</span>
            )}
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpen(demanda); }}>Detalhes</DropdownMenuItem>
            {onDelete && (
              <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); onDelete(demanda); }}>Excluir</DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </Card>
  );
}
