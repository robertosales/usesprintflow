import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDemandas } from "../../hooks/useDemandas";
import { useAllTransitions, useAllHours, useProfiles } from "../../hooks/useAllTransitions";
import { calcProdutividade, formatHours } from "../../utils/kpiCalculations";
import { ReportHeader, ReportLegend } from "./ReportHeader";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { getReportConfig } from "../../utils/reportConfig";
import { useAuth } from "@/contexts/AuthContext";
import { User, Calendar, ClipboardList, CheckCircle2, Clock, AlertTriangle, FileText } from "lucide-react";

// ── Helpers ───────────────────────────────────────────────────────────────
const SITUACAO_COLORS: Record<string, string> = {
  concluido: "bg-emerald-100 text-emerald-700 border-emerald-200",
  resolvido: "bg-emerald-100 text-emerald-700 border-emerald-200",
  em_andamento: "bg-blue-100 text-blue-700 border-blue-200",
  aberto: "bg-orange-100 text-orange-700 border-orange-200",
  cancelado: "bg-gray-100 text-gray-500 border-gray-200",
  rejeitado: "bg-red-100 text-red-700 border-red-200",
};

function situacaoBadge(situacao: string) {
  const cls = SITUACAO_COLORS[situacao?.toLowerCase()] ?? "bg-muted text-muted-foreground";
  return <Badge className={`text-[10px] capitalize ${cls}`}>{situacao?.replace(/_/g, " ") || "—"}</Badge>;
}

function fmtDate(d?: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR");
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

// ── Componente ─────────────────────────────────────────────────────────────
export function RelatorioIndividual() {
  const { demandas } = useDemandas();
  const { transitions } = useAllTransitions();
  const { hours } = useAllHours();
  const profiles = useProfiles();
  const { teams } = useAuth();

  // ── Filtros ───────────────────────────────────────────────────────────
  const [teamId, setTeamId] = useState("all");
  const [analista, setAnalista] = useState("all");
  const [dataInicio, setDataInicio] = useState(daysAgo(30));
  const [dataFim, setDataFim] = useState(today());
  const [sortKey, setSortKey] = useState("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sustTeams = teams.filter((t) => t.module === "sustentacao");

  // ── Analistas do time selecionado ─────────────────────────────────────
  const analistasList = useMemo(() => {
    // Pega membros do time selecionado a partir dos perfis que aparecem
    // nas demandas desse time — garante que só aparecem quem tem atividade
    const idSet = new Set<string>();
    demandas
      .filter((d) => teamId === "all" || d.team_id === teamId)
      .forEach((d) => {
        if (d.responsavel_dev) idSet.add(d.responsavel_dev);
        if (d.responsavel_requisitos) idSet.add(d.responsavel_requisitos);
        if (d.responsavel_teste) idSet.add(d.responsavel_teste);
        if (d.responsavel_arquiteto) idSet.add(d.responsavel_arquiteto);
      });

    return profiles
      .filter((p) => idSet.has(p.user_id))
      .map((p) => ({ user_id: p.user_id, display_name: p.display_name || p.email || p.user_id }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [demandas, profiles, teamId]);

  // ── Demandas filtradas ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const inicio = new Date(dataInicio + "T00:00:00");
    const fim = new Date(dataFim + "T23:59:59");

    return demandas.filter((d) => {
      const criado = new Date(d.created_at);
      if (teamId !== "all" && d.team_id !== teamId) return false;
      if (criado < inicio || criado > fim) return false;
      if (analista !== "all") {
        const cols = [d.responsavel_dev, d.responsavel_requisitos, d.responsavel_teste, d.responsavel_arquiteto];
        if (!cols.includes(analista)) return false;
      }
      return true;
    });
  }, [demandas, teamId, analista, dataInicio, dataFim]);

  // ── KPIs individuais ──────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const total = filtered.length;
    const resolvidos = filtered.filter((d) =>
      ["concluido", "resolvido"].includes(d.situacao?.toLowerCase() ?? ""),
    ).length;
    const emAberto = filtered.filter((d) =>
      ["aberto", "em_andamento"].includes(d.situacao?.toLowerCase() ?? ""),
    ).length;
    const taxa = total > 0 ? (resolvidos / total) * 100 : 0;

    const horasAnalista = hours
      .filter((h) => {
        if (analista !== "all" && h.user_id !== analista) return false;
        const d = new Date(h.created_at);
        return d >= new Date(dataInicio) && d <= new Date(dataFim + "T23:59:59");
      })
      .reduce((s, h) => s + (h.hours ?? 0), 0);

    return { total, resolvidos, emAberto, taxa, horasAnalista };
  }, [filtered, hours, analista, dataInicio, dataFim]);

  // ── Ordenação da tabela ───────────────────────────────────────────────
  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const sortedDemandas = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const va = (a as any)[sortKey] ?? "";
      const vb = (b as any)[sortKey] ?? "";
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [filtered, sortKey, sortDir]);

  // ── Export ────────────────────────────────────────────────────────────
  const analistaNome =
    analista === "all" ? "Todos" : (analistasList.find((a) => a.user_id === analista)?.display_name ?? analista);

  const getExportData = () => ({
    title: `Relatório Individual de Produtividade — ${analistaNome}`,
    headers: ["RHM", "Projeto", "Tipo", "Situação", "Data Início", "Data Fim", "Horas Lançadas"],
    rows: sortedDemandas.map((d) => [
      d.rhm || "—",
      d.projeto || "—",
      d.tipo || "—",
      d.situacao || "—",
      fmtDate(d.created_at),
      fmtDate(d.data_previsao_encerramento ?? d.aceite_data),
      hours
        .filter((h) => h.demanda_id === d.id)
        .reduce((s, h) => s + (h.hours ?? 0), 0)
        .toFixed(1),
    ]),
  });

  // ── Helpers render ────────────────────────────────────────────────────
  const SortableHead = ({ label, field, align = "right" }: { label: string; field: string; align?: string }) => (
    <TableHead
      className={`text-${align} cursor-pointer hover:text-foreground select-none font-semibold whitespace-nowrap`}
      onClick={() => toggleSort(field)}
    >
      {label} {sortKey === field ? (sortDir === "desc" ? "↓" : "↑") : ""}
    </TableHead>
  );

  const rateColor = (rate: number) =>
    rate >= 80
      ? "bg-emerald-100 text-emerald-700 border-emerald-200"
      : rate >= 40
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : "bg-destructive/10 text-destructive border-destructive/20";

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      <ReportHeader
        tipoRelatorio="Relatório Individual de Produtividade"
        periodo={`${fmtDate(dataInicio)} a ${fmtDate(dataFim)}`}
        modulo="sustentacao"
      />

      {/* Título + ações */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Produtividade Individual
          </h2>
          <p className="text-sm text-muted-foreground">Atividades por analista com RHM, situação e datas</p>
        </div>
        <ExportButton getData={getExportData} />
      </div>

      {/* ── Filtros ── */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Time */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Time</Label>
              <Select
                value={teamId}
                onValueChange={(v) => {
                  setTeamId(v);
                  setAnalista("all");
                }}
              >
                <SelectTrigger className="w-[160px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os times</SelectItem>
                  {sustTeams.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Analista — apenas membros do time */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Analista</Label>
              <Select value={analista} onValueChange={setAnalista}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Todos analistas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos analistas</SelectItem>
                  {analistasList.map((a) => (
                    <SelectItem key={a.user_id} value={a.user_id}>
                      {a.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Data Início */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
            </div>

            {/* Data Fim */}
            <div className="space-y-1">
              <Label className="text-xs font-semibold">Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
            </div>

            {/* Atalhos de período */}
            <div className="flex gap-1 items-end pb-0.5">
              {[
                { label: "7d", days: 7 },
                { label: "30d", days: 30 },
                { label: "90d", days: 90 },
              ].map(({ label, days }) => (
                <Button
                  key={label}
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs px-2"
                  onClick={() => {
                    setDataInicio(daysAgo(days));
                    setDataFim(today());
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-blue-100 dark:bg-blue-950/30 flex items-center justify-center">
              <ClipboardList className="h-4 w-4 text-blue-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total Atividades</p>
              <p className="text-xl font-bold">{kpis.total}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-emerald-100 dark:bg-emerald-950/30 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Resolvidos</p>
              <p className="text-xl font-bold">{kpis.resolvidos}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Taxa Resolução</p>
              <p className="text-xl font-bold">{kpis.taxa.toFixed(1)}%</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div
              className={`h-9 w-9 rounded-lg flex items-center justify-center ${kpis.emAberto > 5 ? "bg-destructive/10" : "bg-muted"}`}
            >
              <AlertTriangle
                className={`h-4 w-4 ${kpis.emAberto > 5 ? "text-destructive" : "text-muted-foreground"}`}
              />
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Em Aberto</p>
              <p className={`text-xl font-bold ${kpis.emAberto > 5 ? "text-destructive" : ""}`}>{kpis.emAberto}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Tabela de atividades ── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Atividades — {analistaNome}
            <Badge variant="secondary" className="ml-auto text-xs">
              {filtered.length} registros
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDemandas.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhuma atividade encontrada para o período e filtros selecionados.
            </p>
          ) : (
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <SortableHead label="RHM" field="rhm" align="left" />
                    <SortableHead label="Projeto" field="projeto" align="left" />
                    <SortableHead label="Tipo" field="tipo" align="left" />
                    <SortableHead label="Situação" field="situacao" align="left" />
                    <SortableHead label="Data Início" field="created_at" align="right" />
                    <SortableHead label="Data Fim" field="data_previsao_encerramento" align="right" />
                    <SortableHead label="Horas" field="horasLancadas" align="right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedDemandas.map((d) => {
                    const horasDemanda = hours
                      .filter((h) => h.demanda_id === d.id)
                      .reduce((s, h) => s + (h.hours ?? 0), 0);

                    return (
                      <TableRow key={d.id} className="hover:bg-muted/30">
                        <TableCell className="text-xs font-mono font-medium">{d.rhm || "—"}</TableCell>
                        <TableCell className="text-xs max-w-[180px] truncate" title={d.projeto}>
                          {d.projeto || "—"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {d.tipo ? (
                            <Badge variant="outline" className="text-[10px]">
                              {d.tipo}
                            </Badge>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{situacaoBadge(d.situacao)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{fmtDate(d.created_at)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {fmtDate(d.data_previsao_encerramento ?? d.aceite_data)}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {horasDemanda > 0 ? `${horasDemanda.toFixed(1)}h` : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {/* Linha de totais */}
                  <TableRow className="bg-muted/30 font-semibold border-t-2">
                    <TableCell colSpan={4} className="text-xs">
                      Total
                    </TableCell>
                    <TableCell colSpan={2} className="text-right text-xs">
                      <Badge className={`text-[10px] ${rateColor(kpis.taxa)}`}>{kpis.taxa.toFixed(1)}% resolução</Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{kpis.horasAnalista.toFixed(1)}h</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Gráfico de barras por situação ── */}
      {sortedDemandas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Distribuição por Situação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(
              sortedDemandas.reduce<Record<string, number>>((acc, d) => {
                const s = d.situacao || "sem_situacao";
                acc[s] = (acc[s] ?? 0) + 1;
                return acc;
              }, {}),
            )
              .sort((a, b) => b[1] - a[1])
              .map(([sit, count]) => {
                const max = sortedDemandas.length;
                return (
                  <div key={sit} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground capitalize">{sit.replace(/_/g, " ")}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${(count / max) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
          </CardContent>
        </Card>
      )}

      <ReportLegend
        items={[
          { sigla: "RHM", descricao: "Identificador único da demanda no sistema" },
          { sigla: "Taxa Resolução", descricao: "Demandas resolvidas ÷ total atribuídas × 100" },
          { sigla: "Data Início", descricao: "Data de criação da demanda" },
          { sigla: "Data Fim", descricao: "Previsão de encerramento ou data de aceite" },
          { sigla: "Horas", descricao: "Total de horas lançadas na demanda" },
        ]}
      />
    </div>
  );
}
