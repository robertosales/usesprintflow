import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  isFacilitator: boolean;
  className?: string;
}

export function CountdownTimer({ isFacilitator, className }: CountdownTimerProps) {
  const [totalSeconds, setTotalSeconds] = useState(300); // 5 min default
  const [remaining, setRemaining] = useState(300);
  const [running, setRunning] = useState(false);
  const [editMinutes, setEditMinutes] = useState("5");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (running && remaining > 0) {
      intervalRef.current = setInterval(() => {
        setRemaining(prev => {
          if (prev <= 1) {
            setRunning(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, remaining]);

  const toggle = useCallback(() => {
    if (remaining === 0) return;
    setRunning(prev => !prev);
  }, [remaining]);

  const reset = useCallback(() => {
    setRunning(false);
    setRemaining(totalSeconds);
  }, [totalSeconds]);

  const applyMinutes = useCallback(() => {
    const mins = Math.max(1, Math.min(60, parseInt(editMinutes) || 5));
    const secs = mins * 60;
    setTotalSeconds(secs);
    setRemaining(secs);
    setRunning(false);
    setEditMinutes(String(mins));
  }, [editMinutes]);

  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const pct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 0;
  const isLow = remaining <= 30 && remaining > 0;
  const isExpired = remaining === 0;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative">
        <Badge
          variant="outline"
          className={cn(
            "font-mono text-sm px-3 py-1 tabular-nums transition-colors",
            isExpired && "bg-destructive/15 text-destructive border-destructive/30 animate-pulse",
            isLow && !isExpired && "bg-warning/15 text-warning border-warning/30",
            !isLow && !isExpired && "bg-muted"
          )}
        >
          <Timer className="h-3.5 w-3.5 mr-1.5" />
          {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
        </Badge>
        {running && (
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-primary rounded-full transition-all duration-1000"
            style={{ width: `${pct}%` }}
          />
        )}
      </div>

      {isFacilitator && (
        <>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={toggle} title={running ? "Pausar" : "Iniciar"}>
            {running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={reset} title="Resetar">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
          {!running && (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                max={60}
                value={editMinutes}
                onChange={e => setEditMinutes(e.target.value)}
                onBlur={applyMinutes}
                onKeyDown={e => { if (e.key === "Enter") applyMinutes(); }}
                className="h-7 w-14 text-xs text-center"
              />
              <span className="text-[10px] text-muted-foreground">min</span>
            </div>
          )}
        </>
      )}

      {isExpired && <span className="text-xs text-destructive font-medium animate-pulse">⏰ Tempo esgotado!</span>}
    </div>
  );
}
