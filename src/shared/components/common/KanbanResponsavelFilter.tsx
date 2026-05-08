/**
 * KanbanResponsavelFilter — filtro visual por responsável no Kanban.
 * Exibe avatars (foto ou iniciais) dos responsáveis encontrados nos cards.
 * Suporta múltipla seleção + opção "Todos".
 * Combina com busca textual sem conflito.
 */
import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getInitials, formatDisplayName } from "@/lib/nameUtils";

export interface ResponsavelFilterItem {
  userId: string;
  name: string;
  avatarUrl?: string | null;
}

interface KanbanResponsavelFilterProps {
  responsaveis: ResponsavelFilterItem[];
  selected: string[]; // user_ids selecionados; vazio = todos
  onChange: (selected: string[]) => void;
  className?: string;
}

export function KanbanResponsavelFilter({
  responsaveis,
  selected,
  onChange,
  className,
}: KanbanResponsavelFilterProps) {
  const isAll = selected.length === 0;

  const toggle = (userId: string) => {
    if (selected.includes(userId)) {
      const next = selected.filter((id) => id !== userId);
      onChange(next);
    } else {
      onChange([...selected, userId]);
    }
  };

  if (responsaveis.length === 0) return null;

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-1.5 flex-wrap", className)}>
        {/* Botão "Todos" */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onChange([])}
              className={cn(
                "h-8 px-3 rounded-full text-xs font-semibold border transition-all",
                isAll
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground",
              )}
            >
              Todos
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">Ver todos os responsáveis</TooltipContent>
        </Tooltip>

        {/* Avatars de responsáveis */}
        {responsaveis.map((r) => {
          const active = selected.includes(r.userId);
          const initials = getInitials(r.name);
          const display = formatDisplayName(r.name);

          return (
            <Tooltip key={r.userId}>
              <TooltipTrigger asChild>
                {/* CORRIGIDO: removido title={display} que causava tooltip nativo duplicado com o Radix TooltipContent */}
                <button
                  onClick={() => toggle(r.userId)}
                  className={cn(
                    "relative h-8 w-8 rounded-full border-2 transition-all overflow-hidden shrink-0",
                    active
                      ? "border-primary ring-2 ring-primary/30 shadow-md"
                      : "border-border hover:border-primary/50 opacity-70 hover:opacity-100",
                  )}
                  aria-pressed={active}
                  aria-label={display}
                >
                  {r.avatarUrl ? (
                    <img
                      src={r.avatarUrl}
                      alt={display}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span
                      className={cn(
                        "flex h-full w-full items-center justify-center text-[10px] font-bold",
                        active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {initials}
                    </span>
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {display}
                {active && <Badge variant="outline" className="ml-1 text-[9px] h-4">Filtrado</Badge>}
              </TooltipContent>
            </Tooltip>
          );
        })}

        {selected.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {selected.length} selecionado{selected.length > 1 ? "s" : ""}
          </span>
        )}
      </div>
    </TooltipProvider>
  );
}
