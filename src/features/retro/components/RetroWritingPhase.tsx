// src/features/retro/components/RetroWritingPhase.tsx
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EyeOff, Eye, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getModel } from "../utils/retroModels";
import type { RetroCard, RetroModelKey } from "../types/retro";

interface Props {
  model: RetroModelKey;
  cards: RetroCard[];
  userId: string;
  isFacilitator: boolean;
  onAdd: (columnKey: string, text: string) => Promise<void>;
  onUpdate: (cardId: string, text: string) => Promise<void>;
  onToggleHide: (cardId: string, hidden: boolean) => Promise<void>;
  onDelete: (cardId: string) => Promise<void>;
}

export function RetroWritingPhase({ model, cards, userId, isFacilitator, onAdd, onUpdate, onToggleHide, onDelete }: Props) {
  const { columns } = getModel(model);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const setDraft = (key: string, value: string) => setDrafts((d) => ({ ...d, [key]: value }));

  const handleAdd = async (columnKey: string) => {
    const text = (drafts[columnKey] || "").trim();
    if (!text) return;
    await onAdd(columnKey, text);
    setDraft(columnKey, "");
  };

  return (
    <div
      className={cn(
        "grid gap-3",
        columns.length <= 3 ? "md:grid-cols-3" : columns.length === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3 lg:grid-cols-5",
      )}
    >
      {columns.map((col) => {
        const colCards = cards.filter((c) => c.columnKey === col.key);
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
              <p className="text-[11px] text-muted-foreground -mt-1">{col.desc}</p>

              {/* Lista de cards */}
              <div className="space-y-2 min-h-[40px]">
                {colCards.map((card) => {
                  const mine = card.authorId === userId;
                  return (
                    <div
                      key={card.id}
                      className={cn(
                        "rounded-md border bg-background p-2 text-xs space-y-1",
                        card.hidden && "opacity-50 italic",
                      )}
                    >
                      {mine ? (
                        <Textarea
                          value={card.text}
                          onChange={(e) => onUpdate(card.id, e.target.value)}
                          rows={2}
                          className="text-xs resize-none border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap">{card.hidden ? "[oculto]" : card.text}</p>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-dashed">
                        <span className="text-[10px] text-muted-foreground">{mine ? "Seu card" : "Anônimo"}</span>
                        <div className="flex items-center gap-1">
                          {isFacilitator && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => onToggleHide(card.id, !card.hidden)}
                              title={card.hidden ? "Mostrar" : "Ocultar"}
                            >
                              {card.hidden ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
                            </Button>
                          )}
                          {(mine || isFacilitator) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0 text-destructive"
                              onClick={() => onDelete(card.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Adicionar */}
              <div className="space-y-1.5 pt-1 border-t">
                <Textarea
                  value={drafts[col.key] || ""}
                  onChange={(e) => setDraft(col.key, e.target.value)}
                  placeholder={`Escreva em "${col.label}"...`}
                  rows={2}
                  className="text-xs resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                      e.preventDefault();
                      handleAdd(col.key);
                    }
                  }}
                />
                <Button size="sm" variant="outline" onClick={() => handleAdd(col.key)} className="w-full h-7 text-xs gap-1">
                  <Plus className="h-3 w-3" /> Adicionar
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
