/**
 * SprintStatusBadge
 * Badge reutilizável que exibe o status semântico de uma sprint.
 * Usa getSprintStatus() para derivar o estado correto.
 */
import { getSprintStatus } from "@/utils/sprintStatus";
import { cn } from "@/lib/utils";

interface Props {
  sprint: {
    is_active?: boolean;
    isActive?: boolean;
    end_date?: string | null;
    endDate?: string | null;
    closed_at?: string | null;
    closedAt?: string | null;
    delay_days?: number | null;
    delayDays?: number | null;
  };
  className?: string;
  /** Se true, exibe apenas o emoji sem o label textual */
  compact?: boolean;
}

export function SprintStatusBadge({ sprint, className, compact = false }: Props) {
  const result = getSprintStatus(sprint);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 h-6 px-2 rounded-full border text-[10px] font-semibold",
        result.colorClass,
        className,
      )}
    >
      <span>{result.emoji}</span>
      {!compact && <span>{result.label}</span>}
      {!compact && result.delayDays > 0 && result.status === "ativa_atrasada" && (
        <span className="ml-0.5 font-bold">
          +{result.delayDays}d
        </span>
      )}
    </span>
  );
}
