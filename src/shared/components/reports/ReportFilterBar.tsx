import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Filter, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export interface FilterAnalista {
  user_id: string;
  display_name: string;
}

export interface ReportFilterBarProps {
  /** Período rápido: "7" | "30" | "90" | "all" */
  periodo: string;
  setPeriodo: (v: string) => void;
  /** Data range livre — quando informadas, ativam inputs de data */
  dataInicio?: string;
  setDataInicio?: (v: string) => void;
  dataFim?: string;
  setDataFim?: (v: string) => void;
  /** Filtro de analista */
  analista?: string;
  setAnalista?: (v: string) => void;
  analistas?: FilterAnalista[];
  showAnalista?: boolean;
  /** Filtro de time — se omitido, não aparece */
  teamId?: string;
  setTeamId?: (v: string) => void;
  /** Módulo para filtrar os times disponíveis */
  modulo?: "sustentacao" | "sala_agil";
  /** Total de registros após filtro — exibido como badge */
  totalFiltrado?: number;
  /** Callback para limpar todos os filtros */
  onClear?: () => void;
}

function today() { return new Date().toISOString().split("T")[0]; }
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

export function ReportFilterBar({
  periodo, setPeriodo,
  dataInicio, setDataInicio,
  dataFim, setDataFim,
  analista, setAnalista, analistas, showAnalista = true,
  teamId, setTeamId, modulo = "sustentacao",
  totalFiltrado,
  onClear,
}: ReportFilterBarProps) {
  const { teams } = useAuth();
  const moduleTeams = teams.filter((t) => t.module === modulo);
  const useDateRange = !!setDataInicio && !!setDataFim;

  const hasActiveFilters =
    periodo !== "all" ||
    (analista && analista !== "all") ||
    (teamId && teamId !== "all");

  return (
    <div className="rounded-xl border border-border bg-muted/30 px-4 py-3 space-y-3 print:hidden">
      {/* Linha de título do bloco */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Filtros</span>
          {totalFiltrado !== undefined && (
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {totalFiltrado} registro{totalFiltrado !== 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        {onClear && hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
            onClick={onClear}
          >
            <X className="h-3 w-3" /> Limpar
          </Button>
        )}
      </div>

      {/* Controles */}
      <div className="flex flex-wrap gap-3 items-end">

        {/* Período legado */}
        {!useDateRange && (
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Período</Label>
            <Select value={periodo} onValueChange={setPeriodo}>
              <SelectTrigger className="w-[160px] h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Últimos 7 dias</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="all">Todos os períodos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date range */}
        {useDateRange && (
          <>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Data Início</Label>
              <Input
                type="date"
                value={dataInicio || ""}
                onChange={(e) => setDataInicio!(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Data Fim</Label>
              <Input
                type="date"
                value={dataFim || ""}
                onChange={(e) => setDataFim!(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
            </div>
            {/* Atalhos rápidos */}
            <div className="flex gap-1 items-end pb-0.5">
              {([7, 30, 90] as const).map((days) => (
                <Button
                  key={days}
                  size="sm"
                  variant={periodo === String(days) ? "default" : "outline"}
                  className="h-8 text-xs px-2.5"
                  onClick={() => {
                    setDataInicio!(daysAgo(days));
                    setDataFim!(today());
                    setPeriodo(String(days));
                  }}
                >
                  {days}d
                </Button>
              ))}
            </div>
          </>
        )}

        {/* Filtro de Time */}
        {setTeamId && (
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Time</Label>
            <Select value={teamId || "all"} onValueChange={setTeamId}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Todos os times" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os times</SelectItem>
                {moduleTeams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Filtro de Analista */}
        {showAnalista && analistas && setAnalista && (
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold uppercase text-muted-foreground">Analista</Label>
            <Select value={analista || "all"} onValueChange={setAnalista}>
              <SelectTrigger className="w-[200px] h-8 text-xs">
                <SelectValue placeholder="Todos os analistas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os analistas</SelectItem>
                {analistas.map((a) => (
                  <SelectItem key={a.user_id} value={a.user_id}>{a.display_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}
