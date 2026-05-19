import { cn } from "@/lib/utils";
import type { RdmStatus } from "../types/rdm";
import { RDM_STATUS_LABELS, RDM_STATUS_COLORS } from "../types/rdm";

export function RdmStatusBadge({ status, className }: { status: string; className?: string }) {
  const s = (status ?? "rascunho") as RdmStatus;
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border",
        RDM_STATUS_COLORS[s] ?? "bg-slate-500/15 text-slate-400 border-slate-500/20",
        className
      )}
    >
      {RDM_STATUS_LABELS[s] ?? status}
    </span>
  );
}
