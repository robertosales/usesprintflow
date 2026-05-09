import { Info } from "lucide-react";

export interface LegendItem {
  sigla: string;
  descricao: string;
}

export function ReportLegendBlock({ items }: { items: LegendItem[] }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 px-4 py-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Info className="h-3.5 w-3.5 text-muted-foreground" />
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Legenda</p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        {items.map((i) => (
          <span key={i.sigla} className="text-[11px] text-muted-foreground">
            <strong className="text-foreground font-semibold">{i.sigla}</strong>
            {" — "}{i.descricao}
          </span>
        ))}
      </div>
    </div>
  );
}
