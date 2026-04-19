// src/features/retro/components/RetroVotingPhase.tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThumbsUp, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { getModel } from "../utils/retroModels";
import type { RetroCard, RetroModelKey, RetroVote } from "../types/retro";

interface Props {
  model: RetroModelKey;
  cards: RetroCard[];
  votes: RetroVote[];
  profiles: Record<string, string>;
  userId: string;
  onToggleVote: (cardId: string) => Promise<void>;
}

export function RetroVotingPhase({ model, cards, votes, profiles, userId, onToggleVote }: Props) {
  const { columns } = getModel(model);
  const visible = cards.filter((c) => !c.hidden);

  const myVotes = new Set(votes.filter((v) => v.userId === userId).map((v) => v.cardId));

  // Top 3
  const ranked = [...visible].sort((a, b) => b.votes - a.votes).slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Top 3 */}
      <Card className="border-amber-300 bg-amber-50/30 dark:bg-amber-950/10">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
            <Trophy className="h-3.5 w-3.5 text-amber-500" /> Top 3 mais votados
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-2">
          {ranked.length === 0 || ranked[0].votes === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aguardando os primeiros votos...</p>
          ) : (
            ranked.map((card, i) => {
              const col = columns.find((c) => c.key === card.columnKey);
              return (
                <div key={card.id} className="flex items-center gap-3 p-2 rounded bg-background border">
                  <div className="text-lg font-bold w-6 text-center">{["🥇", "🥈", "🥉"][i]}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs truncate">{card.text}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {col?.icon} {col?.label}
                    </p>
                  </div>
                  <Badge className="text-xs gap-1">
                    <ThumbsUp className="h-3 w-3" />
                    {card.votes}
                  </Badge>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Colunas para votação */}
      <div
        className={cn(
          "grid gap-3",
          columns.length <= 3 ? "md:grid-cols-3" : columns.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3 lg:grid-cols-5",
        )}
      >
        {columns.map((col) => {
          const colCards = visible.filter((c) => c.columnKey === col.key).sort((a, b) => b.votes - a.votes);
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
                  {colCards.map((card) => {
                    const voted = myVotes.has(card.id);
                    return (
                      <div key={card.id} className="rounded-md border bg-background p-2 text-xs space-y-1.5">
                        <p className="whitespace-pre-wrap">{card.text}</p>
                        <p className="text-[10px] text-muted-foreground">{profiles[card.authorId] ?? "Participante"}</p>
                        <Button
                          size="sm"
                          variant={voted ? "default" : "outline"}
                          className="w-full h-7 text-[11px] gap-1"
                          onClick={() => onToggleVote(card.id)}
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {card.votes} {voted ? "(seu voto)" : "Votar"}
                        </Button>
                      </div>
                    );
                  })}
                  {colCards.length === 0 && <p className="text-[11px] text-muted-foreground italic">Sem cards</p>}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
