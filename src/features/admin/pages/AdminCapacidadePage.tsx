import { useAuth } from "@/contexts/AuthContext";
import { useCapacityPlanner } from "../hooks/useCapacityPlanner";
import { CapacityGrid } from "../components/CapacityGrid";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge }   from "@/components/ui/badge";
import { Button }  from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, RefreshCw, HelpCircle } from "lucide-react";

export function AdminCapacidadePage() {
  const { teams } = useAuth();
  const agileTeams = teams.filter(t => t.module === "sala_agil");
  const {
    teamCapacities,
    overloadedDevs,
    unknownStatusDevs,
    loading,
    error,
    selectedTeam,
    setSelectedTeam,
    reload,
  } = useCapacityPlanner();

  const totalDevs     = teamCapacities.reduce((s, t) => s + t.devs.length, 0);
  const totalCapHrs   = teamCapacities.reduce((s, t) => s + t.totalCapacity,  0);
  const totalAllocHrs = teamCapacities.reduce((s, t) => s + t.totalAllocated, 0);
  const globalPct     = totalCapHrs > 0 ? Math.round((totalAllocHrs / totalCapHrs) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-base font-semibold">Painel de Capacidade</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {loading ? "Carregando..." : (
              <>{totalDevs} desenvolvedor{totalDevs !== 1 ? "es" : ""} · {totalAllocHrs}h / {totalCapHrs}h alocadas ({globalPct}%){" "}
              {overloadedDevs.length > 0 && (
                <Badge variant="destructive" className="text-[10px] ml-1 gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {overloadedDevs.length} sobrecarregado{overloadedDevs.length !== 1 ? "s" : ""}
                </Badge>
              )}
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue placeholder="Todos os times" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">Todos os times</SelectItem>
              {agileTeams.map(t => <SelectItem key={t.id} value={t.id} className="text-xs">{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={reload} title="Atualizar">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Alerta de erro */}
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      {/* Alerta: devs com HUs sem estimativa (unknownStatusDevs) */}
      {!loading && unknownStatusDevs.length > 0 && (
        <div className="rounded-lg border border-yellow-400/40 bg-yellow-50/5 px-4 py-3 flex items-start gap-2">
          <HelpCircle className="h-4 w-4 text-yellow-500 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
              {unknownStatusDevs.length} desenvolvedor{unknownStatusDevs.length !== 1 ? "es" : ""} com capacidade não calculável
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Todas as HUs atribuídas estão sem estimativa de horas. A utilização real pode ser maior do que o exibido.
            </p>
            <ul className="mt-1 space-y-0.5">
              {unknownStatusDevs.map(d => (
                <li key={d.devId} className="text-xs text-muted-foreground">
                  · <span className="font-medium">{d.devName}</span> ({d.unestimatedCount} HU{d.unestimatedCount !== 1 ? "s" : ""} sem estimativa)
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Alertas de sobrecarga */}
      {!loading && overloadedDevs.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-destructive">
              {overloadedDevs.length} desenvolvedor{overloadedDevs.length !== 1 ? "es" : ""} sobrecarregado{overloadedDevs.length !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Desenvolvedores com alocação acima de 100% da capacidade disponível.
            </p>
          </div>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : (
        <CapacityGrid teamCapacities={teamCapacities} />
      )}
    </div>
  );
}
