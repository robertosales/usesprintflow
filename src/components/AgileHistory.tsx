import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Spade,
  MessageSquare,
  Search,
  BarChart3,
  Eye,
  Filter,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ThumbsUp,
  Calendar,
  Hash,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type SizeKey = "P" | "M" | "G" | "GG" | "XG";
type DeckMode = "fibonacci" | "hours" | "custom";

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
  deckMode: DeckMode;
  status: "finished" | "cancelled";
  createdAt: string;
  finishedAt: string | null;
  createdBy: string;
  participantCount: number;
  husVoted: number;
  totalHours: number;
}

interface HuVoteSummary {
  huId: string;
  huCode: string;
  huTitle: string;
  votes: { userId: string; value: string }[];
  consensusKey: string | null;
  consensusHours: number;
  hadDivergence: boolean;
}

interface RetroSessionHistory {
  id: string;
  sprintId: string;
  sprintName: string;
  model: string;
  status: "finished" | "cancelled";
  createdAt: string;
  finishedAt: string | null;
  createdBy: string;
  cardCount: number;
  actionCount: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const RETRO_MODEL_LABELS: Record<string, string> = {
  "4ls": "4Ls",
  start_stop_continue: "Iniciar/Parar/Continuar",
  mad_sad_glad: "Frustrado/Triste/Feliz",
  starfish: "Estrela do Mar",
  kpt: "KPT",
};

const SIZE_COLORS: Record<SizeKey, { badge: string; bar: string; text: string }> = {
  P: {
    badge: "bg-emerald-500/15 text-emerald-600 border-emerald-300",
    bar: "bg-emerald-400",
    text: "text-emerald-600",
  },
  M: { badge: "bg-blue-500/15 text-blue-600 border-blue-300", bar: "bg-blue-400", text: "text-blue-600" },
  G: { badge: "bg-yellow-500/15 text-yellow-600 border-yellow-300", bar: "bg-yellow-400", text: "text-yellow-600" },
  GG: { badge: "bg-orange-500/15 text-orange-600 border-orange-300", bar: "bg-orange-400", text: "text-orange-600" },
  XG: { badge: "bg-red-500/15 text-red-600 border-red-300", bar: "bg-red-400", text: "text-red-600" },
};

const HOURS_MAP: Record<SizeKey, number> = { P: 4, M: 6, G: 12, GG: 16, XG: 24 };
const POINTS_MAP: Record<SizeKey, number> = { P: 2, M: 3, G: 6, GG: 13, XG: 21 };
const SIZE_KEYS: SizeKey[] = ["P", "M", "G", "GG", "XG"];

const DECK_MODE_LABELS: Record<string, string> = {
  fibonacci: "Fibonacci",
  hours: "Horas",
  custom: "Custom",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function classifyVoteToSize(value: string): SizeKey | null {
  const map: Record<string, SizeKey> = {
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
  };
  return map[value] ?? null;
}

// Retorna o voto mais frequente (moda); em empate usa o menor valor
function getModeVote(voteValues: string[]): string {
  const freq: Record<string, number> = {};
  voteValues.forEach((v) => {
    freq[v] = (freq[v] || 0) + 1;
  });
  const maxFreq = Math.max(...Object.values(freq));
  const candidates = Object.entries(freq)
    .filter(([, f]) => f === maxFreq)
    .map(([v]) => v);
  if (candidates.length === 1) return candidates[0];
  // empate: retorna o menor numericamente
  const nums = candidates
    .map((v) => parseFloat(v === "½" ? "0.5" : v))
    .filter((n) => !isNaN(n))
    .sort((a, b) => a - b);
  return nums.length ? String(nums[0]) : candidates[0];
}

function calcDivergenceLevel(voteValues: string[], deckMode: string): "none" | "low" | "high" {
  const unique = [...new Set(voteValues.filter((v) => v !== "—"))];
  if (unique.length <= 1) return "none";

  let hours: number[];
  if (deckMode === "hours") {
    hours = unique.map((k) => HOURS_MAP[k as SizeKey] ?? 0).filter((h) => h > 0);
  } else {
    hours = unique
      .map((v) => {
        const size = classifyVoteToSize(v);
        return size ? HOURS_MAP[size] : 0;
      })
      .filter((h) => h > 0);
  }

  if (hours.length < 2) return "none";
  const ratio = Math.max(...hours) / Math.max(Math.min(...hours), 1);
  if (ratio >= 2.5) return "high";
  if (ratio >= 1.8) return "low";
  return "none";
}

// ─── Sub-componentes ─────────────────────────────────────────────────────────

// Métrica simples reutilizável
function MetricCard({ label, value, valueClass }: { label: string; value: string | number; valueClass?: string }) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <p className="text-[10px] text-muted-foreground uppercase mb-1">{label}</p>
        <p className={cn("text-2xl font-bold", valueClass)}>{value}</p>
      </CardContent>
    </Card>
  );
}

// Badge de status
function StatusBadge({ status }: { status: "finished" | "cancelled" }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] gap-1",
        status === "finished"
          ? "bg-success/15 text-success border-success/30"
          : "bg-destructive/15 text-destructive border-destructive/30",
      )}
    >
      {status === "finished" ? (
        <>
          <CheckCircle2 className="h-2.5 w-2.5" /> Concluída
        </>
      ) : (
        <>
          <XCircle className="h-2.5 w-2.5" /> Cancelada
        </>
      )}
    </Badge>
  );
}

// Barra de distribuição de tamanhos
function SizeDistributionBar({ score }: { score: SprintScoreBreakdown }) {
  if (score.total === 0) return null;
  return (
    <div className="flex h-2 rounded-full overflow-hidden gap-px">
      {SIZE_KEYS.map((size) =>
        score[size] > 0 ? (
          <div
            key={size}
            className={cn("transition-all", SIZE_COLORS[size].bar)}
            style={{ width: `${(score[size] / score.total) * 100}%` }}
            title={`${size}: ${score[size]} HUs`}
          />
        ) : null,
      )}
    </div>
  );
}

// Card de pontuação agrupada por sprint
function SprintScoreCard({
  sprintId,
  sprintName,
  score,
}: {
  sprintId: string;
  sprintName: string;
  score: SprintScoreBreakdown;
}) {
  if (!score || score.total === 0) return null;
  return (
    <Card className="mb-4 border-primary/20 bg-primary/5">
      <CardHeader className="pb-2 pt-3 px-4">
        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-primary" />
          Estimativas consolidadas — {sprintName}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex items-end gap-4 flex-wrap">
          {SIZE_KEYS.map((size) => (
            <div key={size} className="flex flex-col items-center gap-1 min-w-[40px]">
              <Badge variant="outline" className={cn("text-[10px] font-bold px-2 py-0.5", SIZE_COLORS[size].badge)}>
                {size}
              </Badge>
              <span className="text-xl font-bold">{score[size]}</span>
              <span className="text-[9px] text-muted-foreground">
                {score.total > 0 ? Math.round((score[size] / score.total) * 100) : 0}%
              </span>
            </div>
          ))}
          <Separator orientation="vertical" className="h-14 mx-1" />
          <div className="flex flex-col items-center gap-1 min-w-[40px]">
            <Badge variant="outline" className="text-[10px] font-bold px-2 py-0.5 bg-muted text-muted-foreground">
              HUs
            </Badge>
            <span className="text-xl font-bold">{score.total}</span>
            <span className="text-[9px] text-muted-foreground">total</span>
          </div>
        </div>

        <SizeDistributionBar score={score} />

        <div className="flex items-center gap-4 pt-1 border-t flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Pontos:</span>
            <span className="text-sm font-bold text-primary">{score.totalPoints} pts</span>
          </div>
          <Separator orientation="vertical" className="h-4" />
          <div className="flex items-center gap-1.5">
            <Clock className="h-3 w-3 text-blue-500" />
            <span className="text-[10px] text-muted-foreground uppercase font-semibold">Horas:</span>
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
}

// ─── Card de Sessão Planning (novo design) ────────────────────────────────────

function PlanningSessionCard({
  session,
  profiles,
  onView,
  isExpanded,
  onToggle,
}: {
  session: PlanningSessionHistory;
  profiles: Record<string, string>;
  onView: () => void;
  isExpanded?: boolean;
  onToggle?: () => void;
}) {
  const isCancelled = session.status === "cancelled";

  if (isCancelled) {
    return (
      <div className="flex items-center justify-between px-4 py-2.5 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/30 text-muted-foreground">
        <div className="flex items-center gap-3 text-xs">
          <XCircle className="h-3.5 w-3.5 text-destructive/50" />
          <span>{formatDate(session.createdAt)}</span>
          <span className="font-medium">{session.sprintName}</span>
          <Badge variant="outline" className="text-[9px] bg-destructive/10 text-destructive/60 border-destructive/20">
            Cancelada
          </Badge>
        </div>
        <Button variant="ghost" size="sm" className="h-6 text-xs gap-1 opacity-50 hover:opacity-100" onClick={onView}>
          <Eye className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-success/20 hover:border-success/40 transition-colors">
      <CardContent className="p-0">
        {/* Header do card */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Calendar className="h-3.5 w-3.5" />
              <span>{formatDate(session.createdAt)}</span>
            </div>
            <Separator orientation="vertical" className="h-4" />
            <span className="text-sm font-semibold">{session.sprintName}</span>
            <StatusBadge status={session.status} />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-3 text-xs text-muted-foreground mr-2">
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {session.husVoted} HUs
              </span>
              <span className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                {session.participantCount}
              </span>
              <span className="flex items-center gap-1 font-semibold text-success">
                <Clock className="h-3 w-3" />
                {session.totalHours}h
              </span>
              <span className="text-[10px] text-muted-foreground">
                {DECK_MODE_LABELS[session.deckMode] ?? session.deckMode}
              </span>
              <span className="text-[10px] text-muted-foreground">{profiles[session.createdBy] ?? "—"}</span>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={onView}>
              <Eye className="h-3 w-3" /> Ver
            </Button>
            {onToggle && (
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={onToggle}>
                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────

export function AgileHistory() {
  const { currentTeamId } = useAuth();
  const { sprints } = useSprint();

  const [tab, setTab] = useState("planning");
  const [planningSessions, setPlanningSessions] = useState<PlanningSessionHistory[]>([]);
  const [retroSessions, setRetroSessions] = useState<RetroSessionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [sprintFilter, setSprintFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [sprintScores, setSprintScores] = useState<Record<string, SprintScoreBreakdown>>({});

  // Detail dialog
  const [detailSession, setDetailSession] = useState<PlanningSessionHistory | RetroSessionHistory | null>(null);
  const [detailType, setDetailType] = useState<"planning" | "retro">("planning");
  const [detailHuSummaries, setDetailHuSummaries] = useState<HuVoteSummary[]>([]);
  const [detailCards, setDetailCards] = useState<any[]>([]);
  const [detailActions, setDetailActions] = useState<any[]>([]);

  // ─── Loaders ──────────────────────────────────────────────────────────────

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
      const { data: votes } = await supabase
        .from("planning_votes")
        .select("hu_id, user_id, vote_value")
        .eq("session_id", s.id);

      const uniqueHus = new Set(votes?.map((v) => v.hu_id) || []);
      let sessionTotalHours = 0;

      if (s.status === "finished" && votes?.length) {
        const sprintId = s.sprint_id;
        if (!scores[sprintId]) {
          scores[sprintId] = { P: 0, M: 0, G: 0, GG: 0, XG: 0, total: 0, totalPoints: 0, totalHours: 0 };
        }

        const byHu: Record<string, string[]> = {};
        votes.forEach((v) => {
          if (!byHu[v.hu_id]) byHu[v.hu_id] = [];
          byHu[v.hu_id].push(v.vote_value);
        });

        Object.values(byHu).forEach((huVotes) => {
          const modeVote = getModeVote(huVotes.filter((v) => v !== "—"));
          const size = classifyVoteToSize(modeVote) ?? (s.deck_mode === "hours" ? (modeVote as SizeKey) : null);
          if (size && HOURS_MAP[size]) {
            scores[sprintId][size]++;
            scores[sprintId].total++;
            scores[sprintId].totalPoints += POINTS_MAP[size];
            scores[sprintId].totalHours += HOURS_MAP[size];
            sessionTotalHours += HOURS_MAP[size];
          }
        });
      }

      sessions.push({
        id: s.id,
        sprintId: s.sprint_id,
        sprintName: sprint?.name || "Sprint desconhecida",
        deckMode: s.deck_mode as DeckMode,
        status: s.status as "finished" | "cancelled",
        createdAt: s.created_at,
        finishedAt: s.finished_at,
        createdBy: s.created_by,
        participantCount: new Set(votes?.map((v) => v.user_id) || []).size,
        husVoted: uniqueHus.size,
        totalHours: sessionTotalHours,
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
      const [{ count: cardCount }, { count: actionCount }] = await Promise.all([
        supabase.from("retro_cards").select("*", { count: "exact", head: true }).eq("session_id", s.id),
        supabase.from("retro_actions").select("*", { count: "exact", head: true }).eq("session_id", s.id),
      ]);
      sessions.push({
        id: s.id,
        sprintId: s.sprint_id,
        sprintName: sprint?.name || "Sprint desconhecida",
        model: s.model,
        status: s.status as "finished" | "cancelled",
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

  // ─── Filtros ───────────────────────────────────────────────────────────────

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
        (s) => s.sprintName.toLowerCase().includes(q) || (RETRO_MODEL_LABELS[s.model] || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [retroSessions, sprintFilter, searchTerm]);

  // ─── Métricas ──────────────────────────────────────────────────────────────

  const planningMetrics = useMemo(() => {
    const finished = planningSessions.filter((s) => s.status === "finished");
    const totalHus = finished.reduce((sum, s) => sum + s.husVoted, 0);
    const totalParticipants = finished.reduce((sum, s) => sum + s.participantCount, 0);
    const totalHours = finished.reduce((sum, s) => sum + s.totalHours, 0);
    return {
      sessions: finished.length,
      avgHusPerSession: finished.length > 0 ? (totalHus / finished.length).toFixed(1) : "0",
      avgParticipants: finished.length > 0 ? (totalParticipants / finished.length).toFixed(1) : "0",
      totalHours,
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

  // ─── Detalhes ──────────────────────────────────────────────────────────────

  const openPlanningDetail = async (session: PlanningSessionHistory) => {
    setDetailType("planning");
    setDetailSession(session);

    const { data: votes } = await supabase
      .from("planning_votes")
      .select("*")
      .eq("session_id", session.id)
      .order("created_at");

    if (!votes?.length) {
      setDetailHuSummaries([]);
      return;
    }

    // Busca títulos/códigos das HUs
    const huIds = [...new Set(votes.map((v) => v.hu_id))];
    const { data: huData } = await supabase.from("user_stories").select("id, code, title").in("id", huIds);
    const huMap: Record<string, { code: string; title: string }> = {};
    huData?.forEach((hu) => {
      huMap[hu.id] = { code: hu.code, title: hu.title };
    });

    // Agrupa votos por HU e calcula consenso/divergência
    const byHu: Record<string, any[]> = {};
    votes.forEach((v) => {
      if (!byHu[v.hu_id]) byHu[v.hu_id] = [];
      byHu[v.hu_id].push(v);
    });

    const summaries: HuVoteSummary[] = Object.entries(byHu).map(([huId, huVotes]) => {
      const validVotes = huVotes.filter((v) => v.vote_value !== "—");
      const modeVote = getModeVote(validVotes.map((v) => v.vote_value));
      const consensusKey =
        session.deckMode === "hours"
          ? HOURS_MAP[modeVote as SizeKey]
            ? modeVote
            : null
          : classifyVoteToSize(modeVote);
      const consensusHours = consensusKey ? (HOURS_MAP[consensusKey as SizeKey] ?? 0) : 0;
      const divergence = calcDivergenceLevel(
        validVotes.map((v) => v.vote_value),
        session.deckMode,
      );

      return {
        huId,
        huCode: huMap[huId]?.code ?? huId.slice(0, 8) + "...",
        huTitle: huMap[huId]?.title ?? "—",
        votes: huVotes.map((v) => ({ userId: v.user_id, value: v.vote_value })),
        consensusKey: consensusKey as string | null,
        consensusHours,
        hadDivergence: divergence !== "none",
      };
    });

    setDetailHuSummaries(summaries);
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

  const closeDetail = () => {
    setDetailSession(null);
    setDetailHuSummaries([]);
    setDetailCards([]);
    setDetailActions([]);
  };

  // ─── Loading ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // ─── Sprint IDs únicos para os cards de pontuação ─────────────────────────

  const finishedSprintIds = [
    ...new Set(filteredPlanning.filter((s) => s.status === "finished").map((s) => s.sprintId)),
  ];

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" /> Histórico Ágil
        </h2>
        <p className="text-sm text-muted-foreground">Sessões passadas de Planning Poker e Retrospectiva</p>
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

        {/* ── Tab Planning ──────────────────────────────────────────────── */}
        <TabsContent value="planning" className="space-y-4 mt-4">
          {/* Métricas */}
          <div className="grid grid-cols-5 gap-3">
            <MetricCard label="Sessões" value={planningMetrics.sessions} />
            <MetricCard label="Média HUs/Sessão" value={planningMetrics.avgHusPerSession} />
            <MetricCard label="Média Participantes" value={planningMetrics.avgParticipants} />
            <MetricCard label="Total de Horas" value={`${planningMetrics.totalHours}h`} valueClass="text-success" />
            <MetricCard label="Canceladas" value={planningMetrics.cancelled} valueClass="text-destructive" />
          </div>

          {/* Pontuação por Sprint */}
          {(sprintFilter !== "all" ? [sprintFilter] : finishedSprintIds).map((sprintId) => (
            <SprintScoreCard
              key={sprintId}
              sprintId={sprintId}
              sprintName={filteredPlanning.find((s) => s.sprintId === sprintId)?.sprintName ?? "Sprint"}
              score={sprintScores[sprintId]}
            />
          ))}

          {/* Lista de sessões — novo design */}
          <div className="space-y-2">
            {/* Concluídas */}
            {filteredPlanning
              .filter((s) => s.status === "finished")
              .map((session) => (
                <PlanningSessionCard
                  key={session.id}
                  session={session}
                  profiles={profiles}
                  onView={() => openPlanningDetail(session)}
                />
              ))}

            {/* Canceladas — seção colapsável */}
            {filteredPlanning.filter((s) => s.status === "cancelled").length > 0 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-[10px] text-muted-foreground uppercase font-semibold px-1">
                  Canceladas ({filteredPlanning.filter((s) => s.status === "cancelled").length})
                </p>
                {filteredPlanning
                  .filter((s) => s.status === "cancelled")
                  .map((session) => (
                    <PlanningSessionCard
                      key={session.id}
                      session={session}
                      profiles={profiles}
                      onView={() => openPlanningDetail(session)}
                    />
                  ))}
              </div>
            )}

            {filteredPlanning.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-12">Nenhuma sessão encontrada</div>
            )}
          </div>
        </TabsContent>

        {/* ── Tab Retro ────────────────────────────────────────────────── */}
        <TabsContent value="retro" className="space-y-4 mt-4">
          <div className="grid grid-cols-4 gap-3">
            <MetricCard label="Sessões" value={retroMetrics.sessions} />
            <MetricCard label="Média Cards" value={retroMetrics.avgCards} />
            <MetricCard label="Média Ações" value={retroMetrics.avgActions} />
            <MetricCard label="Canceladas" value={retroMetrics.cancelled} valueClass="text-destructive" />
          </div>

          <div className="space-y-2">
            {filteredRetro.map((s) => (
              <Card
                key={s.id}
                className={cn("transition-colors", s.status === "cancelled" && "opacity-60 border-dashed")}
              >
                <CardContent className="p-0">
                  <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{formatDate(s.createdAt)}</span>
                      </div>
                      <Separator orientation="vertical" className="h-4" />
                      <span className="text-sm font-semibold">{s.sprintName}</span>
                      <Badge variant="secondary" className="text-[10px]">
                        {RETRO_MODEL_LABELS[s.model] ?? s.model}
                      </Badge>
                      <StatusBadge status={s.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Hash className="h-3 w-3" />
                        {s.cardCount} cards
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        {s.actionCount} ações
                      </span>
                      <span>{profiles[s.createdBy] ?? "—"}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => openRetroDetail(s)}
                      >
                        <Eye className="h-3 w-3" /> Ver
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {filteredRetro.length === 0 && (
              <div className="text-center text-sm text-muted-foreground py-12">Nenhuma sessão encontrada</div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog de Detalhes ─────────────────────────────────────────── */}
      <Dialog
        open={!!detailSession}
        onOpenChange={(open) => {
          if (!open) closeDetail();
        }}
      >
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {detailType === "planning" ? (
                <>
                  <Spade className="h-4 w-4 text-primary" /> Detalhes da Sessão de Planning
                </>
              ) : (
                <>
                  <MessageSquare className="h-4 w-4 text-primary" /> Detalhes da Retrospectiva
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="flex-1 pr-2">
            {/* ── Detalhe Planning ─────────────────────────────────────── */}
            {detailSession &&
              detailType === "planning" &&
              (() => {
                const s = detailSession as PlanningSessionHistory;
                const totalDetailHours = detailHuSummaries.reduce((sum, hu) => sum + hu.consensusHours, 0);
                const divergedCount = detailHuSummaries.filter((hu) => hu.hadDivergence).length;
                return (
                  <div className="space-y-5 pt-1">
                    {/* Cabeçalho */}
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="space-y-0.5">
                        <p className="text-base font-bold">{s.sprintName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(s.createdAt)}
                          <span className="mx-1">·</span>
                          {DECK_MODE_LABELS[s.deckMode] ?? s.deckMode}
                          <span className="mx-1">·</span>
                          Facilitador: {profiles[s.createdBy] ?? "—"}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>

                    {/* Métricas da sessão */}
                    <div className="grid grid-cols-4 gap-3">
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-[10px] text-muted-foreground">HUs Estimadas</p>
                          <p className="text-2xl font-bold">{s.husVoted}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="p-3 text-center">
                          <p className="text-[10px] text-muted-foreground">Participantes</p>
                          <p className="text-2xl font-bold">{s.participantCount}</p>
                        </CardContent>
                      </Card>
                      <Card className="border-success/30 bg-success/5">
                        <CardContent className="p-3 text-center">
                          <p className="text-[10px] text-muted-foreground">Total de Horas</p>
                          <p className="text-2xl font-bold text-success">{totalDetailHours}h</p>
                        </CardContent>
                      </Card>
                      <Card className={cn(divergedCount > 0 && "border-warning/30 bg-warning/5")}>
                        <CardContent className="p-3 text-center">
                          <p className="text-[10px] text-muted-foreground">HUs com Divergência</p>
                          <p className={cn("text-2xl font-bold", divergedCount > 0 ? "text-warning" : "text-success")}>
                            {divergedCount}
                          </p>
                        </CardContent>
                      </Card>
                    </div>

                    <Separator />

                    {/* HUs votadas — cards melhorados */}
                    <div>
                      <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
                        <Hash className="h-4 w-4" /> HUs Estimadas ({detailHuSummaries.length})
                      </h3>
                      <div className="space-y-2">
                        {detailHuSummaries.map((hu) => (
                          <Card
                            key={hu.huId}
                            className={cn(
                              "border",
                              hu.hadDivergence ? "border-warning/30 bg-warning/5" : "border-success/20 bg-success/5",
                            )}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="font-mono text-[10px]">
                                      {hu.huCode}
                                    </Badge>
                                    {hu.hadDivergence && (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] bg-warning/10 text-warning border-warning/30 gap-1"
                                      >
                                        <AlertTriangle className="h-2.5 w-2.5" /> Divergência
                                      </Badge>
                                    )}
                                    {!hu.hadDivergence && (
                                      <Badge
                                        variant="outline"
                                        className="text-[9px] bg-success/10 text-success border-success/30 gap-1"
                                      >
                                        <ThumbsUp className="h-2.5 w-2.5" /> Consenso
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-xs font-medium truncate">{hu.huTitle}</p>
                                </div>
                                {/* Consenso final */}
                                {hu.consensusKey && (
                                  <div className="flex flex-col items-end shrink-0">
                                    <Badge
                                      className={cn(
                                        "text-sm font-bold px-3 py-1",
                                        SIZE_COLORS[hu.consensusKey as SizeKey]?.badge ?? "bg-muted",
                                      )}
                                    >
                                      {hu.consensusKey}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground mt-0.5">
                                      {hu.consensusHours}h
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Votos individuais */}
                              <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-current/10">
                                {hu.votes.map((v, i) => (
                                  <div key={i} className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5">
                                    <span className="text-[10px] text-muted-foreground">
                                      {profiles[v.userId] ?? "?"}
                                    </span>
                                    <span className="text-[10px] font-bold">{v.value === "—" ? "N/V" : v.value}</span>
                                    {v.value !== "—" && HOURS_MAP[v.value as SizeKey] && (
                                      <span className="text-[9px] text-muted-foreground">
                                        ({HOURS_MAP[v.value as SizeKey]}h)
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {detailHuSummaries.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-4">
                            Nenhum voto registrado nesta sessão
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

            {/* ── Detalhe Retro ─────────────────────────────────────────── */}
            {detailSession &&
              detailType === "retro" &&
              (() => {
                const s = detailSession as RetroSessionHistory;
                return (
                  <div className="space-y-5 pt-1">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-base font-bold">{s.sprintName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {formatDate(s.createdAt)}
                          <span className="mx-1">·</span>
                          {RETRO_MODEL_LABELS[s.model] ?? s.model}
                          <span className="mx-1">·</span>
                          {profiles[s.createdBy] ?? "—"}
                        </p>
                      </div>
                      <StatusBadge status={s.status} />
                    </div>

                    {/* Top 3 */}
                    <div>
                      <h3 className="text-sm font-bold mb-2">🏆 Top 3 Cards</h3>
                      <div className="space-y-2">
                        {detailCards.slice(0, 3).map((card: any, i: number) => (
                          <Card key={card.id} className={cn(i === 0 && "border-warning/50 bg-warning/5")}>
                            <CardContent className="p-3 flex items-center gap-3">
                              <span className="text-lg font-bold text-muted-foreground w-6">#{i + 1}</span>
                              <div className="flex-1">
                                <p className="text-xs">{card.text}</p>
                                <p className="text-[10px] text-muted-foreground">{card.column_key}</p>
                              </div>
                              <Badge variant="secondary" className="text-xs">
                                {card.votes} votos
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Todos os cards */}
                    <div>
                      <h3 className="text-sm font-bold mb-2">Todos os Cards ({detailCards.length})</h3>
                      <div className="space-y-1.5">
                        {detailCards.map((card: any) => (
                          <div key={card.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                            <Badge variant="outline" className="text-[10px] shrink-0">
                              {card.column_key}
                            </Badge>
                            <p className="text-xs flex-1">{card.text}</p>
                            {card.votes > 0 && (
                              <Badge variant="secondary" className="text-[10px]">
                                {card.votes}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {detailActions.length > 0 && (
                      <>
                        <Separator />
                        <div>
                          <h3 className="text-sm font-bold mb-2">Ações ({detailActions.length})</h3>
                          <div className="space-y-1.5">
                            {detailActions.map((action: any, i: number) => (
                              <div key={action.id} className="flex items-center gap-3 rounded-lg border p-2.5">
                                <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                                <p className="text-xs flex-1">{action.description}</p>
                                <Badge variant="outline" className="text-[10px]">
                                  {action.status}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                );
              })()}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
