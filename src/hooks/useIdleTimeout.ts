/**
 * useIdleTimeout — detecta inatividade do usuário e dispara callbacks.
 *
 * Monitora: mousemove, mousedown, keydown, touchstart, scroll, click
 * Fluxo:
 *   0 ──────────── 4min (IDLE_TIMEOUT - WARNING_BEFORE) ──── onWarn ──── 5min ──── onIdle
 *
 * Uso:
 *   useIdleTimeout({ onWarn, onIdle, onReset })
 */
import { useEffect, useRef, useCallback } from "react";

const IDLE_TIMEOUT_MS   = 5 * 60 * 1000; // 5 minutos
const WARNING_BEFORE_MS = 1 * 60 * 1000; // aviso 60s antes = aos 4min

const ACTIVITY_EVENTS = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "click",
] as const;

interface UseIdleTimeoutOptions {
  /** Chamado quando falta WARNING_BEFORE_MS para o timeout (aviso ao usuário) */
  onWarn: () => void;
  /** Chamado quando o timeout completo é atingido (executar signOut) */
  onIdle: () => void;
  /** Chamado quando usuário retoma atividade enquanto aviso está visível */
  onReset: () => void;
  /** Se false, o hook fica inativo (ex: usuário não logado) */
  enabled?: boolean;
}

export function useIdleTimeout({
  onWarn,
  onIdle,
  onReset,
  enabled = true,
}: UseIdleTimeoutOptions) {
  const warnTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningActiveRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (warnTimerRef.current)  clearTimeout(warnTimerRef.current);
    if (idleTimerRef.current)  clearTimeout(idleTimerRef.current);
    warnTimerRef.current = null;
    idleTimerRef.current = null;
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    warnTimerRef.current = setTimeout(() => {
      warningActiveRef.current = true;
      onWarn();
      idleTimerRef.current = setTimeout(() => {
        onIdle();
      }, WARNING_BEFORE_MS);
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS);
  }, [clearTimers, onWarn, onIdle]);

  const handleActivity = useCallback(() => {
    if (!enabled) return;
    if (warningActiveRef.current) {
      // Usuário voltou enquanto aviso estava visível
      warningActiveRef.current = false;
      onReset();
    }
    startTimers();
  }, [enabled, onReset, startTimers]);

  useEffect(() => {
    if (!enabled) return;

    // Inicia os timers imediatamente ao montar
    startTimers();

    ACTIVITY_EVENTS.forEach((evt) =>
      window.addEventListener(evt, handleActivity, { passive: true }),
    );

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((evt) =>
        window.removeEventListener(evt, handleActivity),
      );
    };
  }, [enabled, handleActivity, startTimers, clearTimers]);

  /** Permite resetar manualmente (ex: botão "Continuar" no modal) */
  const resetTimer = useCallback(() => {
    warningActiveRef.current = false;
    startTimers();
  }, [startTimers]);

  return { resetTimer };
}

export { IDLE_TIMEOUT_MS, WARNING_BEFORE_MS };
