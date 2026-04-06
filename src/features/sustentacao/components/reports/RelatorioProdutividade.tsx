import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDemandas } from "../../hooks/useDemandas";
import { useAllTransitions, useAllHours, useProfiles } from "../../hooks/useAllTransitions";
import { calcProdutividade, formatHours } from "../../utils/kpiCalculations";
import { ReportFilters } from "./ReportFilters";
import { ReportHeader, ReportLegend } from "./ReportHeader";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { getReportConfig } from "../../utils/reportConfig";
import { Users, Trophy, Zap, AlertTriangle } from "lucide-react";

export function RelatorioProdutividade() {
  const { demandas } = useDemandas();
  const { transitions } = useAllTransitions();
  const { hours } = useAllHours();
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
    return items;
  }, [demandas, periodo]);

  const filteredHours = useMemo(() => {
    if (periodo === 'all') return hours;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - parseInt(periodo));
    return hours.filter(h => new Date(h.created_at) >= cutoff);
  }, [hours, periodo]);

  const stats = useMemo(() => {
    let result = calcProdutividade(filtered, transitions, filteredHours, profiles);
    if (analista !== 'all') result = result.filter(a => a.userId === analista);
    return result;
  }, [filtered, transitions, filteredHours, profiles, analista]);

  const highlights = useMemo(() => {
    if (stats.length === 0) return { maiorVolume: '-', melhorMTTR: '-', maiorBacklog: '-' };
    const sorted = [...stats];
    return {
      maiorVolume: sorted.sort((a, b) => b.resolvidos - a.resolvidos)[0]?.nome || '-',
      melhorMTTR: sorted.sort((a, b) => (a.mttrIndividual || Infinity) - (b.mttrIndividual || Infinity))[0]?.nome || '-',
      maiorBacklog: sorted.sort((a, b) => b.emAberto - a.emAberto)[0]?.nome || '-',
    };
  }, [stats]);

  const analistasList = useMemo(() => {
    const ids = [...new Set(demandas.map(d => d.responsavel_dev).filter(Boolean))] as string[];
    return ids.map(id => {
      const p = profiles.find(pr => pr.user_id === id);
      return { user_id: id, display_name: p?.display_name || id.slice(0, 8) };
    });
  }, [demandas, profiles]);

  const [sortKey, setSortKey] = useState<string>('resolvidos');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    return [...stats].sort((a, b) => {
      const va = (a as any)[sortKey] ?? 0;
      const vb = (b as any)[sortKey] ?? 0;
      return sortDir === 'desc' ? vb - va : va - vb;
    });
  }, [stats, sortKey, sortDir]);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  // Totals
  const totals = useMemo(() => {
    if (sorted.length === 0) return null;
    return {
      atribuidos: sorted.reduce((s, a) => s + a.atribuidos, 0),
      resolvidos: sorted.reduce((s, a) => s + a.resolvidos, 0),
      horasLancadas: sorted.reduce((s, a) => s + a.horasLancadas, 0),
      emAberto: sorted.reduce((s, a) => s + a.emAberto, 0),
      taxaResolucao: sorted.reduce((s, a) => s + a.atribuidos, 0) > 0
        ? (sorted.reduce((s, a) => s + a.resolvidos, 0) / sorted.reduce((s, a) => s + a.atribuidos, 0)) * 100 : 0,
    };
  }, [sorted]);

  const reportCfg = getReportConfig('produtividade');

  const getExportData = () => ({
    title: reportCfg.tituloExportacao,
    headers: ['Analista', 'Atribuídos', 'Resolvidos', 'Taxa Resolução', 'Horas Lançadas', 'Em Aberto'],
    rows: sorted.map(a => [a.nome, a.atribuidos, a.resolvidos, `${a.taxaResolucao.toFixed(1)}%`, a.horasLancadas.toFixed(1), a.emAberto]),
  });

  const SortableHead = ({ label, field }: { label: string; field: string }) => (
    <TableHead className="text-right cursor-pointer hover:text-foreground select-none font-semibold" onClick={() => toggleSort(field)}>
      {label} {sortKey === field ? (sortDir === 'desc' ? '↓' : '↑') : ''}
    </TableHead>
  );

  const rateColor = (rate: number) =>
    rate >= 80 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
    rate >= 40 ? 'bg-orange-100 text-orange-700 border-orange-200' :
    'bg-destructive/10 text-destructive border-destructive/20';

  return (
    <div className="space-y-5">
      <ReportHeader tipoRelatorio={reportCfg.titulo} periodo={periodo} modulo={reportCfg.modulo} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">{reportCfg.titulo.replace('Relatório — ', '')}</h2>
          <p className="text-sm text-muted-foreground">{reportCfg.subtitulo}</p>
        </div>
        <div className="flex items-center gap-2">
          <ReportFilters periodo={periodo} setPeriodo={setPeriodo} analista={analista} setAnalista={setAnalista} analistas={analistasList} />
          <ExportButton getData={getExportData} />
        </div>
      </div>

      {/* Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center"><Trophy className="h-4 w-4 text-info" /></div>
            <div><p className="text-[10px] text-muted-foreground">Maior Volume</p><p className="text-sm font-bold">{highlights.maiorVolume}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-info/10 flex items-center justify-center"><Zap className="h-4 w-4 text-info" /></div>
            <div><p className="text-[10px] text-muted-foreground">Melhor MTTR</p><p className="text-sm font-bold">{highlights.melhorMTTR}</p></div>
          </CardContent>
        </Card>
        <Card className={stats.some(s => s.emAberto > 5) ? 'border-destructive/30' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${stats.some(s => s.emAberto > 5) ? 'bg-destructive/10' : 'bg-muted'}`}>
              <AlertTriangle className={`h-4 w-4 ${stats.some(s => s.emAberto > 5) ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <div><p className="text-[10px] text-muted-foreground">Maior Backlog</p><p className="text-sm font-bold">{highlights.maiorBacklog}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Users className="h-4 w-4 text-info" />Ranking de Analistas</CardTitle></CardHeader>
        <CardContent>
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado disponível</p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">Analista</TableHead>
                    <SortableHead label="Atribuídos" field="atribuidos" />
                    <SortableHead label="Resolvidos" field="resolvidos" />
                    <SortableHead label="Taxa Resolução" field="taxaResolucao" />
                    <SortableHead label="Horas" field="horasLancadas" />
                    <SortableHead label="Em Aberto" field="emAberto" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sorted.map(a => (
                    <TableRow key={a.userId}>
                      <TableCell className="font-medium text-xs">{a.nome}</TableCell>
                      <TableCell className="text-right text-xs">{a.atribuidos}</TableCell>
                      <TableCell className="text-right text-xs">{a.resolvidos}</TableCell>
                      <TableCell className="text-right text-xs">
                        <Badge className={`text-[10px] ${rateColor(a.taxaResolucao)}`}>{a.taxaResolucao.toFixed(1)}%</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">{a.horasLancadas.toFixed(1)}h</TableCell>
                      <TableCell className="text-right text-xs">
                        {a.emAberto > 5 ? <span className="text-destructive font-semibold">{a.emAberto}</span> : a.emAberto}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals */}
                  {totals && (
                    <TableRow className="bg-muted/30 font-semibold border-t-2">
                      <TableCell className="text-xs">Total / Média</TableCell>
                      <TableCell className="text-right text-xs">{totals.atribuidos}</TableCell>
                      <TableCell className="text-right text-xs">{totals.resolvidos}</TableCell>
                      <TableCell className="text-right text-xs">
                        <Badge className={`text-[10px] ${rateColor(totals.taxaResolucao)}`}>{totals.taxaResolucao.toFixed(1)}%</Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">{totals.horasLancadas.toFixed(1)}h</TableCell>
                      <TableCell className="text-right text-xs">{totals.emAberto}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bar chart */}
      {sorted.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">Comparativo — Chamados Resolvidos</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {sorted.map(a => {
              const max = Math.max(...sorted.map(s => s.resolvidos), 1);
              return (
                <div key={a.userId} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{a.nome}</span>
                    <span className="font-medium">{a.resolvidos}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-info transition-all" style={{ width: `${(a.resolvidos / max) * 100}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <ReportLegend items={[
        { sigla: 'Taxa Resolução', descricao: 'Chamados resolvidos ÷ atribuídos × 100' },
        { sigla: 'MTTR', descricao: 'Tempo Médio de Resolução individual' },
        { sigla: 'FCR', descricao: 'Resolução no Primeiro Contato — sem reabertura' },
        { sigla: 'Backlog', descricao: 'Chamados ainda em aberto atribuídos ao analista' },
      ]} />
    </div>
  );
}
