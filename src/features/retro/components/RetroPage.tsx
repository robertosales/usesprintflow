// src/features/retro/components/RetroPage.tsx
import { useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import { Card, CardContent } from "@/components/ui/card";
import { Repeat, AlertTriangle } from "lucide-react";
import { useRetroSession } from "../hooks/useRetroSession";
import { getModel } from "../utils/retroModels";
import { RetroStartScreen } from "./RetroStartScreen";
import { RetroPhaseHeader } from "./RetroPhaseHeader";
import { RetroWritingPhase } from "./RetroWritingPhase";
import { RetroRevealPhase } from "./RetroRevealPhase";
import { RetroVotingPhase } from "./RetroVotingPhase";
import { toast } from "sonner";
import type { RetroPhase } from "../types/retro";

const NEXT_PHASE: Record<RetroPhase, RetroPhase | null> = {
  writing: "reveal",
  reveal: "voting",
  voting: "closed",
  closed: null,
};

const PHASE_LABELS_SHORT: Record<RetroPhase, string> = {
  writing: "Escrita",
  reveal: "Revelação",
  voting: "Votação",
  closed: "Encerrada",
};

export function RetroPage() {
  const { user, currentTeamId, roles, isAdmin } = useAuth();
  const { activeSprint } = useSprint();

  const canStart = isAdmin || roles.includes("scrum_master") || roles.includes("product_owner");

  const {
    session,
    cards,
    votes,
    participants,
    profiles,
    loading,
    isFacilitator,
    facilitatorOffline,
    createSession,
    setPhase,
    close,
    cancel,
    addCard,
    updateCardText,
    toggleHide,
    deleteCard,
    toggleVote,
    assumeFacilitator,
    transferFacilitatorTo,
    refresh,
  } = useRetroSession({
    teamId: currentTeamId,
    sprintId: activeSprint?.id ?? null,
    userId: user?.id ?? null,
  });

  const modelLabel = useMemo(() => (session ? getModel(session.model).label : ""), [session]);

  // ─── Estados de borda ──────────────────────────────────────────────────────
  if (!activeSprint) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center space-y-2">
          <AlertTriangle className="h-10 w-10 text-warning mx-auto" />
          <p className="text-sm text-muted-foreground">Nenhuma sprint ativa. Ative uma sprint para iniciar uma retrospectiva.</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-10">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  // ─── Sem sessão → Start screen ─────────────────────────────────────────────
  if (!session) {
    return (
      <div className="space-y-4">
        <header className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Retrospectiva</h2>
        </header>
        <RetroStartScreen canStart={canStart} sprintName={activeSprint.name} onStart={createSession} />
      </div>
    );
  }

  // ─── Sessão encerrada ───────────────────────────────────────────────────────
  if (session.status !== "active") {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center space-y-2">
          <Repeat className="h-10 w-10 text-muted-foreground mx-auto" />
          <p className="text-sm text-muted-foreground">
            A sessão foi encerrada. Veja os resultados em <strong>Histórico Ágil</strong>.
          </p>
          <button onClick={refresh} className="text-xs text-primary underline">
            Atualizar
          </button>
        </CardContent>
      </Card>
    );
  }

  // ─── Handlers ───────────────────────────────────────────────────────────────
  const handleAdvance = async () => {
    const next = NEXT_PHASE[session.currentPhase];
    if (!next || next === "closed") return;
    await setPhase(next);
    toast.success(`Avançado para ${PHASE_LABELS_SHORT[next]}`);
  };

  const handleClose = async () => {
    await close();
    toast.success("Retrospectiva encerrada e arquivada no histórico");
  };

  const handleCancel = async () => {
    await cancel();
    toast.info("Sessão cancelada");
  };

  const nextPhase = NEXT_PHASE[session.currentPhase];
  const nextLabel = nextPhase && nextPhase !== "closed" ? PHASE_LABELS_SHORT[nextPhase] : null;

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Repeat className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold">Retrospectiva — {activeSprint.name}</h2>
        </div>
      </header>

      <RetroPhaseHeader
        session={session}
        participants={participants}
        profiles={profiles}
        isFacilitator={isFacilitator}
        facilitatorOffline={facilitatorOffline}
        modelLabel={modelLabel}
        onAdvance={handleAdvance}
        onClose={handleClose}
        onCancel={handleCancel}
        onAssumeFacilitator={assumeFacilitator}
        onTransfer={transferFacilitatorTo}
        nextPhaseLabel={nextLabel}
      />

      {session.currentPhase === "writing" && (
        <RetroWritingPhase
          model={session.model}
          cards={cards}
          userId={user?.id ?? ""}
          isFacilitator={isFacilitator}
          onAdd={addCard}
          onUpdate={updateCardText}
          onToggleHide={toggleHide}
          onDelete={deleteCard}
        />
      )}

      {session.currentPhase === "reveal" && <RetroRevealPhase model={session.model} cards={cards} profiles={profiles} />}

      {session.currentPhase === "voting" && (
        <RetroVotingPhase
          model={session.model}
          cards={cards}
          votes={votes}
          profiles={profiles}
          userId={user?.id ?? ""}
          onToggleVote={toggleVote}
        />
      )}
    </div>
  );
}
