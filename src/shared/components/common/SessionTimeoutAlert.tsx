/**
 * SessionTimeoutAlert — alerta flutuante de encerramento de sessão por inatividade.
 * Posicionado no canto inferior direito. Aparece após 4 min de inatividade.
 * Encerra a sessão após 5 min (60s de countdown visível).
 */
import { useAuth } from "@/contexts/AuthContext";
import { useSessionTimeout } from "@/shared/hooks/useSessionTimeout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { LogOut, RefreshCw } from "lucide-react";

export function SessionTimeoutAlert() {
  const { signOut, session } = useAuth();

  const { showWarning, secondsLeft, continueSession } = useSessionTimeout({
    warningMs: 4 * 60 * 1000,
    logoutMs: 5 * 60 * 1000,
    enabled: !!session,
    onLogout: () => {
      signOut();
    },
  });

  if (!showWarning || !session) return null;

  const totalSeconds = 60;
  const progress = Math.round((secondsLeft / totalSeconds) * 100);
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="fixed bottom-5 right-5 z-[9999] w-[340px] rounded-xl border bg-card shadow-2xl p-4 space-y-3 animate-in slide-in-from-bottom-4 duration-300">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100">
          <LogOut className="h-4 w-4 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Sessão por inatividade</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Sua sessão será encerrada por inatividade em{" "}
            <span className="font-mono font-bold text-amber-600">
              {mm}:{ss}
            </span>
          </p>
        </div>
      </div>

      <Progress value={progress} className="h-1.5 [&>div]:bg-amber-500" />

      <Button
        size="sm"
        className="w-full gap-2 bg-primary hover:bg-primary/90"
        onClick={continueSession}
      >
        <RefreshCw className="h-4 w-4" />
        Continuar sessão
      </Button>
    </div>
  );
}
