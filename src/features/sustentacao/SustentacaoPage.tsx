import { useState, useCallback } from "react";
import { SustentacaoBoard } from "./components/SustentacaoBoard";
import type { Demanda } from "./types/demanda";
import { useDemandas } from "./hooks/useDemandas";
import { DemandaDetail } from "./components/DemandaDetail";

export default function SustentacaoPage() {
  const { demandas, loading, update, moveTo } = useDemandas();
  const [selected, setSelected] = useState<Demanda | null>(null);
  const [createSituacao, setCreateSituacao] = useState<string | undefined>();
  const [showCreate, setShowCreate] = useState(false);

  const handleCreateDemanda = useCallback((situacao?: string) => {
    setCreateSituacao(situacao);
    setShowCreate(true);
  }, []);

  const handleSelectDemanda = useCallback((d: Demanda) => {
    setSelected(d);
  }, []);

  const handleUpdate = useCallback(
    async (id: string, updates: Partial<Demanda>) => {
      await update(id, updates);
    },
    [update],
  );

  const handleMoveTo = useCallback(
    async (demanda: Demanda, newStatus: string, justificativa?: string) => {
      return moveTo(demanda, newStatus, justificativa);
    },
    [moveTo],
  );

  if (selected) {
    return (
      <DemandaDetail
        demanda={selected}
        onBack={() => setSelected(null)}
        onUpdate={handleUpdate}
        onMoveTo={handleMoveTo}
      />
    );
  }

  return (
    <div className="flex flex-col h-full">
      {loading && (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">Carregando demandas…</div>
      )}
      <SustentacaoBoard
        demandas={demandas}
        onCreateDemanda={handleCreateDemanda}
        onSelectDemanda={handleSelectDemanda}
      />
    </div>
  );
}
