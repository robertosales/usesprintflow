import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useDemandas } from "../../hooks/useDemandas";
import { useAllTransitions, useProfiles } from "../../hooks/useAllTransitions";
import { calcSLA, formatHours } from "../../utils/kpiCalculations";
import { ReportFilters } from "./ReportFilters";
import { ReportHeader, ReportLegend } from "./ReportHeader";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { getReportConfig } from "../../utils/reportConfig";
import { Shield, AlertTriangle, CheckCircle2 } from "lucide-react";

const META_SLA = 95; // %

export function RelatorioSLA() {
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

  const sla = useMemo(() => calcSLA(filtered, transitions), [filtered, transitions]);

  const analistas = useMemo(() => {
    const ids = [...new Set(demandas.map(d => d.responsavel_dev).filter(Boolean))] as string[];
    return ids.map(id => {
      const p = profiles.find(pr => pr.user_id === id);
      return { user_id: id, display_name: p?.display_name || id.slice(0, 8) };
    });
  }, [demandas, profiles]);

  const maiorViolacao = useMemo(() => {
    const violados = sla.results.filter(r => r.statusSLA === 'violado');
    const criticos = violados.filter(r => r.prioridade === 'Crítico').length;
    const padrao = violados.filter(r => r.prioridade === 'Padrão').length;
    return criticos >= padrao ? 'Crítico' : 'Padrão';
  }, [sla]);

  const barData = useMemo(() => {
    const dentro = sla.results.filter(r => r.statusSLA === 'dentro').length;
    const emRisco = sla.results.filter(r => r.statusSLA === 'em_risco').length;
    const violado = sla.results.filter(r => r.statusSLA === 'violado').length;
    const total = Math.max(dentro + emRisco + violado, 1);
    return { dentro, emRisco, violado, total };
  }, [sla]);

  const reportCfg = getReportConfig('sla_compliance');

  const getExportData = () => ({
    title: reportCfg.tituloExportacao,
    headers: ['RHM', 'Projeto', 'Prioridade', 'Abertura', 'Prazo SLA', 'Resolução', 'Status SLA', 'Atraso'],
    rows: sla.results.map(r => [
      r.rhm, r.projeto, r.prioridade,
      new Date(r.abertura).toLocaleDateString('pt-BR'),
      new Date(r.prazoSLA).toLocaleDateString('pt-BR') + ' ' + new Date(r.prazoSLA).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      r.resolucao ? new Date(r.resolucao).toLocaleDateString('pt-BR') : 'Em aberto',
      r.statusSLA === 'dentro' ? 'Dentro do prazo' : r.statusSLA === 'em_risco' ? 'Em risco' : 'Violado',
      r.atraso > 0 ? formatHours(r.atraso) : '-',
    ]),
  });

  const statusBadge = (s: string) => {
    if (s === 'dentro') return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">Dentro</Badge>;
    if (s === 'em_risco') return <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-[10px]">Em risco</Badge>;
    return <Badge variant="destructive" className="text-[10px]">Violado</Badge>;
  };

  const complianceColor = sla.compliance >= META_SLA ? 'text-emerald-600' : sla.compliance >= 80 ? 'text-orange-500' : 'text-destructive';

  return (
    <div className="space-y-5">
      <ReportHeader tipoRelatorio="Relatório — SLA Compliance" periodo={periodo} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold">SLA Compliance</h2>
          <p className="text-sm text-muted-foreground">Auditoria de cumprimento de SLA · Meta: ≥ {META_SLA}%</p>
        </div>
        <div className="flex items-center gap-2">
          <ReportFilters periodo={periodo} setPeriodo={setPeriodo} analista={analista} setAnalista={setAnalista} analistas={analistas} />
          <ExportButton getData={getExportData} />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={sla.compliance < META_SLA ? 'border-destructive/30' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${sla.compliance >= META_SLA ? 'bg-emerald-100' : 'bg-destructive/10'}`}>
              <Shield className={`h-4 w-4 ${sla.compliance >= META_SLA ? 'text-emerald-600' : 'text-destructive'}`} />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Compliance</p>
              <p className={`text-lg font-bold ${complianceColor}`}>{sla.compliance.toFixed(1)}%</p>
              <p className="text-[10px] text-muted-foreground">Meta: {META_SLA}%</p>
            </div>
          </CardContent>
        </Card>
        <Card className={sla.violados > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${sla.violados > 0 ? 'bg-destructive/10' : 'bg-muted'}`}>
              <AlertTriangle className={`h-4 w-4 ${sla.violados > 0 ? 'text-destructive' : 'text-muted-foreground'}`} />
            </div>
            <div><p className="text-[10px] text-muted-foreground">Violados</p><p className="text-lg font-bold">{sla.violados}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-orange-100 flex items-center justify-center"><AlertTriangle className="h-4 w-4 text-orange-500" /></div>
            <div><p className="text-[10px] text-muted-foreground">Em Risco</p><p className="text-lg font-bold">{sla.emRisco}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center"><CheckCircle2 className="h-4 w-4 text-muted-foreground" /></div>
            <div><p className="text-[10px] text-muted-foreground">Maior Violação</p><p className="text-lg font-bold">{maiorViolacao}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Stacked bar */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Distribuição SLA</CardTitle></CardHeader>
        <CardContent>
          <div className="h-8 rounded-full overflow-hidden flex bg-muted">
            {barData.dentro > 0 && <div className="bg-emerald-500 h-full transition-all" style={{ width: `${(barData.dentro / barData.total) * 100}%` }} />}
            {barData.emRisco > 0 && <div className="bg-orange-400 h-full transition-all" style={{ width: `${(barData.emRisco / barData.total) * 100}%` }} />}
            {barData.violado > 0 && <div className="bg-destructive h-full transition-all" style={{ width: `${(barData.violado / barData.total) * 100}%` }} />}
          </div>
          <div className="flex gap-4 mt-2 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" />Dentro ({barData.dentro})</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-orange-400" />Em risco ({barData.emRisco})</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-destructive" />Violado ({barData.violado})</span>
          </div>
        </CardContent>
      </Card>

      {/* Detail table */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Detalhamento por Chamado</CardTitle></CardHeader>
        <CardContent>
          {sla.results.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Nenhum dado</p>
          ) : (
            <div className="overflow-auto max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="font-semibold">RHM</TableHead>
                    <TableHead className="font-semibold">Projeto</TableHead>
                    <TableHead className="font-semibold">Prioridade</TableHead>
                    <TableHead className="font-semibold">Abertura</TableHead>
                    <TableHead className="font-semibold">Prazo SLA</TableHead>
                    <TableHead className="font-semibold">Resolução</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="text-right font-semibold">Atraso</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sla.results.map(r => (
                    <TableRow key={r.demandaId}>
                      <TableCell className="text-xs font-medium">{r.rhm}</TableCell>
                      <TableCell className="text-xs">{r.projeto}</TableCell>
                      <TableCell className="text-xs">{r.prioridade}</TableCell>
                      <TableCell className="text-xs">{new Date(r.abertura).toLocaleDateString('pt-BR')}</TableCell>
                      <TableCell className="text-xs">{new Date(r.prazoSLA).toLocaleDateString('pt-BR')} {new Date(r.prazoSLA).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</TableCell>
                      <TableCell className="text-xs">{r.resolucao ? new Date(r.resolucao).toLocaleDateString('pt-BR') : <span className="text-muted-foreground">Em aberto</span>}</TableCell>
                      <TableCell>{statusBadge(r.statusSLA)}</TableCell>
                      <TableCell className="text-right text-xs">{r.atraso > 0 ? <span className="text-destructive font-medium">{formatHours(r.atraso)}</span> : '-'}</TableCell>
                    </TableRow>
                  ))}
                  {/* Totals */}
                  <TableRow className="bg-muted/30 font-semibold border-t-2">
                    <TableCell className="text-xs" colSpan={6}>Total: {sla.results.length} chamados</TableCell>
                    <TableCell className="text-xs" colSpan={2}>
                      <span className="text-emerald-600">{barData.dentro} dentro</span> · <span className="text-orange-500">{barData.emRisco} risco</span> · <span className="text-destructive">{barData.violado} violados</span>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ReportLegend items={[
        { sigla: 'SLA', descricao: 'Acordo de Nível de Serviço — prazo máximo para resolução' },
        { sigla: 'Dentro', descricao: 'Chamado resolvido ou em andamento dentro do prazo' },
        { sigla: 'Em risco', descricao: 'Menos de 2 horas restantes para o vencimento' },
        { sigla: 'Violado', descricao: 'Prazo de SLA excedido' },
      ]} />
    </div>
  );
}
