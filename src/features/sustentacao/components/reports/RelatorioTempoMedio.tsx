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
import { getReportConfig } from "../../utils/reportConfig";
import { Clock, Timer, TrendingUp, Target, Activity } from "lucide-react";
import type { Demanda, DemandaTransition } from "../../types/demanda";
import { buildAnalistasDedup, analistaMatches } from "../../utils/analistasDedup";

const META_MTTR = 4; // horas
const META_TMR = 1; // hora

function today() {
  return new Date().toISOString().split("T")[0];
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}
function fmtDateBR(d: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

export function RelatorioTempoMedio() {
  const { demandas } = useDemandas();
  const { transitions } = useAllTransitions();
  const profiles = useProfiles();
  const [periodo, setPeriodo] = useState('30');
  const [dataInicio, setDataInicio] = useState(daysAgo(30));
  const [dataFim, setDataFim] = useState(today());
  const [analista, setAnalista] = useState('all');

  const filtered = useMemo(() => {
    let items = demandas;
    if (dataInicio) {
      const ini = new Date(dataInicio + 'T00:00:00');
      items = items.filter(d => new Date(d.created_at) >= ini);
    }
    if (dataFim) {
      const fim = new Date(dataFim + 'T23:59:59');
      items = items.filter(d => new Date(d.created_at) <= fim);
    }
    if (analista !== 'all') {
      const demandaIdsFromTransitions = new Set(
        transitions.filter(t => analistaMatches(analista, t.user_id)).map(t => t.demanda_id)
      );
      items = items.filter(d => analistaMatches(analista, d.responsavel_dev) || demandaIdsFromTransitions.has(d.id));
    }
    return items;
  }, [demandas, dataInicio, dataFim, analista, transitions]);

  const tempos = useMemo(() => calcTempos(filtered, transitions), [filtered, transitions]);

  const analistaStats = useMemo(() => {
    // Collect user IDs from responsavel_dev and transitions
    const userIdSet = new Set<string>();
    filtered.forEach(d => { if (d.responsavel_dev) userIdSet.add(d.responsavel_dev); });
    transitions.forEach(t => {
      if (filtered.some(d => d.id === t.demanda_id)) userIdSet.add(t.user_id);
    });
    const devIds = [...userIdSet];

    return devIds.map(uid => {
      // Demandas where user is responsavel_dev OR performed transitions
      const demandaIdsFromTransitions = new Set(
        transitions.filter(t => t.user_id === uid).map(t => t.demanda_id)
      );
      const devDemandas = filtered.filter(d => d.responsavel_dev === uid || demandaIdsFromTransitions.has(d.id));
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
    // Igual à Produtividade: somente analistas que são responsáveis das demandas
    // e que possuem perfil cadastrado (evita duplicatas tipo "Samuel T").
    const profileIds = new Set(profiles.map(p => p.user_id));
    const idSet = new Set<string>();
    demandas.forEach(d => {
      [d.responsavel_dev, d.responsavel_requisitos, d.responsavel_teste, d.responsavel_arquiteto]
        .filter((id): id is string => !!id && profileIds.has(id))
        .forEach(id => idSet.add(id));
    });
    return buildAnalistasDedup([...idSet], profiles);
  }, [demandas, profiles]);

  // Totals row
  const totals = useMemo(() => {
    if (analistaStats.length === 0) return null;
    const totalDemandas = analistaStats.reduce((s, a) => s + a.total, 0);
    const totalAcima = analistaStats.reduce((s, a) => s + a.acimaMeta, 0);
    return { total: totalDemandas, acimaMeta: totalAcima, pctAcima: totalDemandas > 0 ? ((totalAcima / totalDemandas) * 100).toFixed(1) : '0' };
  }, [analistaStats]);

  const reportCfg = getReportConfig('tempo_medio');

  const getExportData = () => ({
    title: reportCfg.tituloExportacao,
    headers: ['Analista', 'Total Chamados', 'TMR', 'MTTR', 'TMA', 'MTTA', 'Acima Meta', '% Acima'],
    rows: analistaStats.map(a => [a.nome, a.total, formatHours(a.tmr), formatHours(a.mttr), formatHours(a.tma), formatHours(a.mtta), a.acimaMeta, `${a.pctAcima}%`]),
  });

  const statusColor = (val: number, meta: number) =>
    val <= meta ? 'text-emerald-600' : val <= meta * 1.5 ? 'text-orange-500' : 'text-destructive';

  return (
    <div className="space-y-5">
      <ReportHeader
        tipoRelatorio={reportCfg.titulo}
        periodo={`${fmtDateBR(dataInicio)} a ${fmtDateBR(dataFim)}`}
        modulo={reportCfg.modulo}
      />

      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            {reportCfg.titulo.replace('Relatório — ', '')}
            {analista !== 'all' && (
              <Badge variant="secondary" className="ml-1 text-xs font-normal">
                {analistas.find(a => a.user_id === analista)?.display_name || analista}
              </Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">{reportCfg.subtitulo}</p>
        </div>
        <ExportButton getData={getExportData} />
      </div>

      {/* Filtros (estilo Produtividade) */}
      <ReportFilters
        periodo={periodo}
        setPeriodo={setPeriodo}
        analista={analista}
        setAnalista={setAnalista}
        analistas={analistas}
        dataInicio={dataInicio}
        setDataInicio={setDataInicio}
        dataFim={dataFim}
        setDataFim={setDataFim}
      />

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
