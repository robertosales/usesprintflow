// src/features/retro/components/RetroRevealPhase.tsx
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getModel } from "../utils/retroModels";
import type { RetroCard, RetroModelKey } from "../types/retro";

interface Props {
  model: RetroModelKey;
  cards: RetroCard[];
  profiles: Record<string, string>;
}

export function RetroRevealPhase({ model, cards, profiles }: Props) {
  const { columns } = getModel(model);
  const visible = cards.filter((c) => !c.hidden);

  return (
    <div
      className={cn(
        "grid gap-3",
        columns.length <= 3 ? "md:grid-cols-3" : columns.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3 lg:grid-cols-5",
      )}
    >
      {columns.map((col) => {
        const colCards = visible.filter((c) => c.columnKey === col.key);
        return (
          <Card key={col.key} className={cn("border-2", col.border, col.bg)}>
            <CardContent className="p-3 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">{col.icon}</span>
                  <span className={cn("text-sm font-bold", col.color)}>{col.label}</span>
                </div>
                <Badge variant="outline" className="text-[10px]">
                  {colCards.length}
                </Badge>
              </div>

              <div className="space-y-2 min-h-[40px]">
                {colCards.map((card) => (
                  <div key={card.id} className="rounded-md border bg-background p-2 text-xs space-y-1 animate-in fade-in">
                    <p className="whitespace-pre-wrap">{card.text}</p>
                    <p className="text-[10px] text-muted-foreground border-t border-dashed pt-1">
                      {profiles[card.authorId] ?? "Participante"}
                    </p>
                  </div>
                ))}
                {colCards.length === 0 && <p className="text-[11px] text-muted-foreground italic">Sem cards</p>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
