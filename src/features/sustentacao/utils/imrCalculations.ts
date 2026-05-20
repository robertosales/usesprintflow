// src/features/sustentacao/utils/imrCalculations.ts
// Cálculos dos indicadores IMR Grupo 2 (IAP, IQS, ICT, ISS) e glosas por evento

import { EVENTOS_CONFIG } from "../types/imr";

// ─── Tipos públicos ──────────────────────────────────────────────────────────
export interface DemandaIMR {
  id: string;
  situacao: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string | null;
  prazo_solucao?: string | null;
  rejeitada?: boolean;          // IQS: demanda rejeitada pelo cliente
  possui_teste?: boolean;       // ICT: demanda possui evidência de teste
  nota_satisfacao?: number | null; // ISS: nota 0–10
  [key: string]: any;
}

export interface DemandaEvento {
  id: string;
  demanda_id?: string | null;
  codigo: string;               // ex: "E1", "E8"
  quantidade?: number;          // multiplicador (dias, ocorrências)
  created_at: string;
  [key: string]: any;
}

// ─── IAP — Índice de Atendimento de Prazo ─────────────────────────────────────
export interface IAPResult {
  valor: number;   // 0–100 (%)
  qdap: number;    // demandas atendidas no prazo
  qdtot: number;   // total de demandas com prazo definido
}

export function calcIAP(demandas: DemandaIMR[]): IAPResult {
  const RESOLVED = ["resolvida", "fechada", "concluida", "aceite_final"];

  const comPrazo = demandas.filter(
    (d) => d.prazo_solucao && RESOLVED.includes(d.situacao) && d.resolved_at
  );

  if (comPrazo.length === 0) return { valor: 100, qdap: 0, qdtot: 0 };

  const noPrazo = comPrazo.filter(
    (d) => new Date(d.resolved_at!) <= new Date(d.prazo_solucao!)
  ).length;

  return {
    valor: (noPrazo / comPrazo.length) * 100,
    qdap:  noPrazo,
    qdtot: comPrazo.length,
  };
}

// ─── IQS — Índice de Qualidade de Serviço ──────────────────────────────────────
export interface IQSResult {
  valor: number;  // 0–100 (%)
  qde:   number;  // total de demandas entregues
  qdr:   number;  // demandas rejeitadas
}

export function calcIQS(demandas: DemandaIMR[]): IQSResult {
  const RESOLVED = ["resolvida", "fechada", "concluida", "aceite_final"];
  const entregues = demandas.filter((d) => RESOLVED.includes(d.situacao));
  if (entregues.length === 0) return { valor: 100, qde: 0, qdr: 0 };

  const rejeitadas = entregues.filter((d) => d.rejeitada).length;
  const valor = ((entregues.length - rejeitadas) / entregues.length) * 100;

  return { valor, qde: entregues.length, qdr: rejeitadas };
}

// ─── ICT — Índice de Cobertura de Testes ───────────────────────────────────────
export interface ICTResult {
  valor: number;  // 0–100 (%)
  total: number;  // total avaliadas
}

export function calcICT(demandas: DemandaIMR[]): ICTResult {
  const RESOLVED = ["resolvida", "fechada", "concluida", "aceite_final"];
  const avaliadas = demandas.filter((d) => RESOLVED.includes(d.situacao));
  if (avaliadas.length === 0) return { valor: 100, total: 0 };

  const comTeste = avaliadas.filter((d) => d.possui_teste).length;
  return {
    valor: (comTeste / avaliadas.length) * 100,
    total: avaliadas.length,
  };
}

// ─── ISS — Índice de Satisfação do Serviço ──────────────────────────────────────
export interface ISSResult {
  valor: number;  // média das notas (0–10)
  total: number;  // total avaliadas
}

export function calcISS(demandas: DemandaIMR[]): ISSResult {
  const avaliadas = demandas.filter(
    (d) => d.nota_satisfacao !== null && d.nota_satisfacao !== undefined
  );
  if (avaliadas.length === 0) return { valor: 10, total: 0 };

  const soma  = avaliadas.reduce((s, d) => s + (d.nota_satisfacao ?? 0), 0);
  return { valor: soma / avaliadas.length, total: avaliadas.length };
}

// ─── calcGlosasSummary ──────────────────────────────────────────────────────────
export interface GlosasSummary {
  totalIntegral: number; // soma das glosas de incidência="integral"
  totalLimitada: number; // soma das glosas de incidência="limitada"
  byEvento: Record<string, { count: number; total: number }>;
}

export function calcGlosasSummary(eventos: DemandaEvento[]): GlosasSummary {
  const byEvento: Record<string, { count: number; total: number }> = {};
  let totalIntegral = 0;
  let totalLimitada = 0;

  eventos.forEach((ev) => {
    const config = EVENTOS_CONFIG.find((c) => c.codigo === ev.codigo);
    if (!config) return;

    const quantidade = ev.quantidade ?? 1;
    const glosa      = config.redutor * quantidade;

    if (!byEvento[ev.codigo]) byEvento[ev.codigo] = { count: 0, total: 0 };
    byEvento[ev.codigo].count += quantidade;
    byEvento[ev.codigo].total += glosa;

    if (config.incidencia === "integral") totalIntegral += glosa;
    else totalLimitada += glosa;
  });

  return { totalIntegral, totalLimitada, byEvento };
}
