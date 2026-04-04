import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDemandas } from "../../hooks/useDemandas";
import { useAllTransitions, useProfiles } from "../../hooks/useAllTransitions";
import { calcTempos, formatHours } from "../../utils/kpiCalculations";
import { ReportFilters } from "./ReportFilters";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { Clock, Timer, TrendingUp, Target } from "lucide-react";
import type { Demanda, DemandaTransition } from "../../types/demanda";

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

  // Per-analyst breakdown
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
        return hrs > 4;
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

  const getExportData = () => ({
    title: 'Relatorio_Tempo_Medio',
    headers: ['Analista', 'Total Chamados', 'TMR', 'MTTR', 'TMA', 'MTTA', 'Acima Meta', '% Acima'],
    rows: analistaStats.map(a => [a.nome, a.total, formatHours(a.tmr), formatHours(a.mttr), formatHours(a.tma), formatHours(a.mtta), a.acimaMeta, `${a.pctAcima}%`]),
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">Relatório — Tempo Médio</h2>
          <p className="text-sm text-muted-foreground">MTTR / TMA / TMR / MTTA por período e analista</p>
        </div>
        <div className="flex items-center gap-2">
          <ReportFilters periodo={periodo} setPeriodo={setPeriodo} analista={analista} setAnalista={setAnalista} analistas={analistas} />
          <ExportButton getData={getExportData} />
        </div>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MiniKPI icon={Timer} label="TMR" value={formatHours(tempos.tmr)} />
        <MiniKPI icon={Clock} label="MTTR" value={formatHours(tempos.mttr)} highlight={tempos.mttr > 4} />
        <MiniKPI icon={TrendingUp} label="TMA" value={formatHours(tempos.tma)} />
        <MiniKPI icon={Target} label="MTTA" value={formatHours(tempos.mtta)} />
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
                  <TableRow>
                    <TableHead>Analista</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">TMR</TableHead>
                    <TableHead className="text-right">MTTR</TableHead>
                    <TableHead className="text-right">TMA</TableHead>
                    <TableHead className="text-right">MTTA</TableHead>
                    <TableHead className="text-right">Acima Meta</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analistaStats.map(a => (
                    <TableRow key={a.nome}>
                      <TableCell className="font-medium text-xs">{a.nome}</TableCell>
                      <TableCell className="text-right text-xs">{a.total}</TableCell>
                      <TableCell className="text-right text-xs">{formatHours(a.tmr)}</TableCell>
                      <TableCell className="text-right text-xs">
                        <span className={a.mttr > 4 ? 'text-destructive font-semibold' : ''}>{formatHours(a.mttr)}</span>
                      </TableCell>
                      <TableCell className="text-right text-xs">{formatHours(a.tma)}</TableCell>
                      <TableCell className="text-right text-xs">{formatHours(a.mtta)}</TableCell>
                      <TableCell className="text-right text-xs">
                        {a.acimaMeta > 0 ? <Badge variant="destructive" className="text-[10px]">{a.acimaMeta} ({a.pctAcima}%)</Badge> : <span className="text-muted-foreground">0</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function MiniKPI({ icon: Icon, label, value, highlight }: { icon: any; label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? 'border-destructive/30' : ''}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${highlight ? 'bg-destructive/10' : 'bg-info/10'}`}>
          <Icon className={`h-4 w-4 ${highlight ? 'text-destructive' : 'text-info'}`} />
        </div>
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
          <p className={`text-lg font-bold ${highlight ? 'text-destructive' : ''}`}>{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
