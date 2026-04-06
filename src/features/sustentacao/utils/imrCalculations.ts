import type { Demanda } from "../types/demanda";

// Extended Demanda with IMR fields
export interface DemandaIMR extends Demanda {
  demandante?: string | null;
  ordem_servico?: string | null;
  tipo_defeito?: string | null;
  originada_diagnostico?: boolean;
  prazo_inicio_atendimento?: string | null;
  prazo_solucao?: string | null;
  data_previsao_encerramento?: string | null;
  nota_satisfacao?: number | null;
  cobertura_testes?: number | null;
  artefatos_atualizados?: string | null;
  hard_code_identificado?: boolean | null;
  reincidencia_defeito?: boolean | null;
  contador_rejeicoes?: number;
}

export interface DemandaEvento {
  id: string;
  demanda_id: string;
  tipo_evento: string;
  descricao: string;
  redutor: number;
  incidencia: string;
  user_id: string;
  created_at: string;
}

// ── IAP — Índice de Atendimento de Prazo ──
export function calcIAP(demandas: DemandaIMR[]): { valor: number; qdap: number; qdtot: number } {
  // Qdtot = demandas with data_previsao_encerramento in the period
  const comPrazo = demandas.filter(d => d.data_previsao_encerramento);
  const qdtot = comPrazo.length;
  if (qdtot === 0) return { valor: 0, qdap: 0, qdtot: 0 };

  // Qdap = demandas encerradas (aceite_final) dentro do prazo
  const qdap = comPrazo.filter(d => {
    if (d.situacao !== 'aceite_final' || !d.aceite_data) return false;
    const aceite = new Date(d.aceite_data);
    const prazo = new Date(d.prazo_solucao || d.data_previsao_encerramento!);
    return aceite <= prazo;
  }).length;

  return { valor: qdtot > 0 ? (qdap / qdtot) * 100 : 0, qdap, qdtot };
}

// ── IQS — Índice de Qualidade de Serviço ──
export function calcIQS(demandas: DemandaIMR[]): { valor: number; qdr: number; qde: number } {
  // Qde = delivered for homologation or homologated
  const qde = demandas.filter(d =>
    ['aguardando_homologacao', 'homologada', 'fila_producao', 'producao', 'aceite_final'].includes(d.situacao)
  ).length;
  if (qde === 0) return { valor: 0, qdr: 0, qde: 0 };

  // Qdr = demandas with at least 1 rejection
  const qdr = demandas.filter(d => (d.contador_rejeicoes || 0) > 0).length;

  return { valor: (1 - qdr / qde) * 100, qdr, qde };
}

// ── ICT — Índice de Cobertura de Testes ──
export function calcICT(demandas: DemandaIMR[]): { valor: number; total: number } {
  const concluidas = demandas.filter(d => d.situacao === 'aceite_final' && d.cobertura_testes != null);
  if (concluidas.length === 0) return { valor: 0, total: 0 };
  const sum = concluidas.reduce((s, d) => s + Number(d.cobertura_testes || 0), 0);
  return { valor: sum / concluidas.length, total: concluidas.length };
}

// ── ISS — Índice de Satisfação do Serviço ──
export function calcISS(demandas: DemandaIMR[]): { valor: number; total: number } {
  const avaliadas = demandas.filter(d => d.situacao === 'aceite_final' && d.nota_satisfacao != null);
  if (avaliadas.length === 0) return { valor: 0, total: 0 };
  const sum = avaliadas.reduce((s, d) => s + Number(d.nota_satisfacao || 0), 0);
  return { valor: sum / avaliadas.length, total: avaliadas.length };
}

// ── Glosas Summary ──
export function calcGlosasSummary(eventos: DemandaEvento[]) {
  let totalIntegral = 0;
  let totalLimitada = 0;
  const byEvento: Record<string, { count: number; total: number }> = {};

  eventos.forEach(e => {
    if (e.incidencia === 'integral') totalIntegral += Number(e.redutor);
    else totalLimitada += Number(e.redutor);

    if (!byEvento[e.tipo_evento]) byEvento[e.tipo_evento] = { count: 0, total: 0 };
    byEvento[e.tipo_evento].count++;
    byEvento[e.tipo_evento].total += Number(e.redutor);
  });

  return { totalIntegral, totalLimitada, byEvento };
}

// ── Auto-detect E8 events ──
export function detectE8Alerts(demandas: DemandaIMR[]): Array<{ demanda: DemandaIMR; diasAtraso: number; tipo: 'alerta' | 'glosa' }> {
  const now = new Date();
  const alerts: Array<{ demanda: DemandaIMR; diasAtraso: number; tipo: 'alerta' | 'glosa' }> = [];

  demandas.forEach(d => {
    if (d.situacao === 'aceite_final') return;
    if (!d.prazo_solucao && !d.data_previsao_encerramento) return;
    const prazo = new Date(d.prazo_solucao || d.data_previsao_encerramento!);
    const diasAtraso = Math.floor((now.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));

    if (diasAtraso >= 60) alerts.push({ demanda: d, diasAtraso, tipo: 'glosa' });
    else if (diasAtraso >= 45) alerts.push({ demanda: d, diasAtraso, tipo: 'alerta' });
  });

  return alerts.sort((a, b) => b.diasAtraso - a.diasAtraso);
}
