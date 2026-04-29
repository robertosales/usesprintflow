// src/features/sustentacao/components/reports/RelatorioProdutividade.tsx

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useDemandas } from "../../hooks/useDemandas";
import { useAllTransitions, useAllHours, useProfiles } from "../../hooks/useAllTransitions";
import { ReportHeader, ReportLegend } from "./ReportHeader";
import { ExportButton } from "@/components/dashboard/ExportButton";
import { getReportConfig } from "../../utils/reportConfig";
import { useAuth } from "@/contexts/AuthContext";
import { ChevronDown, ChevronRight, ClipboardList, CheckCircle2, Clock, AlertTriangle, FileText } from "lucide-react";

// ── helpers ───────────────────────────────────────────────────────────────────

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

const SITUACAO_LABEL: Record<string, { label: string; cls: string }> = {
  concluido: { label: "Concluído", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  resolvido: { label: "Resolvido", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  aceite_final: { label: "Aceite", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  em_andamento: { label: "Em andamento", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  em_analise: { label: "Em análise", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  em_execucao: { label: "Em execução", cls: "bg-blue-100 text-blue-700 border-blue-200" },
  aberto: { label: "Aberto", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  nova: { label: "Nova", cls: "bg-orange-100 text-orange-700 border-orange-200" },
  cancelado: { label: "Cancelado", cls: "bg-gray-100 text-gray-500 border-gray-200" },
  rejeitado: { label: "Rejeitado", cls: "bg-red-100 text-red-700 border-red-200" },
};

function SituacaoBadge({ situacao }: { situacao?: string | null }) {
  const s = SITUACAO_LABEL[situacao?.toLowerCase() ?? ""];
  return (
    <Badge className={`text-[10px] ${s?.cls ?? "bg-muted text-muted-foreground"}`}>{s?.label ?? situacao ?? "—"}</Badge>
  );
}

function isResolvido(s?: string | null) {
  return ["concluido", "resolvido", "aceite_final"].includes(s?.toLowerCase() ?? "");
}

function rateColor(rate: number) {
  return rate >= 80
    ? "bg-emerald-100 text-emerald-700 border-emerald-200"
    : rate >= 40
      ? "bg-orange-100 text-orange-700 border-orange-200"
      : "bg-destructive/10 text-destructive border-destructive/20";
}

function getInitials(nome: string) {
  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// ── tipos internos ────────────────────────────────────────────────────────────

interface AtividadeRow {
  demandaId: string;
  rhm: string;
  titulo: string;
  situacao: string;
  dataInicio: string;
  dataFim: string;
  horasAnalista: number;
  outrosAnalistas: string[];
}

interface AnalistaGroup {
  userId: string;
  nome: string;
  atividades: AtividadeRow[];
  totalHoras: number;
  resolvidos: number;
  emAberto: number;
  taxaResolucao: number;
}

// ── componente ────────────────────────────────────────────────────────────────

export function RelatorioProdutividade() {
  const { demandas } = useDemandas();
  const { transitions } = useAllTransitions();
  const { hours } = useAllHours();
  const profiles = useProfiles();
  const { teams } = useAuth();

  const [teamId, setTeamId] = useState("all");
  const [analista, setAnalista] = useState("all");
  const [dataInicio, setDataInicio] = useState(daysAgo(30));
  const [dataFim, setDataFim] = useState(today());
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  const sustTeams = teams.filter((t) => t.module === "sustentacao");

  // ✅ Set de IDs com perfil válido — usado para filtrar órfãos em todo o componente
  const profileIds = useMemo(() => new Set(profiles.map((p) => p.user_id)), [profiles]);

  // mapa user_id → nome (apenas perfis válidos)
  const nomeMap = useMemo(() => {
    const m = new Map<string, string>();
    profiles.forEach((p) => m.set(p.user_id, p.display_name || p.email || p.user_id.slice(0, 8)));
    return m;
  }, [profiles]);

  // analistas do time — apenas com perfil válido
  const analistasList = useMemo(() => {
    const idSet = new Set<string>();
    demandas
      .filter((d) => teamId === "all" || d.team_id === teamId)
      .forEach((d) => {
        if (d.responsavel_dev) idSet.add(d.responsavel_dev);
        if (d.responsavel_requisitos) idSet.add(d.responsavel_requisitos);
        if (d.responsavel_teste) idSet.add(d.responsavel_teste);
        if (d.responsavel_arquiteto) idSet.add(d.responsavel_arquiteto);
      });
    hours
      .filter((h) => {
        const d = demandas.find((d) => d.id === h.demanda_id);
        return d && (teamId === "all" || d.team_id === teamId);
      })
      .forEach((h) => idSet.add(h.user_id));

    return profiles
      .filter((p) => idSet.has(p.user_id)) // ✅ garante perfil válido
      .map((p) => ({
        user_id: p.user_id,
        display_name: p.display_name || p.email || p.user_id.slice(0, 8),
      }))
      .sort((a, b) => a.display_name.localeCompare(b.display_name));
  }, [demandas, hours, profiles, teamId]);

  // demandas filtradas por período e time
  const demandasFiltradas = useMemo(() => {
    const inicio = new Date(dataInicio + "T00:00:00");
    const fim = new Date(dataFim + "T23:59:59");
    return demandas.filter((d) => {
      if (teamId !== "all" && d.team_id !== teamId) return false;
      const criado = new Date(d.created_at);
      return criado >= inicio && criado <= fim;
    });
  }, [demandas, teamId, dataInicio, dataFim]);

  // mapa demanda_id → Map<user_id, horas>
  const horasPorDemandaUser = useMemo(() => {
    const m = new Map<string, Map<string, number>>();
    hours.forEach((h) => {
      if (!h.demanda_id || !h.user_id) return;
      if (!m.has(h.demanda_id)) m.set(h.demanda_id, new Map());
      const inner = m.get(h.demanda_id)!;
      inner.set(h.user_id, (inner.get(h.user_id) ?? 0) + Number(h.horas ?? 0));
    });
    return m;
  }, [hours]);

  // agrupamento por analista → atividades
  const grupos = useMemo(() => {
    // Coleta todos os user_ids participantes
    const todosIds = new Set<string>();
    demandasFiltradas.forEach((d) => {
      if (d.responsavel_dev) todosIds.add(d.responsavel_dev);
      if (d.responsavel_requisitos) todosIds.add(d.responsavel_requisitos);
      if (d.responsavel_teste) todosIds.add(d.responsavel_teste);
      if (d.responsavel_arquiteto) todosIds.add(d.responsavel_arquiteto);
      horasPorDemandaUser.get(d.id)?.forEach((_, uid) => todosIds.add(uid));
    });

    // ✅ Filtra apenas IDs com perfil válido — remove qualquer UUID órfão
    const ids = analista !== "all" ? [analista] : [...todosIds].filter((id) => profileIds.has(id));

    const result: AnalistaGroup[] = ids.map((userId) => {
      const atividades: AtividadeRow[] = demandasFiltradas
        .filter((d) => {
          const eResponsavel =
            d.responsavel_dev === userId ||
            d.responsavel_requisitos === userId ||
            d.responsavel_teste === userId ||
            d.responsavel_arquiteto === userId;
          const lancouHora = horasPorDemandaUser.get(d.id)?.has(userId) ?? false;
          return eResponsavel || lancouHora;
        })
        .map((d) => {
          const horasAnalista = horasPorDemandaUser.get(d.id)?.get(userId) ?? 0;

          // Outros analistas da mesma demanda
          const outrosIds = new Set<string>();
          if (d.responsavel_dev && d.responsavel_dev !== userId) outrosIds.add(d.responsavel_dev);
          if (d.responsavel_requisitos && d.responsavel_requisitos !== userId) outrosIds.add(d.responsavel_requisitos);
          if (d.responsavel_teste && d.responsavel_teste !== userId) outrosIds.add(d.responsavel_teste);
          if (d.responsavel_arquiteto && d.responsavel_arquiteto !== userId) outrosIds.add(d.responsavel_arquiteto);
          horasPorDemandaUser.get(d.id)?.forEach((_, uid) => {
            if (uid !== userId) outrosIds.add(uid);
          });

          // Data fim via aceite ou última transição de conclusão
          const conclusao = transitions
            .filter((t) => t.demanda_id === d.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .find((t) => ["aceite_final", "concluido", "resolvido"].includes(t.to_status ?? ""));

          return {
            demandaId: d.id,
            rhm: d.rhm || "—",
            titulo: d.projeto || d.titulo || "—",
            situacao: d.situacao || "—",
            dataInicio: fmtDate(d.created_at),
            dataFim: fmtDate(d.aceite_data ?? conclusao?.created_at ?? null),
            horasAnalista,
            // ✅ filtra órfãos também nos "Outros Analistas"
            outrosAnalistas: [...outrosIds]
              .filter((id) => profileIds.has(id))
              .map((id) => nomeMap.get(id) || id.slice(0, 8)),
          };
        });

      const totalHoras = atividades.reduce((s, a) => s + a.horasAnalista, 0);
      const resolvidos = atividades.filter((a) => isResolvido(a.situacao)).length;
      const emAberto = atividades.length - resolvidos;
      const taxaResolucao = atividades.length > 0 ? (resolvidos / atividades.length) * 100 : 0;

      return {
        userId,
        nome: nomeMap.get(userId) || userId.slice(0, 8),
        atividades,
        totalHoras,
        resolvidos,
        emAberto,
        taxaResolucao,
      };
    });

    return result.filter((g) => g.atividades.length > 0).sort((a, b) => b.resolvidos - a.resolvidos);
  }, [demandasFiltradas, horasPorDemandaUser, transitions, nomeMap, analista, profileIds]);

  // KPIs globais
  const kpis = useMemo(
    () => ({
      totalAtividades: grupos.reduce((s, g) => s + g.atividades.length, 0),
      totalResolvidos: grupos.reduce((s, g) => s + g.resolvidos, 0),
      totalEmAberto: grupos.reduce((s, g) => s + g.emAberto, 0),
      totalHoras: grupos.reduce((s, g) => s + g.totalHoras, 0),
    }),
    [grupos],
  );

  const toggleGroup = (id: string) =>
    setOpenGroups((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const expandAll = () => setOpenGroups(new Set(grupos.map((g) => g.userId)));
  const collapseAll = () => setOpenGroups(new Set());

  const reportCfg = getReportConfig("produtividade");

  const getExportData = () => ({
    title: `Relatório de Produtividade — ${fmtDate(dataInicio)} a ${fmtDate(dataFim)}`,
    headers: ["Analista", "RHM", "Atividade", "Situação", "Data Início", "Data Fim", "Horas", "Outros Analistas"],
    rows: grupos.flatMap((g) =>
      g.atividades.map((a) => [
        g.nome,
        a.rhm,
        a.titulo,
        a.situacao,
        a.dataInicio,
        a.dataFim,
        a.horasAnalista.toFixed(1),
        a.outrosAnalistas.join(", ") || "—",
      ]),
    ),
  });

  return (
    <div className="space-y-5">
      <ReportHeader
        tipoRelatorio="Relatório de Produtividade"
        periodo={`${fmtDate(dataInicio)} a ${fmtDate(dataFim)}`}
        modulo={reportCfg.modulo}
      />

      {/* Título */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Produtividade por Analista
          </h2>
          <p className="text-sm text-muted-foreground">
            Atividades individuais com RHM, situação e datas — uma atividade pode ter múltiplos analistas
          </p>
        </div>
        <ExportButton getData={getExportData} />
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap gap-4 items-end">
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

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Analista</Label>
              <Select value={analista} onValueChange={setAnalista}>
                <SelectTrigger className="w-[200px] h-8 text-xs">
                  <SelectValue placeholder="Todos" />
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

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Data Início</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold">Data Fim</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="h-8 text-xs w-[140px]"
              />
            </div>

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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {
            label: "Total Atividades",
            value: kpis.totalAtividades,
            icon: <ClipboardList className="h-4 w-4 text-blue-600" />,
            cls: "bg-blue-100 dark:bg-blue-950/30",
          },
          {
            label: "Resolvidos",
            value: kpis.totalResolvidos,
            icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
            cls: "bg-emerald-100 dark:bg-emerald-950/30",
          },
          {
            label: "Em Aberto",
            value: kpis.totalEmAberto,
            icon: (
              <AlertTriangle
                className={`h-4 w-4 ${kpis.totalEmAberto > 10 ? "text-destructive" : "text-orange-500"}`}
              />
            ),
            cls: kpis.totalEmAberto > 10 ? "bg-destructive/10" : "bg-orange-100 dark:bg-orange-950/30",
          },
          {
            label: "Horas Lançadas",
            value: `${kpis.totalHoras.toFixed(1)}h`,
            icon: <Clock className="h-4 w-4 text-primary" />,
            cls: "bg-primary/10",
          },
        ].map(({ label, value, icon, cls }) => (
          <Card key={label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${cls}`}>{icon}</div>
              <div>
                <p className="text-[10px] text-muted-foreground">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Controles expand/collapse */}
      {grupos.length > 0 && (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" className="text-xs" onClick={expandAll}>
            Expandir tudo
          </Button>
          <Button size="sm" variant="ghost" className="text-xs" onClick={collapseAll}>
            Recolher tudo
          </Button>
        </div>
      )}

      {/* Grupos por analista */}
      {grupos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center">
            <p className="text-sm text-muted-foreground">Nenhuma atividade encontrada para os filtros selecionados.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {grupos.map((grupo) => {
            const isOpen = openGroups.has(grupo.userId);
            return (
              <Card key={grupo.userId} className="overflow-hidden">
                <Collapsible open={isOpen} onOpenChange={() => toggleGroup(grupo.userId)}>
                  <CollapsibleTrigger asChild>
                    <CardHeader className="pb-3 cursor-pointer hover:bg-muted/40 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-sm">
                            {getInitials(grupo.nome)}
                          </div>
                          <div>
                            <p className="text-sm font-semibold">{grupo.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {grupo.atividades.length} atividade{grupo.atividades.length !== 1 ? "s" : ""} ·{" "}
                              {grupo.totalHoras.toFixed(1)}h lançadas
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={`text-[10px] ${rateColor(grupo.taxaResolucao)}`}>
                            {grupo.taxaResolucao.toFixed(0)}% resolução
                          </Badge>
                          <Badge variant="outline" className="text-[10px]">
                            {grupo.resolvidos} resolvidos
                          </Badge>
                          {grupo.emAberto > 0 && (
                            <Badge className="text-[10px] bg-orange-100 text-orange-700 border-orange-200">
                              {grupo.emAberto} em aberto
                            </Badge>
                          )}
                          {isOpen ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 px-0 pb-0">
                      <div className="overflow-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-muted/30">
                              <TableHead className="font-semibold text-xs pl-4 w-[90px]">RHM</TableHead>
                              <TableHead className="font-semibold text-xs">Atividade</TableHead>
                              <TableHead className="font-semibold text-xs">Situação</TableHead>
                              <TableHead className="font-semibold text-xs text-right">Dt. Início</TableHead>
                              <TableHead className="font-semibold text-xs text-right">Dt. Fim</TableHead>
                              <TableHead className="font-semibold text-xs text-right">Horas</TableHead>
                              <TableHead className="font-semibold text-xs pr-4">Outros Analistas</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {grupo.atividades.map((a) => (
                              <TableRow key={`${grupo.userId}-${a.demandaId}`} className="hover:bg-muted/20">
                                <TableCell className="text-xs font-mono pl-4">{a.rhm}</TableCell>
                                <TableCell className="text-xs max-w-[200px]">
                                  <span className="line-clamp-2" title={a.titulo}>
                                    {a.titulo}
                                  </span>
                                </TableCell>
                                <TableCell className="text-xs">
                                  <SituacaoBadge situacao={a.situacao} />
                                </TableCell>
                                <TableCell className="text-right text-xs tabular-nums">{a.dataInicio}</TableCell>
                                <TableCell className="text-right text-xs tabular-nums">{a.dataFim}</TableCell>
                                <TableCell className="text-right text-xs tabular-nums font-medium">
                                  {a.horasAnalista > 0 ? `${a.horasAnalista.toFixed(1)}h` : "—"}
                                </TableCell>
                                <TableCell className="text-xs pr-4">
                                  {a.outrosAnalistas.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {a.outrosAnalistas.map((n) => (
                                        <Badge key={n} variant="secondary" className="text-[10px] font-normal">
                                          {n}
                                        </Badge>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}

                            {/* Subtotal */}
                            <TableRow className="bg-muted/20 border-t font-semibold">
                              <TableCell colSpan={5} className="text-xs pl-4 text-muted-foreground">
                                Subtotal — {grupo.nome}
                              </TableCell>
                              <TableCell className="text-right text-xs tabular-nums">
                                {grupo.totalHoras.toFixed(1)}h
                              </TableCell>
                              <TableCell className="pr-4" />
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      <ReportLegend
        items={[
          { sigla: "RHM", descricao: "Identificador único da atividade no sistema" },
          { sigla: "Horas", descricao: "Horas lançadas pelo analista nesta atividade" },
          { sigla: "Outros Analistas", descricao: "Demais pessoas que também participaram da mesma atividade" },
          { sigla: "Taxa Resolução", descricao: "Atividades resolvidas ÷ total × 100 — por analista" },
          { sigla: "Data Fim", descricao: "Data de aceite ou da última transição de conclusão" },
        ]}
      />
    </div>
  );
}
