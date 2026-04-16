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
import { Target, Shield, TestTube, Star, DollarSign, Clock } from "lucide-react";

// ─── Constants ────────────────────────────────────────────────────────────────

const INDICATOR_ICONS: Record<string, any> = {
  IAP: Target, IQS: Shield, ICT: TestTube, ISS: Star,
};

const COR_MAP: Record<string, string> = {
  green:  "text-emerald-600",
  yellow: "text-yellow-600",
  orange: "text-orange-600",
  red:    "text-destructive",
};

const COR_BG_MAP: Record<string, string> = {
  green:  "bg-emerald-500/10 border-emerald-500/30",
  yellow: "bg-yellow-500/10 border-yellow-500/30",
  orange: "bg-orange-500/10 border-orange-500/30",
  red:    "bg-destructive/10 border-destructive/30",
};

const EMOJI_MAP: Record<string, string> = {
  green: "🟢", yellow: "🟡", orange: "🟠", red: "🔴",
};

// ─── ImrDashboard ─────────────────────────────────────────────────────────────

export function ImrDashboard() {
  const { demandas, loading } = useDemandas();
  const { projetos }          = useProjetos();
  const { currentTeamId }     = useAuth();
  const [eventos, setEventos] = useState<DemandaEvento[]>([]);

  // ── Period selection ──────────────────────────────────────────────────────
  const periodOptions = useMemo(() => getIAPPeriodOptions(6), []);

  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    const now   = new Date();
    const day   = now.getDate();
    const month = now.getMonth() + 1;
    const year  = now.getFullYear();
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
      const data = await eventosSvc.fetchEventosByTeam(currentTeamId);
      setEventos(data);
    } catch { /* ignore */ }
  }, [currentTeamId]);

  useEffect(() => { loadEventos(); }, [loadEventos]);

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const i