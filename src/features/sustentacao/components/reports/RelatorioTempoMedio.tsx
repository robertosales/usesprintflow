import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDemandas } from "../../hooks/useDemandas";
import { useAllTransitions, useProfiles } from "../../hooks/useAllTransitions";
import { calcTempos, formatHours } from "../../utils/kpiCalculations";
import { ReportFilters } from "./ReportFilters";
import { ReportHeader, ReportLegend } from "./ReportHeader";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { Clock, Timer, TrendingUp, Target } from "lucide-react";
import type { Demanda, DemandaTransition } from "../../types/demanda";

const META_MTTR = 4; // horas
const META_TMR = 1; // hora

export function RelatorioTempoMedio() {
  const { demandas } = useDemandas();
  const { transitions } = useAllTransitions();
  const profiles = useProfiles();
  const [periodo, setPeriodo] = useState('30');
  const [analista, setAnalista] = useState('all');

  const filtered = useMemo(() => {
    let items = demandas;
    if (periodo !== 'all') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - parseInt(periodo));
      items = items.filter(d => new Date(d.created_at) >= cutoff);
    }
    if (analista !== 'all') items = items.filter(d => d.responsavel_dev === analista);
    return items;
  }, [demandas, periodo, analista]);

  const tempos = useMemo(() => calcTempos(filtered, transitions), [filtered, transitions]);

  const analistaStats = useMemo(() => {
    const devIds = [...new Set(filtered.map(d => d.responsavel_dev).filter(Boolean))] as string[];
    return devIds.map(uid => {
      const devDemandas = filtered.filter(d => d.responsavel_dev === uid);
      const t = calcTempos(devDemandas, transitions);
      const p = profiles.find(pr => pr.user_id === uid);
      const acimaMeta = devDemandas.filter(d => {
        if (d.situacao !== 'aceite_final') return false;
        const trans = transitions.filter(tr => tr.demanda_id === d.id && tr.to_status === 'aceite_final');
        if (trans.length === 0) return false;
        const hrs = (new Date(trans[0].created_at).getTime() - new Date(d.created_at).getTime()) / (1000 * 60 * 60);
        return hrs > META_MTTR;
      }).length;
      return {
        nome: p?.display_name || uid.slice(0, 8),
        total: devDemandas.length,
        tmr: t.tmr, mttr: t.mttr, tma: t.tma, mtta: t.mtta,
        acimaMeta,
        pctAcima: devDemandas.length > 0 ? ((acimaMeta / devDemandas.length) * 100).toFixed(1) : '0',
      };
    }).sort((a, b) => b.total - a.total);
  }, [filtered, transitions, profiles]);

  const analistas = useMemo(() => {
    const ids = [...new Set(demandas.map(d => d.responsavel_dev).filter(Boolean))] as string[];
    return ids.map(id => {
      const p = profiles.find(pr => pr.user_id === id);
      return { user_id: id, display_name: p?.display_name || id.slice(0, 8) };
    });
  }, [demandas, profiles]);

  // Totals row
  const totals = useMemo(() => {
    if (analistaStats.length === 0) return null;
    const totalDemandas = analistaStats.reduce((s, a) => s + a.total, 0);
    const totalAcima = analistaStats.reduce((s, a) => s + a.acimaMeta, 0);
    return { total: totalDemandas, acimaMeta: totalAcima, pctAcima: totalDemandas > 0 ? ((totalAcima / totalDemandas) * 100).toFixed(1) : '0' };
  }, [analistaStats]);

  const getExportData = () => ({
    title: 'Relatorio_Tempo_Medio',
    headers: ['Analista', 'Total Chamados', 'TMR', 'MTTR', 'TMA', 'MTTA', 'Acima Meta', '% Acima'],
    rows: analistaStats.map(a => [a.nome, a.total, formatHours(a.tmr), formatHours(a.mttr), formatHours(a.tma), formatHours(a.mtta), a.acimaMeta, `${a.pctAcima}%`]),
  });

  const statusColor = (val: number, meta: number) =>
    val <= meta ? 'text-emerald-600' : val <= meta * 1.5 ? 'text-orange-500' : 'text-destructive';

  return (
    <div className="space-y-5">
      <ReportHeader tipoRelatorio="Relatório — Tempo Médio" periodo={periodo} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Tempo Médio de Atendimento</h2>
          <p className="text-sm text-muted-foreground">MTTR / TMA / TMR / MTTA por período e analista</p>
        </div>
        <div className="flex items-center gap-2">
          <ReportFilters periodo={periodo} setPeriodo={setPeriodo} analista={analista} setAnalista={setAnalista} analistas={analistas} />
          <ExportButton getData={getExportData} />
        </div>
      </div>

      {/* KPIs with metas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniKPI icon={Timer} label="TMR" value={formatHours(tempos.tmr)} meta={`Meta: < ${META_TMR}h`} status={statusColor(tempos.tmr, META_TMR)} />
        <MiniKPI icon={Clock} label="MTTR" value={formatHours(tempos.mttr)} meta={`Meta: < ${META_MTTR}h`} status={statusColor(tempos.mttr, META_MTTR)} />
        <MiniKPI icon={TrendingUp} label="TMA" value={formatHours(tempos.tma)} meta={`Meta: < ${META_MTTR}h`} status={statusColor(tempos.tma, META_MTTR)} />
        <MiniKPI icon={Target} label="MTTA" value={formatHours(tempos.mtta)} meta={`Meta: < ${META_TMR}h`} status={statusColor(tempos.mtta, META_TMR)} />
      </div>

      {/* Analyst table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Detalhamento por Analista</CardTitle></CardHeader>
        <CardContent>
          {analistaStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado disponível para o filtro selecionado</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Analista</TableHead>
                    <TableHead className="text-right font-semibold">Total</TableHead>
                    <TableHead className="text-right font-semibold">TMR</TableHead>
                    <TableHead className="text-right font-semibold">MTTR</TableHead>
                    <TableHead className="text-right font-semibold">TMA</TableHead>
                    <TableHead className="text-right font-semibold">MTTA</TableHead>
                    <TableHead className="text-right font-semibold">Acima Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analistaStats.map(a => (
                    <TableRow key={a.nome}>
                      <TableCell className="font-medium text-xs">{a.nome}</TableCell>
                      <TableCell className="text-right text-xs">{a.total}</TableCell>
                      <TableCell className={`text-right text-xs font-medium ${statusColor(a.tmr, META_TMR)}`}>{formatHours(a.tmr)}</TableCell>
                      <TableCell className={`text-right text-xs font-medium ${statusColor(a.mttr, META_MTTR)}`}>{formatHours(a.mttr)}</TableCell>
                      <TableCell className={`text-right text-xs font-medium ${statusColor(a.tma, META_MTTR)}`}>{formatHours(a.tma)}</TableCell>
                      <TableCell className={`text-right text-xs font-medium ${statusColor(a.mtta, META_TMR)}`}>{formatHours(a.mtta)}</TableCell>
                      <TableCell className="text-right text-xs">
                        {a.acimaMeta > 0 ? <Badge variant="destructive" className="text-[10px]">{a.acimaMeta} ({a.pctAcima}%)</Badge> : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  {totals && (
                    <TableRow className="bg-muted/30 font-semibold border-t-2">
                      <TableCell className="text-xs">Total / Média</TableCell>
                      <TableCell className="text-right text-xs">{totals.total}</TableCell>
                      <TableCell className={`text-right text-xs ${statusColor(tempos.tmr, META_TMR)}`}>{formatHours(tempos.tmr)}</TableCell>
                      <TableCell className={`text-right text-xs ${statusColor(tempos.mttr, META_MTTR)}`}>{formatHours(tempos.mttr)}</TableCell>
                      <TableCell className={`text-right text-xs ${statusColor(tempos.tma, META_MTTR)}`}>{formatHours(tempos.tma)}</TableCell>
                      <TableCell className={`text-right text-xs ${statusColor(tempos.mtta, META_TMR)}`}>{formatHours(tempos.mtta)}</TableCell>
                      <TableCell className="text-right text-xs">
                        {totals.acimaMeta > 0 ? <Badge variant="destructive" className="text-[10px]">{totals.acimaMeta} ({totals.pctAcima}%)</Badge> : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ReportLegend items={[
        { sigla: 'TMR', descricao: 'Tempo Médio de Resposta — abertura até primeiro atendimento' },
        { sigla: 'MTTR', descricao: 'Tempo Médio de Resolução — abertura até aceite final' },
        { sigla: 'TMA', descricao: 'Tempo Médio de Atendimento — duração total do atendimento' },
        { sigla: 'MTTA', descricao: 'Tempo Médio de Reconhecimento — abertura até primeira ação' },
      ]} />
    </div>
  );
}

function MiniKPI({ icon: Icon, label, value, meta, status }: { icon: any; label: string; value: string; meta?: string; status?: string }) {
  const isAlert = status?.includes('destructive') || status?.includes('orange');
  return (
    <Card className={isAlert ? 'border-destructive/30' : ''}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${isAlert ? 'bg-destructive/10' : 'bg-info/10'}`}>
          <Icon className={`h-4 w-4 ${isAlert ? 'text-destructive' : 'text-info'}`} />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={`text-lg font-bold ${status || ''}`}>{value}</p>
          {meta && <p className="text-[10px] text-muted-foreground">{meta}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
