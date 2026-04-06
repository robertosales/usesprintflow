import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemandas } from "../hooks/useDemandas";
import { useProjetos } from "../hooks/useProjetos";
import { useAllTransitions, useProfiles } from "../hooks/useAllTransitions";
import { SITUACAO_LABELS } from "../types/demanda";
import { calcAtendimento, calcTempos, calcSLA, formatHours } from "../utils/kpiCalculations";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { ImrDashboard } from "./ImrDashboard";
import { AlertTriangle, Clock, CheckCircle2, FileText, BarChart3, TrendingUp, Shield, Timer, Zap, Target, Activity } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function SustentacaoDashboard() {
  const { demandas, loading } = useDemandas();
  const { projetos } = useProjetos();
  const { transitions } = useAllTransitions();
  const profiles = useProfiles();
  const [filterProjeto, setFilterProjeto] = useState('all');
  const [filterPeriodo, setFilterPeriodo] = useState('30');

  const filtered = useMemo(() => {
    let items = demandas;
    if (filterProjeto !== 'all') items = items.filter(d => d.projeto === filterProjeto);
    if (filterPeriodo !== 'all') {
      const days = parseInt(filterPeriodo);
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      items = items.filter(d => new Date(d.created_at) >= cutoff);
    }
    return items;
  }, [demandas, filterProjeto, filterPeriodo]);

  const atendimento = useMemo(() => calcAtendimento(filtered), [filtered]);
  const tempos = useMemo(() => calcTempos(filtered, transitions), [filtered, transitions]);
  const sla = useMemo(() => calcSLA(filtered, transitions), [filtered, transitions]);

  const porSituacao = useMemo(() => {
    const acc: Record<string, number> = {};
    filtered.forEach(d => { acc[d.situacao] = (acc[d.situacao] || 0) + 1; });
    return Object.entries(acc).sort((a, b) => b[1] - a[1]);
  }, [filtered]);

  const alertas = useMemo(() => {
    return filtered
      .filter(d => d.situacao === 'bloqueada' || d.situacao === 'aguardando_retorno')
      .slice(0, 5)
      .map(d => ({ id: d.id, rhm: d.rhm, projeto: d.projeto, situacao: d.situacao, updatedAt: d.updated_at }));
  }, [filtered]);

  if (loading) return <SkeletonList count={4} />;

  const maxCount = Math.max(...porSituacao.map(([, c]) => c), 1);

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Dashboard Sustentação</h2>
          <p className="text-sm text-muted-foreground">Visão consolidada de KPIs e alertas</p>
        </div>
        <div className="flex gap-2">
          <Select value={filterProjeto} onValueChange={setFilterProjeto}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="Todos os Projetos" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Projetos</SelectItem>
              {projetos.map(p => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
            <SelectTrigger className="w-[150px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todos</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs: Atendimento e Volume */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Atendimento e Volume</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={FileText} label="Chamados Ativos" value={atendimento.total} color="info" />
          <KPICard icon={Zap} label="Abertos Hoje" value={atendimento.abertosHoje} color="info" />
          <KPICard icon={CheckCircle2} label="Resolvidos Hoje" value={atendimento.resolvidosHoje} color="info" />
          <KPICard icon={Activity} label={`Backlog (>${atendimento.backlogDays}d)`} value={atendimento.backlog} color={atendimento.backlog > 0 ? "destructive" : "muted"} />
        </div>
      </div>

      {/* KPIs: Tempo */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tempos Médios</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={Timer} label="TMR (Resposta)" value={formatHours(tempos.tmr)} sub={`${tempos.tmrCount} chamados`} color="info" />
          <KPICard icon={Clock} label="MTTR (Resolução)" value={formatHours(tempos.mttr)} sub={`${tempos.mttrCount} resolvidos`} color={tempos.mttr > 4 ? "destructive" : "info"} />
          <KPICard icon={TrendingUp} label="TMA (Atendimento)" value={formatHours(tempos.tma)} color="info" />
          <KPICard icon={Target} label="MTTA (Reconhec.)" value={formatHours(tempos.mtta)} sub={`${tempos.mttaCount} chamados`} color="info" />
        </div>
      </div>

      {/* KPIs: SLA */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">SLA</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <KPICard icon={Shield} label="SLA Compliance" value={sla.total === 0 ? "N/A" : `${sla.compliance.toFixed(1)}%`} color={sla.total === 0 ? "muted" : sla.compliance >= 95 ? "info" : "destructive"} sub={sla.total === 0 ? "Sem demandas" : "Meta: ≥ 95%"} />
          <KPICard icon={AlertTriangle} label="Em Risco" value={sla.emRisco} color={sla.emRisco > 0 ? "destructive" : "muted"} sub="< 2h restantes" />
          <KPICard icon={AlertTriangle} label="SLA Violado" value={sla.violados} color={sla.violados > 0 ? "destructive" : "muted"} />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-info" />Demandas por Situação</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {porSituacao.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma demanda</p>}
            {porSituacao.map(([sit, count]) => (
              <div key={sit} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{SITUACAO_LABELS[sit] || sit}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full bg-info transition-all" style={{ width: `${(count / maxCount) * 100}%` }} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Alertas</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {alertas.length === 0 && (
              <div className="text-center py-4">
                <CheckCircle2 className="h-8 w-8 text-info mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>
              </div>
            )}
            {alertas.map(a => {
              const isBlocked = a.situacao === 'bloqueada';
              const hoursAgo = Math.round((Date.now() - new Date(a.updatedAt).getTime()) / (1000 * 60 * 60));
              return (
                <div key={a.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${isBlocked ? 'border-destructive/30 bg-destructive/5' : 'border-orange-400/30 bg-orange-50'}`}>
                  {isBlocked ? <AlertTriangle className="h-4 w-4 text-destructive shrink-0" /> : <Clock className="h-4 w-4 text-orange-500 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{a.rhm}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {isBlocked ? `Bloqueada há ${hoursAgo}h` : `Aguardando retorno há ${hoursAgo}h`} · {a.projeto}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* IMR Grupo 2 Section */}
      <Separator />
      <ImrDashboard />
    </div>
  );
}

function KPICard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string | number; sub?: string; color: string }) {
  const colorMap: Record<string, string> = {
    info: 'bg-info/10 text-info',
    destructive: 'bg-destructive/10 text-destructive',
    muted: 'bg-muted text-muted-foreground',
  };
  const borderMap: Record<string, string> = { destructive: 'border-destructive/30' };
  return (
    <Card className={borderMap[color] || ''}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold mt-1">{value}</p>
            {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${colorMap[color] || colorMap.muted}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
