/**
 * useSessionTimeout — detecta inatividade e sinaliza para encerrar sessão.
 * - warningAt: ms de inatividade para mostrar alerta (padrão: 4 min)
 * - logoutAt:  ms de inatividade para logout (padrão: 5 min)
 * Eventos monitorados: mousemove, keydown, mousedown, scroll, touchstart
 */
import { useEffect, useRef, useState, useCallback } from "react";

const DEFAULT_WARNING_MS = 4 * 60 * 1000; // 4 min
const DEFAULT_LOGOUT_MS = 5 * 60 * 1000;  // 5 min

interface Options {
  warningMs?: number;
  logoutMs?: number;
  onLogout: () => void;
  enabled?: boolean;
}

export function useSessionTimeout({
  warningMs = DEFAULT_WARNING_MS,
  logoutMs = DEFAULT_LOGOUT_MS,
  onLogout,
  enabled = true,
}: Options) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(60);
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAll = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current);
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    if (countdownInterval.current) clearInterval(countdownInterval.current);
  }, []);

  const startCountdown = useCallback(() => {
    const totalSeconds = Math.round((logoutMs - warningMs) / 1000);
    setSecondsLeft(totalSeconds);
    countdownInterval.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (countdownInterval.current) clearInterval(countdownInterval.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }, [logoutMs, warningMs]);

  const reset = useCallback(() => {
    if (!enabled) return;
    clearAll();
    setShowWarning(false);
    setSecondsLeft(Math.round((logoutMs - warningMs) / 1000));

    warningTimer.current = setTimeout(() => {
      setShowWarning(true);
      startCountdown();
      logoutTimer.current = setTimeout(() => {
        onLogout();
      }, logoutMs - warningMs);
    }, warningMs);
  }, [enabled, clearAll, warningMs, logoutMs, onLogout, startCountdown]);

  /** Usuário clicou "Continuar" — reseta tudo */
  const continueSession = useCallback(() => {
    reset();
  }, [reset]);

  useEffect(() => {
    if (!enabled) return;
    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"];
    const handler = () => reset();
    events.forEach((e) => window.addEventListener(e, handler, { passive: true }));
    reset();
    return () => {
      clearAll();
      events.forEach((e) => window.removeEventListener(e, handler));
    };
  }, [enabled, reset, clearAll]);

  return { showWarning, secondsLeft, continueSession };
}
