import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Target,
  Gauge,
  CheckCircle,
  AlertTriangle,
  ShieldAlert,
  Clock,
  BarChart3,
  User,
  Bug,
  Rocket,
} from "lucide-react";

import { DashboardFilters, INITIAL_FILTERS } from "@/components/dashboard/DashboardFilters";
import { IndividualPerformance } from "@/components/dashboard/IndividualPerformance";
import { TeamPerformance } from "@/components/dashboard/TeamPerformance";
import { QualityPanel } from "@/components/dashboard/QualityPanel";
import { ReleasesPanel } from "@/components/dashboard/ReleasesPanel";
import { ExportButton } from "@/components/dashboard/ExportButton";

/* =========================
   PURE FUNCTIONS (DOMAIN)
========================= */

function getLastColumn(workflowCols: any[]) {
  if (!workflowCols.length) return "pronto_para_publicacao";

  return [...workflowCols].sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).at(-1)?.key;
}

function getSprintHUs(allHUs: any[], sprintId?: string) {
  if (!sprintId) return [];
  return allHUs.filter((h) => h.sprint_id === sprintId);
}

function getCompletedHUs(hus: any[], lastCol: string) {
  return hus.filter((h) => h.status === lastCol);
}

function calculateCommitmentAccuracy(total: any[], completed: any[]) {
  if (!total.length) return 0;
  return Math.round((completed.length / total.length) * 100);
}

function applyFilters(rawData: any, filters: any) {
  let { sprints, hus, activities, impediments, developers, workflowCols } = rawData;

  let filteredSprints = sprints;

  if (filters.sprintId === "active") {
    filteredSprints = sprints.filter((s: any) => s.is_active);
  } else if (filters.sprintId !== "all") {
    filteredSprints = sprints.filter((s: any) => s.id === filters.sprintId);
  }

  const sprintIds = new Set(filteredSprints.map((s: any) => s.id));

  let filteredHUs = filters.sprintId === "all" ? hus : hus.filter((h: any) => sprintIds.has(h.sprint_id));

  if (filters.priority !== "all") {
    filteredHUs = filteredHUs.filter((h: any) => h.priority === filters.priority);
  }

  const huIds = new Set(filteredHUs.map((h: any) => h.id));
  const filteredActs = activities.filter((a: any) => huIds.has(a.hu_id));

  return {
    sprints: filteredSprints,
    hus: filteredHUs,
    activities: filteredActs,
    impediments,
    developers,
    workflowCols,
  };
}

function buildTeamOverview(rawData: any, filtered: any) {
  const sprint = filtered.sprints[0];
  const sprintId = sprint?.id;

  const lastCol = getLastColumn(filtered.workflowCols);

  // 🔥 CORREÇÃO: usa RAW DATA
  const sprintHUs = getSprintHUs(rawData.hus, sprintId);
  const completedHUs = getCompletedHUs(sprintHUs, lastCol);

  const commitmentAccuracy = calculateCommitmentAccuracy(sprintHUs, completedHUs);

  return {
    sprintName: sprint?.name || "Sem sprint",
    totalHUs: sprintHUs.length,
    completedHUs: completedHUs.length,
    commitmentAccuracy,
    lastCol,
  };
}

/* =========================
   COMPONENT
========================= */

export function MetricsDashboard() {
  const { isAdmin, teams, currentTeamId } = useAuth();

  const [filters, setFilters] = useState({
    ...INITIAL_FILTERS,
    teamId: currentTeamId || "all",
  });

  const [rawData, setRawData] = useState({
    sprints: [],
    hus: [],
    activities: [],
    impediments: [],
    developers: [],
    workflowCols: [],
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (currentTeamId) {
      setFilters((f) => ({ ...f, teamId: currentTeamId }));
    }
  }, [currentTeamId]);

  useEffect(() => {
    loadData();
  }, [filters.teamId, teams]);

  const loadData = async () => {
    setLoading(true);

    const teamsToLoad =
      isAdmin && filters.teamId === "all"
        ? teams
        : teams.filter((t) => t.id === (filters.teamId === "all" ? currentTeamId : filters.teamId));

    const all = {
      sprints: [],
      hus: [],
      activities: [],
      impediments: [],
      developers: [],
      workflowCols: [],
    };

    for (const team of teamsToLoad) {
      const [s, h, a, i, d, w] = await Promise.all([
        supabase.from("sprints").select("*").eq("team_id", team.id),
        supabase.from("user_stories").select("*").eq("team_id", team.id),
        supabase.from("activities").select("*").eq("team_id", team.id),
        supabase.from("impediments").select("*").eq("team_id", team.id),
        supabase.from("developers").select("*").eq("team_id", team.id),
        supabase.from("workflow_columns").select("*").eq("team_id", team.id),
      ]);

      all.sprints.push(...(s.data || []));
      all.hus.push(...(h.data || []));
      all.activities.push(...(a.data || []));
      all.impediments.push(...(i.data || []));
      all.developers.push(...(d.data || []));
      all.workflowCols.push(...(w.data || []));
    }

    setRawData(all);
    setLoading(false);
  };

  const filtered = useMemo(() => {
    return applyFilters(rawData, filters);
  }, [rawData, filters]);

  const teamOverview = useMemo(() => {
    return buildTeamOverview(rawData, filtered);
  }, [rawData, filtered]);

  if (loading) {
    return <div className="p-10 text-center">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <DashboardFilters
        filters={filters}
        onChange={setFilters}
        sprints={rawData.sprints}
        teams={teams}
        members={rawData.developers}
        isAdmin={isAdmin}
      />

      <div className="grid grid-cols-4 gap-3">
        <OverviewKPI
          icon={Target}
          label="Commitment"
          value={`${teamOverview.commitmentAccuracy}%`}
          sub={`${teamOverview.completedHUs}/${teamOverview.totalHUs}`}
          accent={
            teamOverview.commitmentAccuracy >= 80
              ? undefined
              : teamOverview.commitmentAccuracy >= 60
                ? "warning"
                : "destructive"
          }
        />
      </div>
    </div>
  );
}

/* =========================
   UI COMPONENTS
========================= */

function getTrend(current: number, previous: number, invert = false) {
  if (current > previous) return { direction: "up", isGood: !invert };
  if (current < previous) return { direction: "down", isGood: invert };
  return { direction: "same", isGood: true };
}

function OverviewKPI({ icon: Icon, label, value, sub, accent }: any) {
  return (
    <Card>
      <CardContent className="p-3 text-center">
        <Icon className="h-4 w-4 mx-auto mb-1 text-primary" />
        <p className="text-xl font-bold">{value}</p>
        <p className="text-xs">{sub}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
