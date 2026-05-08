/**
 * IdleSessionGuard — componente orquestrador do auto-logout por inatividade.
 *
 * Monta useIdleTimeout + IdleWarningModal.
 * Deve ser renderizado UMA vez dentro do layout autenticado (App.tsx).
 *
 * Ao fazer logout por inatividade, redireciona para:
 *   /login?reason=idle_timeout
 * A tela de login pode ler esse param e exibir mensagem informativa.
 */
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useIdleTimeout } from "@/hooks/useIdleTimeout";
import { IdleWarningModal } from "./IdleWarningModal";

export function IdleSessionGuard() {
  const { signOut, session } = useAuth();
  const navigate = useNavigate();
  const [warningOpen, setWarningOpen] = useState(false);

  const handleWarn = useCallback(() => {
    setWarningOpen(true);
  }, []);

  const handleIdle = useCallback(async () => {
    setWarningOpen(false);
    await signOut();
    navigate("/login?reason=idle_timeout", { replace: true });
  }, [signOut, navigate]);

  const handleReset = useCallback(() => {
    setWarningOpen(false);
  }, []);

  const { resetTimer } = useIdleTimeout({
    onWarn:  handleWarn,
    onIdle:  handleIdle,
    onReset: handleReset,
    enabled: !!session, // só ativo quando há sessão
  });

  const handleContinue = useCallback(() => {
    setWarningOpen(false);
    resetTimer();
  }, [resetTimer]);

  return (
    <IdleWarningModal
      open={warningOpen}
      onContinue={handleContinue}
      onSignOut={async () => {
        setWarningOpen(false);
        await signOut();
        navigate("/login?reason=idle_timeout", { replace: true });
      }}
    />
  );
}
