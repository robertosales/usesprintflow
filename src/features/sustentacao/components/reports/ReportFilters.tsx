import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

interface ReportFiltersProps {
  periodo: string;
  setPeriodo: (v: string) => void;
  equipe?: string;
  setEquipe?: (v: string) => void;
  analista?: string;
  setAnalista?: (v: string) => void;
  analistas?: Array<{ user_id: string; display_name: string }>;
  showAnalista?: boolean;
  teamId?: string;
  setTeamId?: (v: string) => void;
}

export function ReportFilters({ periodo, setPeriodo, analista, setAnalista, analistas, showAnalista = true, teamId, setTeamId }: ReportFiltersProps) {
  const { teams } = useAuth();
  const sustTeams = teams.filter(t => t.module === 'sustentacao');

  return (
    <div className="flex flex-wrap gap-2">
      {setTeamId && (
        <Select value={teamId || 'all'} onValueChange={setTeamId}>
          <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue placeholder="Time" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {sustTeams.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
      <Select value={periodo} onValueChange={setPeriodo}>
        <SelectTrigger className="w-[150px] h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="7">Últimos 7 dias</SelectItem>
          <SelectItem value="30">Últimos 30 dias</SelectItem>
          <SelectItem value="90">Últimos 90 dias</SelectItem>
          <SelectItem value="all">Todos</SelectItem>
        </SelectContent>
      </Select>
      {showAnalista && analistas && setAnalista && (
        <Select value={analista || 'all'} onValueChange={setAnalista}>
          <SelectTrigger className="w-[180px] h-8 text-xs"><SelectValue placeholder="Todos analistas" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos analistas</SelectItem>
            {analistas.map(a => <SelectItem key={a.user_id} value={a.user_id}>{a.display_name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    </div>
  );
}
