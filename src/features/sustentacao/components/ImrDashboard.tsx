import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemandas } from "../hooks/useDemandas";
import { useProjetos } from "../hooks/useProjetos";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { calcIAP, calcIQS, calcICT, calcISS, calcGlosasSummary, detectE8Alerts } from "../utils/imrCalculations";
import type { DemandaIMR, DemandaEvento } from "../utils/imrCalculations";
import { INDICADORES_GRUPO2, getIndicadorFaixa, EVENTOS_CONFIG } from "../types/imr";
import { getCurrentIAPPeriod, getIAPPeriodOptions, getIAPGlosa, countAtraso60Dias } from "../utils/slaEngine";
import * as eventosSvc from "../services/eventos.service";
import { Target, Shield, TestTube, Star, AlertTriangle, TrendingUp, DollarSign, Clock } from "lucide-react";

const INDICATOR_ICONS: Record<string, any> = {
  IAP: Target, IQS: Shield, ICT: TestTube, ISS: Star,
};

const COR_MAP: Record<string, string> = {
  green: 'text-emerald-600',
  yellow: 'text-yellow-600',
  orange: 'text-orange-600',
  red: 'text-destructive',
};

const COR_BG_MAP: Record<string, string> = {
  green: 'bg-emerald-500/10 border-emerald-500/30',
  yellow: 'bg-yellow-500/10 border-yellow-500/30',
  orange: 'bg-orange-500/10 border-orange-500/30',
  red: 'bg-destructive/10 border-destructive/30',
};

const EMOJI_MAP: Record<string, string> = {
  green: '🟢', yellow: '🟡', orange: '🟠', red: '🔴',
};

export function ImrDashboard() {
  const { demandas, loading } = useDemandas();
  const { projetos } = useProjetos();
  const { currentTeamId } = useAuth();
  const [eventos, setEventos] = useState<DemandaEvento[]>([]);

  // IAP period selection
  const periodOptions = useMemo(() => getIAPPeriodOptions(6), []);
  const currentPeriod = useMemo(() => getCurrentIAPPeriod(), []);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    if (day >= 11) return `${year}-${String(month).padStart(2, '0')}`;
    if (month === 1) return `${year - 1}-12`;
    return `${year}-${String(month - 1).padStart(2, '0')}`;
  });

  const activePeriod = useMemo(() => {
    return periodOptions.find(p => p.value === selectedPeriod) || periodOptions[0];
  }, [selectedPeriod, periodOptions]);

  const loadEventos = useCallback(async () => {
    if (!currentTeamId) return;
    try {
      const data = await eventosSvc.fetchEventosByTeam(currentTeamId);
      setEventos(data);
    } catch { /* ignore */ }
  }, [currentTeamId]);

  useEffect(() => { loadEventos(); }, [loadEventos]);

  // Filter demandas by IAP period (concluded within period)
  const filtered = useMemo(() => {
    const items = demandas as unknown as DemandaIMR[];
    if (!activePeriod) return items;
    return items.filter(d => {
      const created = new Date(d.created_at);
      return created >= activePeriod.start && created <= activePeriod.end;
    });
  }, [demandas, activePeriod]);

  // IAP: only concluded demandas within the period
  const iapFiltered = useMemo(() => {
    const items = demandas as unknown as DemandaIMR[];
    if (!activePeriod) return items;
    return items.filter(d => {
      if (d.situacao !== 'aceite_final') return false;
      const aceite = d.aceite_data ? new Date(d.aceite_data) : new Date(d.updated_at);
      return aceite >= activePeriod.start && aceite <= activePeriod.end;
    });
  }, [demandas, activePeriod]);

  const iap = useMemo(() => calcIAP(iapFiltered), [iapFiltered]);
  const iqs = useMemo(() => calcIQS(filtered), [filtered]);
  const ict = useMemo(() => calcICT(filtered), [filtered]);
  const iss = useMemo(() => calcISS(filtered), [filtered]);
  const glosas = useMemo(() => calcGlosasSummary(eventos), [eventos]);
  const e8Alerts = useMemo(() => detectE8Alerts(demandas as unknown as DemandaIMR[]), [demandas]);

  // Evolution 7: >60 days count
  const atraso60 = useMemo(() => countAtraso60Dias(demandas as any), [demandas]);
  const glosa60 = atraso60.count * 0.2;
  const iapGlosa = getIAPGlosa(iap.valor);
  const glosaTotalCalc = iapGlosa + glosa60;

  if (loading) return <SkeletonList count={4} />;

  const indicatorValues = {
    IAP: iap.valor,
    IQS: iqs.valor,
    ICT: ict.valor,
    ISS: iss.valor,
  };

  const indicatorDetails: Record<string, string> = {
    IAP: `${iap.qdap} de ${iap.qdtot} no prazo`,
    IQS: `${iqs.qde - iqs.qdr} de ${iqs.qde} sem rejeição`,
    ICT: `${ict.total} demandas avaliadas`,
    ISS: `${iss.total} demandas avaliadas`,
  };

  const e8GlosaCount = e8Alerts.filter(a => a.tipo === 'glosa').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Indicadores Grupo 2 — IMR</h3>
          <p className="text-xs text-muted-foreground">Instrumento de Medição de Resultados</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periodOptions.map(p => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Period info */}
      {activePeriod && (
        <div className="text-xs text-muted-foreground px-1">
          Período de apuração: {activePeriod.start.toLocaleDateString('pt-BR')} — {activePeriod.end.toLocaleDateString('pt-BR')}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {INDICADORES_GRUPO2.map(ind => {
          const valor = indicatorValues[ind.sigla as keyof typeof indicatorValues];
          const faixa = getIndicadorFaixa(ind, valor);
          const Icon = INDICATOR_ICONS[ind.sigla] || Target;
          const hasData = ind.sigla === 'ISS' ? iss.total > 0 : ind.sigla === 'ICT' ? ict.total > 0 : ind.sigla === 'IQS' ? iqs.qde > 0 : iap.qdtot > 0;

          return (
            <Card key={ind.sigla} className={`${COR_BG_MAP[faixa.cor]} transition-colors`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{EMOJI_MAP[faixa.cor]}</span>
                      <span className="text-xs font-bold uppercase tracking-wide">{ind.sigla}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{ind.nome}</p>
                    <p className={`text-2xl font-bold ${COR_MAP[faixa.cor]}`}>
                      {!hasData ? 'N/A' : ind.sigla === 'ISS' ? valor.toFixed(1) : `${valor.toFixed(1)}%`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">Meta: ≥ {ind.meta}{ind.unidade}</p>
                    {ind.sigla === 'IAP' && activePeriod && (
                      <p className="text-[10px] text-muted-foreground italic">
                        Período: {activePeriod.label}
                      </p>
                    )}
                    {hasData && faixa.glosa > 0 && (
                      <Badge variant="destructive" className="text-[10px]">Glosa: {faixa.glosa}%</Badge>
                    )}
                  </div>
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${COR_MAP[faixa.cor]} bg-background/50`}>
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                {hasData && <p className="text-[10px] text-muted-foreground mt-1">{indicatorDetails[ind.sigla]}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* SLA Section with >60 days card */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* >60 days card (Evolution 7) */}
        <Card className={atraso60.count > 0 ? 'border-destructive/30' : ''}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Atraso &gt; 60 dias</p>
                <p className={`text-2xl font-bold mt-1 ${atraso60.count > 0 ? 'text-destructive' : ''}`}>{atraso60.count}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">demandas em atraso crítico</p>
              </div>
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${atraso60.count > 0 ? 'bg-destructive/10 text-destructive' : 'bg-muted text-muted-foreground'}`}>
                <Clock className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Alertas E8 & Glosa Summary */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Alertas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />Alertas de SLA (E8)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {e8Alerts.length === 0 && <p className="text-sm text-muted-foreground">Nenhum alerta de SLA ativo.</p>}
            {e8Alerts.map(a => (
              <div key={a.demanda.id} className={`flex items-center gap-3 p-2.5 rounded-lg border ${a.tipo === 'glosa' ? 'border-destructive/30 bg-destructive/5' : 'border-orange-400/30 bg-orange-50'}`}>
                <span>{a.tipo === 'glosa' ? '🔴' : '🟠'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{a.demanda.rhm} — {a.demanda.projeto}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {a.diasAtraso} dias de atraso {a.tipo === 'glosa' ? '— Glosa 0,2%' : '— Alerta preventivo'}
                  </p>
                </div>
              </div>
            ))}
            {e8GlosaCount > 0 && (
              <div className="mt-2 p-2 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive font-medium">
                ⚠ {e8GlosaCount} demanda(s) ultrapassaram 60 dias.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Glosa Summary (Evolution 7 — updated layout) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-destructive" />Resumo de Glosas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* IAP + >60 + Total row */}
            <div className="grid grid-cols-3 gap-3">
              <div className={`p-3 rounded-lg border ${iapGlosa > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Glosa IAP</p>
                <p className={`text-xl font-bold ${iapGlosa > 0 ? 'text-destructive' : ''}`}>{iapGlosa.toFixed(2)}%</p>
                <p className="text-[10px] text-muted-foreground">IAP: {iap.qdtot > 0 ? `${iap.valor.toFixed(1)}%` : 'N/A'}</p>
              </div>
              <div className={`p-3 rounded-lg border ${glosa60 > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Glosa +60</p>
                <p className={`text-xl font-bold ${glosa60 > 0 ? 'text-destructive' : ''}`}>{glosa60.toFixed(2)}%</p>
                <p className="text-[10px] text-muted-foreground">{atraso60.count} demandas</p>
              </div>
              <div className={`p-3 rounded-lg border ${glosaTotalCalc > 0 ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
                <p className="text-[10px] text-muted-foreground uppercase font-semibold">Glosa Total</p>
                <p className={`text-xl font-bold ${glosaTotalCalc > 0 ? 'text-destructive' : ''}`}>{glosaTotalCalc.toFixed(2)}%</p>
              </div>
            </div>

            {Object.keys(glosas.byEvento).length > 0 && (
              <div className="space-y-1.5">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase">Eventos Registrados</p>
                {Object.entries(glosas.byEvento).map(([ev, data]) => {
                  const cfg = EVENTOS_CONFIG.find(e => e.codigo === ev);
                  return (
                    <div key={ev} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                      <span className="font-medium">{ev} — {cfg?.descricao.slice(0, 40)}...</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px]">{data.count}x</Badge>
                        <span className="text-destructive font-medium">{data.total.toFixed(2)}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {eventos.length === 0 && glosas.totalIntegral === 0 && glosas.totalLimitada === 0 && (
              <p className="text-sm text-muted-foreground text-center py-2">Nenhum evento de glosa registrado.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
