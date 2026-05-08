/**
 * SprintImpedimentsBanner
 * Banner âmbar exibido acima do Kanban quando a sprint ativa tem impedimentos abertos.
 * Clicando em "Ver detalhes" abre o SprintImpedimentsModal.
 *
 * Uso — dentro do componente pai do board:
 *   <SprintImpedimentsBanner sprint={activeSprint} />
 */
import { useState, useMemo } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSprint } from "@/contexts/SprintContext";
import { SprintImpedimentsModal } from "./SprintImpedimentsModal";
import { Sprint } from "@/types/sprint";

interface Props {
  sprint: Sprint | null;
}

export function SprintImpedimentsBanner({ sprint }: Props) {
  const { impediments, userStories } = useSprint();
  const [modalOpen, setModalOpen] = useState(false);

  const activeCount = useMemo(() => {
    if (!sprint) return 0;
    const sprintHuIds = new Set(
      userStories.filter((h) => h.sprintId === sprint.id).map((h) => h.id),
    );
    return impediments.filter(
      (imp) =>
        !imp.resolvedAt &&
        (imp.sprintId === sprint.id || (imp.huId && sprintHuIds.has(imp.huId))),
    ).length;
  }, [impediments, userStories, sprint]);

  // Conta só impedimentos diretos da sprint (não de HUs)
  const sprintLevelCount = useMemo(() => {
    if (!sprint) return 0;
    return impediments.filter(
      (imp) => !imp.resolvedAt && imp.sprintId === sprint.id,
    ).length;
  }, [impediments, sprint]);

  if (!sprint || activeCount === 0) return null;

  return (
    <>
      <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm">
        <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
        <span className="text-amber-700 dark:text-amber-400 flex-1">
          <strong>{activeCount}</strong> impedimento{activeCount > 1 ? "s" : ""} afeta{activeCount > 1 ? "m" : ""} esta sprint
          {sprintLevelCount > 0 && (
            <span className="text-amber-600/70">
              {" "}({sprintLevelCount} no nível da sprint)
            </span>
          )}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs border-amber-500/40 text-amber-700 hover:bg-amber-500/15 dark:text-amber-400"
          onClick={() => setModalOpen(true)}
        >
          Ver detalhes
        </Button>
      </div>

      {sprint && (
        <SprintImpedimentsModal
          sprint={sprint}
          open={modalOpen}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  );
}
