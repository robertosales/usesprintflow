import { useState, useMemo, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemandas } from "../hooks/useDemandas";
import { useProjetos } from "../hooks/useProjetos";
import { useAuth } from "@/contexts/AuthContext";
import { SkeletonList } from "@/shared/components/common/SkeletonList";
import { calcIAP, calcIQS, calcICT, calcISS, calcGlosasSummary } from "../utils/imrCalculations";
import type { DemandaIMR, DemandaEvento } from "../utils/imrCalculations";
import { INDICADORES_GRUPO2, getIndicadorFaixa, EVENTOS_CONFIG } from "../types/imr";
import { getIAPPeriodOptions, getIAPGlosa, countAtraso60Dias } from "../utils/slaEngine";
import * as eventosSvc from "../services/eventos.service";
import { Target, Shield, TestTube, Star, DollarSign, Clock, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 5;

const INDICATOR_ICONS: Record<string, any> = {
  IAP: Target,
  IQS: Shield,
  ICT: TestTube,
  ISS: Star,
};
const COR_MAP: Record<string, string> = {
  green: "text-emerald-600",
  yellow: "text-yellow-600",
  orange: "text-orange-600",
  red: "text-destructive",
};
const COR_BG_MAP: Record<string, string> = {
  green: "bg-emerald-500/10 border-emerald-500/30",
  yellow: "bg-yellow-500/10 border-yellow-500/30",
  orange: "bg-orange-500/10 border-orange-500/30",
  red: "bg-destructive/10 border-destructive/30",
};
const EMOJI_MAP: Record<string, string> = {
  green: "🟢",
  yellow: "🟡",
  orange: "🟠",
  red: "🔴",
};

// ─── ImrDashboard ─────────────────────────────────────────────────────────────

export function ImrDashboard() {
  const { demandas, loading } = useDemandas();
  const { currentTeamId } = useAuth();
  const [eventos, setEventos] = useState<DemandaEvento[]>([]);
  const [atrasadosPage, setAtrasadosPage] = useState(1);

  // ── Period selection ──────────────────────────────────────────────────────
  const periodOptions = useMemo(() => getIAPPeriodOptions(6), []);
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now = new Date();
    const day = now.getDate();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    if (day >= 11) return `${year}-${String(month).padStart(2, "0")}`;
    if (month === 1) return `${year - 1}-12`;
    return `${year}-${String(month - 1).padStart(2, "0")}`;
  });

  const activePeriod = useMemo(
    () => periodOptions.find((p) => p.value === selectedPeriod) || periodOptions[0],
    [selectedPeriod, periodOptions],
  );

  // ── Load eventos ──────────────────────────────────────────────────────────
  const loadEventos = useCallback(async () => {
    if (!currentTeamId) return;
    try {
      setEventos(await eventosSvc.fetchEventosByTeam(currentTeamId));
    } catch {
      /* ignore */
    }
  }, [currentTeamId]);

  useEffect(() => {
    loadEventos();
  }, [loadEventos]);

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const items = demandas as unknown as DemandaIMR[];
    if (!activePeriod) return items;
    return items.filter((d) => {
      const created = new Date(d.created_at);
      return created >= activePeriod.start && created <= activePeriod.end;
    });
  }, [demandas, activePeriod]);

  const iapFiltered = useMemo(() => {
    const items = demandas as unknown as DemandaIMR[];
    if (!activePeriod) return items;
    return items.filter((d) => {
      if (d.situacao !== "aceite_final") return false;
      const aceite = d.aceite_data ? new Date(d.aceite_data) : new Date(d.updated_at);
      return aceite >= activePeriod.start && aceite <= activePeriod.end;
    });
  }, [demandas, activePeriod]);

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const iap = useMemo(() => calcIAP(iapFiltered), [iapFiltered]);
  const iqs = useMemo(() => calcIQS(filtered), [filtered]);
  const ict = useMemo(() => calcICT(filtered), [filtered]);
  const iss = useMemo(() => calcISS(filtered), [filtered]);
  const glosas = useMemo(() => calcGlosasSummary(eventos), [eventos]);

  // ── Atraso >60 dias ───────────────────────────────────────────────────────
  const atraso60 = useMemo(() => countAtraso60Dias(demandas as any), [demandas]);

  const atrasadosList = useMemo(
    () =>
      (demandas as unknown as DemandaIMR[])
        .filter((d) => Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86_400_000) > 60)
        .map((d) => ({
          id: d.id,
          rhm: d.rhm,
          projeto: d.projeto,
          diasAtraso: Math.floor((Date.now() - new Date(d.updated_at).getTime()) / 86_400_000),
        }))
        .sort((a, b) => b.diasAtraso - a.diasAtraso),
    [demandas],
  );

  const atrasadosVisiveis = atrasadosList.slice(0, atrasadosPage * PAGE_SIZE);
  const temMais = atrasadosVisiveis.length < atrasadosList.length;

  // ── Glosas ────────────────────────────────────────────────────────────────
  const glosa60 = atraso60.count * 0.2;
  const iapGlosa = getIAPGlosa(iap.valor);
  const glosaTotalCalc = iapGlosa + glosa60;

  if (loading) return <SkeletonList count={4} />;

  const indicatorValues = { IAP: iap.valor, IQS: iqs.valor, ICT: ict.valor, ISS: iss.valor };
  const indicatorDetails: Record<string, string> = {
    IAP: `${iap.qdap} de ${iap.qdtot} no prazo`,
    IQS: `${iqs.qde - iqs.qdr} de ${iqs.qde} sem rejeição`,
    ICT: `${ict.total} demandas avaliadas`,
    ISS: `${iss.total} demandas avaliadas`,
  };

  return (
    <div className="space-y-6">
      {/* ── Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Indicadores Grupo 2 — IMR
          </h3>
          <p className="text-xs text-muted-foreground">Instrumento de Medição de Resultados</p>
        </div>
        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {periodOptions.map((p) => (
              <SelectItem key={p.value} value={p.value}>
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* ── Period info ───────────────────────────────────────── */}
      {activePeriod && (
        <p className="text-xs text-muted-foreground px-1">
          Período de apuração: {activePeriod.start.toLocaleDateString("pt-BR")} —{" "}
          {activePeriod.end.toLocaleDateString("pt-BR")}
        </p>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {INDICADORES_GRUPO2.map((ind) => {
          const valor = indicatorValues[ind.sigla as keyof typeof indicatorValues];
          const faixa = getIndicadorFaixa(ind, valor);
          const Icon = INDICATOR_ICONS[ind.sigla] || Target;
          const hasData =
            ind.sigla === "ISS"
              ? iss.total > 0
              : ind.sigla === "ICT"
                ? ict.total > 0
                : ind.sigla === "IQS"
                  ? iqs.qde > 0
                  : iap.qdtot > 0;

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
                      {!hasData ? "N/A" : ind.sigla === "ISS" ? valor.toFixed(1) : `${valor.toFixed(1)}%`}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      Meta: ≥ {ind.meta}
                      {ind.unidade}
                    </p>
                    {ind.sigla === "IAP" && activePeriod && (
                      <p className="text-[10px] text-muted-foreground italic">Período: {activePeriod.label}</p>
                    )}
                    {hasData && faixa.glosa > 0 && (
                      <Badge variant="destructive" className="text-[10px]">
                        Glosa: {faixa.glosa}%
                      </Badge>
                    )}
                  </div>
                  <div
                    className={`h-9 w-9 rounded-lg flex items-center justify-center ${COR_MAP[faixa.cor]} bg-background/50`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                </div>
                {hasData && <p className="text-[10px] text-muted-foreground mt-1">{indicatorDetails[ind.sigla]}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Atraso >60 dias: contador + lista paginada ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
        {/* Contador — 2/5 */}
        <Card className={`lg:col-span-2 ${atraso60.count > 0 ? "border-destructive/30" : ""}`}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase font-semibold tracking-wide">
                  Atraso &gt; 60 dias
                </p>
                <p className={`text-5xl font-bold mt-2 ${atraso60.count > 0 ? "text-destructive" : ""}`}>
                  {atraso60.count}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">demandas em atraso crítico</p>
                {glosa60 > 0 && (
                  <Badge variant="destructive" className="mt-3 text-[11px] px-2">
                    Glosa acumulada: {glosa60.toFixed(2)}%
                  </Badge>
                )}
              </div>
              <div
                className={`h-16 w-16 rounded-2xl flex items-center justify-center shrink-0 ${
                  atraso60.count > 0 ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"
                }`}
              >
                <Clock className="h-8 w-8" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lista paginada — 3/5 — altura fixa + scroll interno */}
        <Card className="lg:col-span-3 flex flex-col" style={{ height: "280px" }}>
          <CardHeader className="pb-2 shrink-0">
            <CardTitle className="text-sm flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                Demandas com atraso crítico
              </span>
              {atrasadosList.length > 0 && (
                <Badge variant="destructive" className="text-[10px] h-5 px-1.5 font-bold">
                  {atrasadosList.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0 flex-1 flex flex-col min-h-0">
            {atrasadosList.length === 0 ? (
              /* Estado vazio */
              <div className="flex flex-col items-center justify-center flex-1 gap-2">
                <Clock className="h-8 w-8 text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground">Nenhuma demanda com atraso &gt; 60 dias</p>
              </div>
            ) : (
              <>
                {/* Scroll interno — não expande a página */}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin scrollbar-thumb-muted">
                  {atrasadosVisiveis.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-3 p-2.5 rounded-lg border border-destructive/20 bg-destructive/5"
                    >
                      <span className="h-2 w-2 rounded-full bg-destructive shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{a.rhm}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{a.projeto}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold text-destructive bg-destructive/10 rounded px-1.5 py-0.5">
                          {a.diasAtraso}d
                        </span>
                        <p className="text-[9px] text-muted-foreground mt-0.5">Glosa 0,2%</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Rodapé paginação */}
                <div className="flex items-center justify-between pt-2 shrink-0 border-t border-border/40 mt-1">
                  <span className="text-[11px] text-muted-foreground">
                    Exibindo <strong>{atrasadosVisiveis.length}</strong> de <strong>{atrasadosList.length}</strong>
                  </span>
                  <div className="flex gap-1">
                    {temMais && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setAtrasadosPage((p) => p + 1)}
                      >
                        Ver mais <ChevronDown className="h-3 w-3" />
                      </Button>
                    )}
                    {atrasadosPage > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => setAtrasadosPage(1)}
                      >
                        Recolher <ChevronUp className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Resumo de Glosas ──────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-destructive" />
            Resumo de Glosas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <GlosaCell
              label="Glosa IAP"
              value={`${iapGlosa.toFixed(2)}%`}
              sub={`IAP: ${iap.qdtot > 0 ? `${iap.valor.toFixed(1)}%` : "N/A"}`}
              active={iapGlosa > 0}
            />
            <GlosaCell
              label="Glosa +60"
              value={`${glosa60.toFixed(2)}%`}
              sub={`${atraso60.count} demandas`}
              active={glosa60 > 0}
            />
            <GlosaCell label="Glosa Total" value={`${glosaTotalCalc.toFixed(2)}%`} active={glosaTotalCalc > 0} />
          </div>

          {Object.keys(glosas.byEvento).length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase">Eventos Registrados</p>
              {Object.entries(glosas.byEvento).map(([ev, data]) => {
                const cfg = EVENTOS_CONFIG.find((e) => e.codigo === ev);
                return (
                  <div key={ev} className="flex items-center justify-between text-xs bg-muted/50 p-2 rounded">
                    <span className="font-medium truncate mr-2">
                      {ev} — {cfg?.descricao.slice(0, 40)}...
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-[10px]">
                        {data.count}x
                      </Badge>
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
  );
}

// ─── GlosaCell ────────────────────────────────────────────────────────────────

function GlosaCell({ label, value, sub, active }: { label: string; value: string; sub?: string; active: boolean }) {
  return (
    <div className={`p-3 rounded-lg border ${active ? "border-destructive/30 bg-destructive/5" : "border-border"}`}>
      <p className="text-[10px] text-muted-foreground uppercase font-semibold">{label}</p>
      <p className={`text-xl font-bold ${active ? "text-destructive" : ""}`}>{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}
