/**
 * IdleWarningModal — modal de aviso de inatividade com countdown regressivo.
 *
 * Aparece 60s antes do logout automático.
 * Botões: "Continuar sessão" (reseta timer) | "Sair agora" (signOut imediato)
 */
import { useEffect, useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Timer, LogOut } from "lucide-react";
import { WARNING_BEFORE_MS } from "@/hooks/useIdleTimeout";

const WARNING_SECONDS = Math.floor(WARNING_BEFORE_MS / 1000); // 60

interface IdleWarningModalProps {
  open: boolean;
  onContinue: () => void;
  onSignOut: () => void;
}

export function IdleWarningModal({ open, onContinue, onSignOut }: IdleWarningModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(WARNING_SECONDS);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reinicia o countdown toda vez que o modal abre
  useEffect(() => {
    if (!open) {
      setSecondsLeft(WARNING_SECONDS);
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    setSecondsLeft(WARNING_SECONDS);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [open]);

  // Formata MM:SS
  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");
  const countdown = `${mm}:${ss}`;

  // Cor do countdown: verde > amarelo > vermelho
  const countdownColor =
    secondsLeft > 30
      ? "text-emerald-400"
      : secondsLeft > 10
      ? "text-amber-400"
      : "text-red-400";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onContinue(); }}>
      <DialogContent
        className="max-w-sm text-center"
        // Impede fechar clicando fora
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="items-center gap-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-full bg-amber-500/15 border border-amber-500/30">
            <Timer className="h-6 w-6 text-amber-400" />
          </div>
          <DialogTitle className="text-base">Sessão prestes a expirar</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            Você ficou inativo por alguns minutos.
            <br />
            Sua sessão será encerrada automaticamente em:
          </DialogDescription>
        </DialogHeader>

        {/* Countdown central */}
        <div className="py-2">
          <span className={`text-5xl font-mono font-bold tabular-nums tracking-tight ${countdownColor}`}>
            {countdown}
          </span>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onSignOut}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sair agora
          </Button>
          <Button
            className="flex-1"
            onClick={onContinue}
          >
            Continuar sessão
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
