import { History } from "lucide-react";

export function AdminHistoricoPage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <History className="h-10 w-10 opacity-30" />
        <p className="text-sm">Histórico de sprints em construção.</p>
      </div>
    </div>
  );
}
