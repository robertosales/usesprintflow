import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemandas } from "../../hooks/useDemandas";
import { useAuth } from "@/contexts/AuthContext";
import { calcIAP, calcIQS, calcICT, calcISS, calcGlosasSummary } from "../../utils/imrCalculations";
import type { DemandaIMR, DemandaEvento } from "../../utils/imrCalculations";
import { INDICADORES_GRUPO2, getIndicadorFaixa, EVENTOS_CONFIG } from "../../types/imr";
import * as eventosSvc from "../../services/eventos.service";
import { REPORT_CONFIGS } from "../../utils/reportConfig";
import { ReportHeader } from "./ReportHeader";
import { Download } from "lucide-react";

export function RelatorioIMR() {
  const { demandas } = useDemandas();
  const { currentTeamId, profile } = useAuth();
  const [eventos, setEventos] = useState<DemandaEvento[]>([]);
  const [filterPeriodo, setFilterPeriodo] = useState('30');
  const [teamId, setTeamId] = useState('all');

  const loadEventos = useCallback(async () => {
    if (!currentTeamId) return;
    try { setEventos(await eventosSvc.fetchEventosByTeam(currentTeamId)); } catch { /* */ }
  }, [currentTeamId]);

  useEffect(() => { loadEventos(); }, [loadEventos]);

  const filtered = useMemo(() => {
    let items = demandas as unknown as DemandaIMR[];
    if (teamId !== 'all') items = items.filter(d => d.team_id === teamId);
    if (filterPeriodo !== 'all') {
      const days = parseInt(filterPeriodo);
      const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
      items = items.filter(d => new Date(d.created_at) >= cutoff);
    }
    return items;
  }, [demandas, filterPeriodo, teamId]);

  const iap = useMemo(() => calcIAP(filtered), [filtered]);
  const iqs = useMemo(() => calcIQS(filtered), [filtered]);
  const ict = useMemo(() => calcICT(filtered), [filtered]);
  const iss = useMemo(() => calcISS(filtered), [filtered]);
  const glosas = useMemo(() => calcGlosasSummary(eventos), [eventos]);

  const indicators = [
    { ...INDICADORES_GRUPO2[0], valor: iap.valor, detail: `${iap.qdap}/${iap.qdtot}` },
    { ...INDICADORES_GRUPO2[1], valor: iqs.valor, detail: `${iqs.qdr} rejeições em ${iqs.qde}` },
    { ...INDICADORES_GRUPO2[2], valor: ict.valor, detail: `${ict.total} avaliadas` },
    { ...INDICADORES_GRUPO2[3], valor: iss.valor, detail: `${iss.total} avaliadas` },
  ];

  const exportCSV = () => {
    const cfg = REPORT_CONFIGS.sustentacao_imr;
    const lines = [cfg.titulo, `Gerado em: ${new Date().toLocaleString('pt-BR')}`, `Responsável: ${profile?.display_name || ''}`, ''];
    lines.push('Indicador,Valor,Meta,Status,% Glosa');
    indicators.forEach(ind => {
      const faixa = getIndicadorFaixa(ind, ind.valor);
      const status = faixa.cor === 'green' ? '✅' : faixa.cor === 'yellow' ? '⚠️' : '❌';
      lines.push(`${ind.sigla} - ${ind.nome},${ind.sigla === 'ISS' ? ind.valor.toFixed(1) : ind.valor.toFixed(1) + '%'},≥${ind.meta}${ind.unidade},${status},${faixa.glosa}%`);
    });
    lines.push('', 'Eventos de Glosa', 'Código,Descrição,Ocorrências,Redutor Total,Incidência');
    Object.entries(glosas.byEvento).forEach(([ev, data]) => {
      const c = EVENTOS_CONFIG.find(e => e.codigo === ev);
      lines.push(`${ev},"${c?.descricao || ''}",${data.count},${data.total.toFixed(2)}%,${c?.incidencia || ''}`);
    });
    lines.push('', `Glosa Integral Total: ${glosas.totalIntegral.toFixed(2)}%`);
    lines.push(`Glosa Limitada Total: ${glosas.totalLimitada.toFixed(2)}%`);

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${cfg.tituloExportacao.replace(/\s+/g, '_')}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const EMOJI = { green: '🟢', yellow: '🟡', orange: '🟠', red: '🔴' };
  const STATUS_LABEL = { green: '✅ Meta atingida', yellow: '⚠️ Abaixo da meta', orange: '⚠️ Faixa intermediária', red: '❌ Glosa máxima' };

  return (
    <div className="space-y-6">
      <ReportHeader tipoRelatorio={REPORT_CONFIGS.sustentacao_imr.titulo} periodo={filterPeriodo} />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ReportFilters periodo={filterPeriodo} setPeriodo={setFilterPeriodo} showAnalista={false} teamId={teamId} setTeamId={setTeamId} />
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5"><Download className="h-4 w-4" />Exportar CSV</Button>
      </div>

      {/* Resumo Executivo */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Resumo Executivo</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/50">
              <th className="text-left p-2 font-medium text-muted-foreground">Indicador</th>
              <th className="text-center p-2 font-medium text-muted-foreground">Valor</th>
              <th className="text-center p-2 font-medium text-muted-foreground">Meta</th>
              <th className="text-center p-2 font-medium text-muted-foreground">Status</th>
              <th className="text-center p-2 font-medium text-muted-foreground">% Glosa</th>
              <th className="text-left p-2 font-medium text-muted-foreground">Detalhe</th>
            </tr></thead>
            <tbody>
              {indicators.map(ind => {
                const faixa = getIndicadorFaixa(ind, ind.valor);
                return (
                  <tr key={ind.sigla} className="border-b last:border-0">
                    <td className="p-2 font-medium">{ind.sigla} — {ind.nome}</td>
                    <td className="p-2 text-center font-bold">{ind.sigla === 'ISS' ? ind.valor.toFixed(1) : `${ind.valor.toFixed(1)}%`}</td>
                    <td className="p-2 text-center">≥ {ind.meta}{ind.unidade}</td>
                    <td className="p-2 text-center">{EMOJI[faixa.cor]} {STATUS_LABEL[faixa.cor]}</td>
                    <td className="p-2 text-center">{faixa.glosa > 0 ? <Badge variant="destructive" className="text-[10px]">{faixa.glosa}%</Badge> : '—'}</td>
                    <td className="p-2 text-muted-foreground">{ind.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Eventos e Glosas */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Relatório de Eventos e Glosas</CardTitle></CardHeader>
        <CardContent>
          {Object.keys(glosas.byEvento).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento de glosa registrado no período.</p>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead><tr className="border-b bg-muted/50">
                  <th className="text-left p-2 font-medium text-muted-foreground">Código</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">Descrição</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Ocorrências</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Redutor Unit.</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Total</th>
                  <th className="text-center p-2 font-medium text-muted-foreground">Incidência</th>
                </tr></thead>
                <tbody>
                  {Object.entries(glosas.byEvento).map(([ev, data]) => {
                    const c = EVENTOS_CONFIG.find(e => e.codigo === ev);
                    return (
                      <tr key={ev} className="border-b last:border-0">
                        <td className="p-2 font-mono font-bold">{ev}</td>
                        <td className="p-2">{c?.descricao || ev}</td>
                        <td className="p-2 text-center">{data.count}</td>
                        <td className="p-2 text-center">{c?.redutor}%</td>
                        <td className="p-2 text-center font-medium text-destructive">{data.total.toFixed(2)}%</td>
                        <td className="p-2 text-center"><Badge variant="secondary" className="text-[10px] capitalize">{c?.incidencia}</Badge></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="flex gap-4 mt-4 text-sm">
                <div className="p-3 rounded-lg border flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Glosa Integral</p>
                  <p className={`text-lg font-bold ${glosas.totalIntegral > 0 ? 'text-destructive' : ''}`}>{glosas.totalIntegral.toFixed(2)}%</p>
                </div>
                <div className="p-3 rounded-lg border flex-1">
                  <p className="text-[10px] text-muted-foreground uppercase font-semibold">Glosa Limitada</p>
                  <p className={`text-lg font-bold ${glosas.totalLimitada > 0 ? 'text-destructive' : ''}`}>{glosas.totalLimitada.toFixed(2)}%</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
