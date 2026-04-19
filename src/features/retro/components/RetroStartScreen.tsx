// src/features/retro/components/RetroStartScreen.tsx
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Play, Sparkles } from "lucide-react";
import { RETRO_MODELS } from "../utils/retroModels";
import type { RetroModelKey } from "../types/retro";

interface Props {
  canStart: boolean;
  sprintName: string;
  onStart: (model: RetroModelKey) => Promise<void>;
}

export function RetroStartScreen({ canStart, sprintName, onStart }: Props) {
  const [model, setModel] = useState<RetroModelKey>("4ls");
  const [creating, setCreating] = useState(false);

  const handleStart = async () => {
    setCreating(true);
    try {
      await onStart(model);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex justify-center py-10">
      <Card className="max-w-xl w-full border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-primary" />
            Iniciar Retrospectiva
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Sprint ativa: <span className="font-semibold text-foreground">{sprintName}</span>
          </p>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase">Modelo da retrospectiva</Label>
            <Select value={model} onValueChange={(v) => setModel(v as RetroModelKey)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(RETRO_MODELS).map(([key, m]) => (
                  <SelectItem key={key} value={key}>
                    {m.label} — {m.columns.length} colunas
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {canStart ? (
            <Button onClick={handleStart} disabled={creating} className="w-full gap-2">
              <Play className="h-4 w-4" />
              {creating ? "Criando sessão..." : "Iniciar sessão"}
            </Button>
          ) : (
            <div className="text-center text-sm text-muted-foreground p-3 rounded-md border border-dashed">
              Apenas Admin, Scrum Master ou Product Owner podem iniciar uma retrospectiva.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
