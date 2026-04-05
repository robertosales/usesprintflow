import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Building2 } from "lucide-react";

interface TeamSelectionModalProps {
  open: boolean;
  teams: { id: string; name: string; module: string }[];
  onSelect: (teamId: string) => void;
  moduleLabel: string;
}

export function TeamSelectionModal({ open, teams, onSelect, moduleLabel }: TeamSelectionModalProps) {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Selecionar Time</DialogTitle>
          <DialogDescription>
            Você possui mais de um time no módulo <strong>{moduleLabel}</strong>. Selecione qual deseja utilizar.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2 py-2">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelected(team.id)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                selected === team.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/30"
              }`}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted shrink-0">
                <Building2 className="h-4 w-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-medium">{team.name}</span>
            </button>
          ))}
        </div>
        <Button
          disabled={!selected}
          onClick={() => selected && onSelect(selected)}
          className="w-full"
        >
          Confirmar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
