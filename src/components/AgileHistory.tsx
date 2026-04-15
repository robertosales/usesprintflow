import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Spade, MessageSquare, Search, BarChart3, Eye, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface SprintScoreBreakdown {
  P: number;
  M: number;
  G: number;
  GG: number;
  XG: number;
  total: number;
  totalPoints: number;
  totalHours: number;
}

interface PlanningSessionHistory {
  id: string;
  sprintId: string;
  sprintName: string;
  deckMode: string;
  status: string;
  createdAt: string;
  finishedAt: string | null;
  createdBy: string;
  participantCount: number;
  husVoted: number;
}

interface RetroSessionHistory {
  id: string;
  sprintId: string;
  sprintName: string;
  model: string;
  status: string;
  createdAt: string;
  finishedAt: string | null;
  createdBy: string;
  cardCount: number;
  actionCount: number;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const RETRO_MODEL_LABELS: Record<string, string> = {
  "4ls": "4Ls",
  start_stop_continue: "Iniciar/Parar/Continuar",
  mad_sad_glad: "Frustrado/Triste/Feliz",
  starfish: "Estrela do Mar",
  kpt: "KPT",
};

// vote_value → tamanho de camiseta
const SIZE_MAP: Record<string, keyof Omit<SprintScoreBreakdown, "total" | "totalPoints" | "totalHours">> = {
  "½": "P",
  "1": "P",
  "2": "P",
  "3": "M",
  "5": "G",
  "6": "G",
  "7": "G",
  "8": "G",
  "13": "GG",
  "21": "XG",
  "40": "XG",
  "100": "XG",
  "?": "XG",
  "☕": "XG",
};

// tamanho → pontos representativos (valor médio/referência)
const POINTS_MAP: Record<string, number> = {
  P: 2,
  M: 3,
  G: 6,
  GG: 13,
  XG: 21,
};

// tamanho → horas
const HOURS_MAP: Record<string, number> = {
  P: 4,
  M: 6,
  G: 12,
  GG: 16,
  XG: 24,
};

function classifyVote(value: string): keyof Omit<SprintScoreBreakdown, "total" | "totalPoints" | "totalHours"> | null {
  if (value === "½") return "P";
  return SIZE_MAP[value] ?? null;
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function AgileHistory() {
  const { currentTeamId, profile } = useAuth();
  const { sprints } = useSprint();
  const [tab, setTab] = useState("planning");
  const [planningSessions, setPlanningSessions] = useState<PlanningSessionHistory[]>([]);
  const [retroSessions, setRetroSessions] = useState<RetroSessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sprintFilter, setSprintFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [detailSession, setDetailSession] = useState<any>(null);
  const [detailType, setDetailType] = useState<"planning" | "retro">("planning");
  const [detailVotes, setDetailVotes] = useState<any[]>([]);
  const [detailCards, setDetailCards] = useState<any[]>([]);
  const [detailActions, setDetailActions] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [sprintScores, setSprintScores] = useState<Record<string, SprintScoreBreakdown>>({});

  // ─── Loaders ────────────────────────────────────────────────────────────────

  const loadProfiles = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("user_id, display_name");
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((p) => {
        map[p.user_id] = p.display_name;
      });
      setProfiles(map);
    }
  }, []);

  const loadPlanningSessions = useCallback(async () => {
    if (!currentTeamId) return;
    const { data } = await supabase
      .from("planning_sessions")
      .select("*")
      .eq("team_id", currentTeamId)
      .in("status", ["finished", "cancelled"])
      .order("created_at", { ascending: false });

    if (!data) return;

    const sessions: PlanningSessionHistory[] = [];
    const scores: Record<string, SprintScoreBreakdown> = {};

    for (const s of data) {
      const sprint = sprints.find((sp) => sp.id === s.sprint_id);

      const { data: votedHus } = await supabase
        .from("planning_votes")
        .select("hu_id, user_id, vote_value")
        .eq("session_id", s.id);

      const uniqueHus = new Set(votedHus?.map((v) => v.hu_id) || []);

      // Calcular pontuação final por HU apenas em sessões finalizadas
      if (s.status === "finished" && votedHus?.length) {
        const sprintId = s.sprint_id;
        if (!scores[sprintId]) {
          scores[sprintId] = {
            P: 0,
            M: 0,
            G: 0,
            GG: 0,
            XG: 0,
            total: 0,
            totalPoints: 0,
            totalHours: 0,
          };
        }

        // Agrupar votos por HU
        const byHu: Record<string, string[]> = {};
        votedHus.forEach((v) => {
          if (!byHu[v.hu_id]) byHu[v.hu_id] = [];
          byHu[v.hu_id].push(v.vote_value);
        });

        Object.values(byHu).forEach((votes) => {
          // Voto consensual = mais votado; em empate, usa a mediana numérica
          const freq: Record<string, number> = {};
          votes.forEach((v) => {
            freq[v] = (freq[v] || 0) + 1;
          });
          const maxFreq = Math.max(...Object.values(freq));
          const candidates = Object.entries(freq)
            .filter(([, f]) => f === maxFreq)
            .map(([v]) => v);

          let finalVote = candidates[0];
          if (candidates.length > 1) {
            const nums = candidates
              .map((v) => parseFloat(v === "½" ? "0.5" : v))
              .filter((n) => !isNaN(n))
              .sort((a, b) => a - b);
            if (nums.length) finalVote = String(nums[Math.floor(nums.length / 2)]);
          }

          const size = classifyVote(finalVote);
          if (size) {
            scores[sprintId][size]++;
            scores[sprintId].total++;
            scores[sprintId].totalPoints += POINTS_MAP[size];
            scores[sprintId].totalHours += HOURS_MAP[size];
          }
        });
      }

      sessions.push({
        id: s.id,
        sprintId: s.sprint_id,
        sprintName: sprint?.name || "Sprint desconhecida",
        deckMode: s.deck_mode,
        status: s.status,
        createdAt: s.created_at,
        finishedAt: s.finished_at,
        createdBy: s.created_by,
        participantCount: new Set(votedHus?.map((v) => v.user_id) || []).size,
        husVoted: uniqueHus.size,
      });
    }

    setPlanningSessions(sessions);
    setSprintScores(scores);
  }, [currentTeamId, sprints]);

  const loadRetroSessions = useCallback(async () => {
    if (!currentTeamId) return;
    const { data } = await supabase
      .from("retro_sessions")
      .select("*")
      .eq("team_id", currentTeamId)
      .in("status", ["finished", "cancelled"])
      .order("created_at", { ascending: false });

    if (!data) return;

    const sessions: RetroSessionHistory[] = [];
    for (const s of data) {
      const sprint = sprints.find((sp) => sp.id === s.sprint_id);
      const { count: cardCount } = await supabase
        .from("retro_cards")
        .select("*", { count: "exact", head: true })
        .eq("session_id", s.id);
      const { count: actionCount } = await supabase
        .from("retro_actions")
        .select("*", { count: "exact", head: true })
        .eq("session_id", s.id);

      sessions.push({
        id: s.id,
        sprintId: s.sprint_id,
        sprintName: sprint?.name || "Sprint desconhecida",
        model: s.model,
        status: s.status,
        createdAt: s.created_at,
        finishedAt: s.finished_at,
        createdBy: s.created_by,
        cardCount: cardCount || 0,
        actionCount: actionCount || 0,
      });
    }
    setRetroSessions(sessions);
  }, [currentTeamId, sprints]);

  useEffect(() => {
    setLoading(true);
    Promise.all([loadProfiles(), loadPlanningSessions(), loadRetroSessions()]).finally(() => setLoading(false));
  }, [loadProfiles, loadPlanningSessions, loadRetroSessions]);

  // ─── Filtros ────────────────────────────────────────────────────────────────

  const filteredPlanning = useMemo(() => {
    let list = planningSessions;
    if (sprintFilter !== "all") list = list.filter((s) => s.sprintId === sprintFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter((s) => s.sprintName.toLowerCase().includes(q));
    }
    return list;
  }, [planningSessions, sprintFilter, searchTerm]);

  const filteredRetro = useMemo(() => {
    let list = retroSessions;
    if (sprintFilter !== "all") list = list.filter((s) => s.sprintId === sprintFilter);
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(
        (s) => s.sprintName.toLowerCase().includes(q) || RETRO_MODEL_LABELS[s.model]?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [retroSessions, sprintFilter, searchTerm]);

  // ─── Métricas ────────────────────────────────────────────────────────────────

  const planningMetrics = useMemo(() => {
    const finished = planningSessions.filter((s) => s.status === "finished");
    const totalHus = finished.reduce((sum, s) => sum + s.husVoted, 0);
    const totalParticipants = finished.reduce((sum, s) => sum + s.participantCount, 0);
    return {
      sessions: finished.length,
      avgHusPerSession: finished.length > 0 ? (totalHus / finished.length).toFixed(1) : "0",
      avgParticipants: finished.length > 0 ? (totalParticipants / finished.length).toFixed(1) : "0",
      cancelled: planningSessions.filter((s) => s.status === "cancelled").length,
    };
  }, [planningSessions]);

  const retroMetrics = useMemo(() => {
    const finished = retroSessions.filter((s) => s.status === "finished");
    const totalCards = finished.reduce((sum, s) => sum + s.cardCount, 0);
    const totalActions = finished.reduce((sum, s) => sum + s.actionCount, 0);
    return {
      sessions: finished.length,
      avgCards: finished.length > 0 ? (totalCards / finished.length).toFixed(1) : "0",
      avgActions: finished.length > 0 ? (totalActions / finished.length).toFixed(1) : "0",
      cancelled: retroSessions.filter((s) => s.status === "cancelled").length,
    };
  }, [retroSessions]);

  // ─── Detalhes ────────────────────────────────────────────────────────────────

  const openPlanningDetail = async (session: PlanningSessionHistory) => {
    setDetailType("planning");
    setDetailSession(session);
    const { data: votes } = await supabase
      .from("planning_votes")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at");
    setDetailVotes(votes || []);
  };

  const openRetroDetail = async (session: RetroSessionHistory) => {
    setDetailType("retro");
    setDetailSession(session);
    const [{ data: cards }, { data: actions }] = await Promise.all([
      supabase.from("retro_cards").select("*").eq("session_id", session.id).order("votes", { ascending: false }),
      supabase.from("retro_actions").select("*").eq("session_id", session.id).order("created_at"),
    ]);
    setDetailCards(cards || []);
    setDetailActions(actions || []);
  };

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const getVoteDivergence = () => {
    if (!detailVotes.length) return null;
    const byHu: Record<string, string[]> = {};
    detailVotes.forEach((v: any) => {
      if (!byHu[v.hu_id]) byHu[v.hu_id] = [];
      byHu[v.hu_id].push(v.vote_value);
    });
    let totalDivergence = 0;
    let count = 0;
    Object.values(byHu).forEach((votes) => {
      const nums = votes.map((v) => parseFloat(v === "½" ? "0.5" : v)).filter((n) => !isNaN(n));
      if (nums.length >= 2) {
        totalDivergence += Math.max(...nums) - Math.min(...nums);
        count++;
      }
    });
    return count > 0 ? (totalDivergence / count).toFixed(1) : "0";
  };

  // ─── Sub-componente: Card de Pontuação da Sprint ──────────────────────────

  const SprintScoreCard = ({ sprintId, sprintName }: { sprintId: string; sprintName: string }) => {
    const score = sprintScores[sprintId];
    if (!score || score.total === 0) return null;

    const sizes = ["P", "M", "G", "GG", "XG"] as const;

    const colorClasses: Record<string, { badge: string; bar: string }> = {
      P: { badge: "bg-emerald-500/20 text-emerald-600 border-emerald-300", bar: "bg-emerald-400" },
      M: { badge: "bg-blue-500/20 text-blue-600 border-blue-300", bar: "bg-blue-400" },
      G: { badge: "bg-yellow-500/20 text-yellow-600 border-yellow-300", bar: "bg-yellow-400" },
      GG: { badge: "bg-orange-500/20 text-orange-600 border-orange-300", bar: "bg-orange-400" },
      XG: { badge: "bg-red-500/20 text-red-600 border-red-300", bar: "bg-red-400" },
    };

    return (
      <Card className="mb-4">
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" />
            Pontuação da Sprint — {sprintName}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-3 space-y-3">
          {/* Blocos por tamanho */}
          <div className="flex items-end gap-4 flex-wrap">
            {sizes.map((size) => (
              <div key={size} className="flex flex-col items-center gap-1">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded border ${colorClasses[size].badge}`}>
                  {size}
                </span>
                <span className="text-xl font-bold">{score[size]}</span>
                <span className="text-[9px] text-muted-foreground">
                  {score.total > 0 ? Math.round((score[size] / score.total) * 100) : 0}%
                </span>
              </div>
            ))}

            <Separator orientation="vertical" className="h-14 mx-1" />

            {/* Total de HUs */}
            <div className="flex flex-col items-center gap-1">
              <span className="text-[10px] font-bold px-2.5 py-1 rounded border bg-muted text-muted-foreground">
                TOTAL
              </span>
              <span className="text-xl font-bold">{score.total}</span>
              <span className="text-[9px] text-muted-foreground">HUs</span>
            </div>
          </div>

          {/* Barra de distribuição visual */}
          <div className="flex h-2 rounded-full overflow-hidden gap-[1px]">
            {sizes.map((size) =>
              score[size] > 0 ? (
                <div
                  key={size}
                  className={`${colorClasses[size].bar} transition-all`}
                  style={{ width: `${(score[size] / score.total) * 100}%` }}
                  title={`${size}: ${score[size]} HUs`}
                />
              ) : null,
            )}
          </div>

          {/* Totais de Pontos, Horas e Dias */}
          <div className="flex items-center gap-4 pt-2 border-t flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total de Pontos:</span>
              <span className="text-sm font-bold text-primary">{score.totalPoints} pts</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Total de Horas:</span>
              <span className="text-sm font-bold text-blue-500">{score.totalHours}h</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-muted-foreground uppercase font-semibold">Dias úteis (~8h):</span>
              <span className="text-sm font-bold text-muted-foreground">~{(score.totalHours / 8).toFixed(1)}d</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ─── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" /> Histórico Ágil
          </h2>
          <p className="text-sm text-muted-foreground">Consulte sessões passadas de Planning Poker e Retrospectiva</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar..."
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={sprintFilter} onValueChange={setSprintFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <Filter className="h-3 w-3 mr-1" />
            <SelectValue placeholder="Sprint" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Sprints</SelectItem>
            {sprints.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="planning" className="gap-1.5 text-xs">
            <Spade className="h-3.5 w-3.5" /> Planning Poker
          </TabsTrigger>
          <TabsTrigger value="retro" className="gap-1.5 text-xs">
            <MessageSquare className="h-3.5 w-3.5" /> Retrospectiva
          </TabsTrigger>
        </TabsList>

        {/* ── Tab Planning ───────────────────────────────────────────────────── */}
        <TabsContent value="planning">
          {/* Métricas gerais */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Sessões</p>
                <p className="text-2xl font-bold">{planningMetrics.sessions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Média HUs/Sessão</p>
                <p className="text-2xl font-bold">{planningMetrics.avgHusPerSession}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Média Participantes</p>
                <p className="text-2xl font-bold">{planningMetrics.avgParticipants}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Canceladas</p>
                <p className="text-2xl font-bold text-destructive">{planningMetrics.cancelled}</p>
              </CardContent>
            </Card>
          </div>

          {/* ── Cards de pontuação por Sprint ─────────────────────────────── */}
          {sprintFilter !== "all" ? (
            <SprintScoreCard
              sprintId={sprintFilter}
              sprintName={sprints.find((s) => s.id === sprintFilter)?.name || "Sprint"}
            />
          ) : (
            [...new Set(filteredPlanning.filter((s) => s.status === "finished").map((s) => s.sprintId))].map(
              (sprintId) => (
                <SprintScoreCard
                  key={sprintId}
                  sprintId={sprintId}
                  sprintName={filteredPlanning.find((s) => s.sprintId === sprintId)?.sprintName || "Sprint"}
                />
              ),
            )
          )}

          {/* Tabela */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Sprint</TableHead>
                <TableHead className="text-xs">Baralho</TableHead>
                <TableHead className="text-xs">HUs Votadas</TableHead>
                <TableHead className="text-xs">Participantes</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Facilitador</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPlanning.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{formatDate(s.createdAt)}</TableCell>
                  <TableCell className="text-xs font-medium">{s.sprintName}</TableCell>
                  <TableCell className="text-xs">
                    {s.deckMode === "fibonacci" ? "Fibonacci" : s.deckMode === "hours" ? "Horas" : "Custom"}
                  </TableCell>
                  <TableCell className="text-xs">{s.husVoted}</TableCell>
                  <TableCell className="text-xs">{s.participantCount}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        s.status === "finished"
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-destructive/15 text-destructive border-destructive/30",
                      )}
                    >
                      {s.status === "finished" ? "Concluída" : "Cancelada"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{profiles[s.createdBy] || "—"}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs gap-1"
                      onClick={() => openPlanningDetail(s)}
                    >
                      <Eye className="h-3 w-3" /> Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPlanning.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">
                    Nenhuma sessão encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>

        {/* ── Tab Retro ──────────────────────────────────────────────────────── */}
        <TabsContent value="retro">
          {/* Métricas gerais */}
          <div className="grid grid-cols-4 gap-3 mb-4">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Sessões</p>
                <p className="text-2xl font-bold">{retroMetrics.sessions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Média Cards</p>
                <p className="text-2xl font-bold">{retroMetrics.avgCards}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Média Ações</p>
                <p className="text-2xl font-bold">{retroMetrics.avgActions}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-[10px] text-muted-foreground uppercase">Canceladas</p>
                <p className="text-2xl font-bold text-destructive">{retroMetrics.cancelled}</p>
              </CardContent>
            </Card>
          </div>

          {/* Tabela */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Data</TableHead>
                <TableHead className="text-xs">Sprint</TableHead>
                <TableHead className="text-xs">Modelo</TableHead>
                <TableHead className="text-xs">Cards</TableHead>
                <TableHead className="text-xs">Ações</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Facilitador</TableHead>
                <TableHead className="text-xs"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredRetro.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-xs">{formatDate(s.createdAt)}</TableCell>
                  <TableCell className="text-xs font-medium">{s.sprintName}</TableCell>
                  <TableCell className="text-xs">{RETRO_MODEL_LABELS[s.model] || s.model}</TableCell>
                  <TableCell className="text-xs">{s.cardCount}</TableCell>
                  <TableCell className="text-xs">{s.actionCount}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        s.status === "finished"
                          ? "bg-success/15 text-success border-success/30"
                          : "bg-destructive/15 text-destructive border-destructive/30",
                      )}
                    >
                      {s.status === "finished" ? "Concluída" : "Cancelada"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{profiles[s.createdBy] || "—"}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" className="h-6 text-xs gap-1" onClick={() => openRetroDetail(s)}>
                      <Eye className="h-3 w-3" /> Ver
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {filteredRetro.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-xs text-muted-foreground py-8">
                    Nenhuma sessão encontrada
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TabsContent>
      </Tabs>

      {/* ── Dialog de Detalhes ─────────────────────────────────────────────── */}
      <Dialog
        open={!!detailSession}
        onOpenChange={(open) => {
          if (!open) setDetailSession(null);
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {detailType === "planning" ? "Detalhes do Planning Poker" : "Detalhes da Retrospectiva"}
            </DialogTitle>
          </DialogHeader>

          {/* Detalhe Planning */}
          {detailSession && detailType === "planning" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Sprint</p>
                  <p className="text-sm font-medium">{detailSession.sprintName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Baralho</p>
                  <p className="text-sm">{detailSession.deckMode}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Data</p>
                  <p className="text-sm">{formatDate(detailSession.createdAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">HUs Votadas</p>
                    <p className="text-xl font-bold">{detailSession.husVoted}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Participantes</p>
                    <p className="text-xl font-bold">{detailSession.participantCount}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3 text-center">
                    <p className="text-[10px] text-muted-foreground">Divergência Média</p>
                    <p className="text-xl font-bold">{getVoteDivergence()}</p>
                  </CardContent>
                </Card>
              </div>

              <Separator />
              <h3 className="text-sm font-bold">Votos por HU</h3>
              {(() => {
                const byHu: Record<string, any[]> = {};
                detailVotes.forEach((v: any) => {
                  if (!byHu[v.hu_id]) byHu[v.hu_id] = [];
                  byHu[v.hu_id].push(v);
                });
                return Object.entries(byHu).map(([huId, votes]) => (
                  <Card key={huId} className="mb-2">
                    <CardContent className="p-3">
                      <p className="text-xs font-mono text-muted-foreground mb-2">HU: {huId.slice(0, 8)}...</p>
                      <div className="flex flex-wrap gap-2">
                        {votes.map((v: any) => (
                          <Badge key={v.id} variant="outline" className="text-xs">
                            {profiles[v.user_id] || "Participante"}: {v.vote_value}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ));
              })()}
            </div>
          )}

          {/* Detalhe Retro */}
          {detailSession && detailType === "retro" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Sprint</p>
                  <p className="text-sm font-medium">{detailSession.sprintName}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Modelo</p>
                  <p className="text-sm">{RETRO_MODEL_LABELS[detailSession.model] || detailSession.model}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">Data</p>
                  <p className="text-sm">{formatDate(detailSession.createdAt)}</p>
                </div>
              </div>

              <Separator />
              <h3 className="text-sm font-bold">Top 3 Cards (por votos)</h3>
              <div className="space-y-2">
                {detailCards.slice(0, 3).map((card: any, i: number) => (
                  <Card key={card.id} className={cn(i === 0 && "border-warning/50 bg-warning/5")}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <span className="text-lg font-bold text-muted-foreground">#{i + 1}</span>
                      <div className="flex-1">
                        <p className="text-xs">{card.text}</p>
                        <p className="text-[10px] text-muted-foreground">{card.column_key}</p>
                      </div>
                      <Badge variant="secondary">{card.votes} votos</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Separator />
              <h3 className="text-sm font-bold">Todos os Cards ({detailCards.length})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Categoria</TableHead>
                    <TableHead className="text-xs">Texto</TableHead>
                    <TableHead className="text-xs">Votos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailCards.map((card: any) => (
                    <TableRow key={card.id}>
                      <TableCell className="text-xs">{card.column_key}</TableCell>
                      <TableCell className="text-xs">{card.text}</TableCell>
                      <TableCell className="text-xs">{card.votes || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Separator />
              <h3 className="text-sm font-bold">Ações ({detailActions.length})</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">Descrição</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {detailActions.map((action: any, i: number) => (
                    <TableRow key={action.id}>
                      <TableCell className="text-xs">{i + 1}</TableCell>
                      <TableCell className="text-xs">{action.description}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px]">
                          {action.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
