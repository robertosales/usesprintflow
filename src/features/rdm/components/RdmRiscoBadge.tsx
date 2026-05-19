import { cn } from "@/lib/utils";
import type { RdmRisco } from "../types/rdm";
import { RDM_RISCO_LABELS, RDM_RISCO_COLORS } from "../types/rdm";

export function RdmRiscoBadge({ risco, className }: { risco: string; className?: string }) {
  const r = (risco ?? "baixo") as RdmRisco;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border",
        RDM_RISCO_COLORS[r] ?? "bg-slate-500/15 text-slate-400",
        className
      )}
    >
      {RDM_RISCO_LABELS[r] ?? risco}
    </span>
  );
}
