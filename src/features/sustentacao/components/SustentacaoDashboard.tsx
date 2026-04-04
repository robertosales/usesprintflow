import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemandas } from "../hooks/useDemandas";
import { useProjetos } from "../hooks/useProjetos";
import { SITUACAO_LABELS, SITUACAO_COLORS } from "../types/demanda";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { AlertTriangle, Clock, CheckCircle2, FileText, BarChart3, TrendingUp, Shield } from "lucide-react";

export function SustentacaoDashboard() {
  const { demandas, loading } = useDemandas();
  const { projetos } = useProjetos();
  const [filterProjeto, setFilterProjeto] = useState('all');
  const [filterPeriodo, setFilterPeriodo] = useState('7');

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

  const stats = useMemo(() => {
    const total = filtered.length;
    const emAndamento = filtered.filter(d => !['nova', 'aceite_final'].includes(d.situacao)).length;
    const bloqueadas = filtered.filter(d => d.situacao === 'bloqueada').length;
    const sla24x7 = filtered.filter(d => d.sla === '24x7').length;
    const concluidas = filtered.filter(d => d.situacao === 'aceite_final').length;
    const aguardando = filtered.filter(d => d.situacao === 'aguardando_retorno').length;
    const pctAndamento = total > 0 ? ((emAndamento / total) * 100).toFixed(1) : '0';

    const porSituacao = filtered.reduce((acc, d) => {
      acc[d.situacao] = (acc[d.situacao] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, emAndamento, bloqueadas, sla24x7, concluidas, aguardando, pctAndamento, porSituacao };
  }, [filtered]);

  // Alertas: demandas bloqueadas ou aguardando retorno
  const alertas = useMemo(() => {
    return filtered
      .filter(d => d.situacao === 'bloqueada' || d.situacao === 'aguardando_retorno')
      .slice(0, 5)
      .map(d => ({
        id: d.id,
        rhm: d.rhm,
        projeto: d.projeto,
        situacao: d.situacao,
        updatedAt: d.updated_at,
      }));
  }, [filtered]);

  if (loading) return <SkeletonList count={4} />;

  // Bar chart data
  const situacaoEntries = Object.entries(stats.porSituacao).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(...situacaoEntries.map(([, c]) => c), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">Visão consolidada de todas as demandas de sustentação</p>
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total de Demandas</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Em Andamento</p>
                <p className="text-3xl font-bold">{stats.emAndamento}</p>
                <p className="text-[10px] text-muted-foreground">{stats.pctAndamento}% do total</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className={stats.bloqueadas > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bloqueadas</p>
                <p className="text-3xl font-bold">{stats.bloqueadas}</p>
                {stats.bloqueadas > 0 && <p className="text-[10px] text-destructive">▲ {stats.bloqueadas} nova(s)</p>}
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${stats.bloqueadas > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
                <AlertTriangle className={`h-5 w-5 ${stats.bloqueadas > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">SLA 24x7</p>
                <p className="text-3xl font-bold">{stats.sla24x7}</p>
                {stats.total > 0 && <p className="text-[10px] text-muted-foreground">{((stats.sla24x7 / stats.total) * 100).toFixed(0)}% dentro do prazo</p>}
              </div>
              <div className="h-10 w-10 rounded-lg bg-info/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-info" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Demandas por Situação - bar chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4 text-info" />Demandas por Situação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {situacaoEntries.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma demanda</p>}
            {situacaoEntries.map(([sit, count]) => (
              <div key={sit} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{SITUACAO_LABELS[sit] || sit}</span>
                  <span className="font-medium">{count}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-info transition-all"
                    style={{ width: `${(count / maxCount) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Alertas</CardTitle>
          </CardHeader>
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
                  {isBlocked ? (
                    <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-orange-500 shrink-0" />
                  )}
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
    </div>
  );
}
