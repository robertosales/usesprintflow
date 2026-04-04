import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useDemandas } from "../hooks/useDemandas";
import { SITUACAO_LABELS, SITUACAO_COLORS } from "../types/demanda";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { AlertTriangle, Clock, CheckCircle2, FileText, BarChart3 } from "lucide-react";

export function SustentacaoDashboard() {
  const { demandas, loading } = useDemandas();

  const stats = useMemo(() => {
    const total = demandas.length;
    const bloqueadas = demandas.filter(d => d.situacao === 'bloqueada').length;
    const aguardando = demandas.filter(d => d.situacao === 'aguardando_retorno').length;
    const producao = demandas.filter(d => d.situacao === 'producao').length;
    const concluidas = demandas.filter(d => d.situacao === 'aceite_final').length;
    const sla24x7 = demandas.filter(d => d.sla === '24x7').length;

    const porProjeto = demandas.reduce((acc, d) => {
      acc[d.projeto || 'Sem projeto'] = (acc[d.projeto || 'Sem projeto'] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const porSituacao = demandas.reduce((acc, d) => {
      acc[d.situacao] = (acc[d.situacao] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, bloqueadas, aguardando, producao, concluidas, sla24x7, porProjeto, porSituacao };
  }, [demandas]);

  if (loading) return <SkeletonList count={4} />;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Dashboard Sustentação</h2>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Demandas</p>
          </CardContent>
        </Card>
        <Card className={stats.bloqueadas > 0 ? 'border-destructive/50' : ''}>
          <CardContent className="p-4 text-center">
            <AlertTriangle className={`h-5 w-5 mx-auto mb-1 ${stats.bloqueadas > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            <p className="text-2xl font-bold">{stats.bloqueadas}</p>
            <p className="text-xs text-muted-foreground">Bloqueadas</p>
          </CardContent>
        </Card>
        <Card className={stats.aguardando > 0 ? 'border-orange-400/50' : ''}>
          <CardContent className="p-4 text-center">
            <Clock className={`h-5 w-5 mx-auto mb-1 ${stats.aguardando > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
            <p className="text-2xl font-bold">{stats.aguardando}</p>
            <p className="text-xs text-muted-foreground">Aguardando Retorno</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <p className="text-2xl font-bold">{stats.concluidas}</p>
            <p className="text-xs text-muted-foreground">Concluídas</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Por Situação */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><BarChart3 className="h-4 w-4" />Por Situação</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.porSituacao).sort((a, b) => b[1] - a[1]).map(([sit, count]) => (
              <div key={sit} className="flex items-center justify-between">
                <Badge className={`text-[10px] ${SITUACAO_COLORS[sit] || ''}`}>{SITUACAO_LABELS[sit] || sit}</Badge>
                <span className="text-sm font-medium">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Por Projeto */}
        <Card>
          <CardHeader><CardTitle className="text-sm flex items-center gap-2"><FileText className="h-4 w-4" />Por Projeto</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(stats.porProjeto).sort((a, b) => b[1] - a[1]).map(([proj, count]) => (
              <div key={proj} className="flex items-center justify-between">
                <span className="text-sm truncate">{proj}</span>
                <Badge variant="secondary" className="text-[10px]">{count}</Badge>
              </div>
            ))}
            {Object.keys(stats.porProjeto).length === 0 && <p className="text-sm text-muted-foreground">Nenhum projeto</p>}
          </CardContent>
        </Card>
      </div>

      {/* SLA alert */}
      {stats.sla24x7 > 0 && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <p className="text-sm"><strong>{stats.sla24x7}</strong> demanda(s) com SLA 24x7 ativas</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
