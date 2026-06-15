import { Gauge } from "lucide-react";

export function AdminCapacidadePage() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center justify-center py-24 text-muted-foreground gap-3">
        <Gauge className="h-10 w-10 opacity-30" />
        <p className="text-sm">Gestão de capacidade em construção.</p>
      </div>
    </div>
  );
}
