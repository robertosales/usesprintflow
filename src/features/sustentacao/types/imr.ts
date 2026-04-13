// ── IMR Types & Constants (Grupo 2 — Sustentação) ──

export const TIPOS_DEMANDA_IMR = [
  { value: "analise_viabilidade", label: "Análise de Viabilidade" },
  { value: "apoio_operacional", label: "Apoio Operacional Sustentação" },
  { value: "apuracao_especial", label: "Apuração especial" },
  { value: "atendimento", label: "Atendimento" },
  { value: "atualizacao_arquitetura", label: "Atualização Arquitetura Deploy" },
  { value: "diagnostico", label: "Diagnóstico de Incidente" },
  { value: "homologacao_assistida", label: "Homologação assistida" },
  { value: "instalacao_atualizacao_de_sw", label: "Instalação/atualização de SW" },
  { value: "manutencao_corretiva", label: "Manutenção Corretiva" },
  { value: "manutencao_cosmetica", label: "Manutenção Cosmética" },
  { value: "manutencao_evolutiva", label: "Manutenção Evolutiva" },
  { value: "manutencao_preventiva", label: "Manutenção Preventiva" },
  { value: "migracao_de_dados", label: "Migração de Dados" },
  { value: "planejamento_produto", label: "Planejamento de Produto" },
  { value: "suporte_especialista_arquiteto", label: "Suporte Especialista Arquiteto" },
  { value: "suporte_especialista_consultor", label: "Suporte Especialista Consultor" },
  { value: "testes_nao_funcionais", label: "Testes Não-Funcionais" },
  { value: "treinamento_usuarios", label: "Treinamento de Usuários" },
  { value: "assessoria_ux_ui", label: "Assessoria de UX/UI" },
  { value: "documentacao_legado", label: "Documentação de Legado" },
  { value: "design_thinking", label: "Design Thinking" },
  { value: "modelagem_processos", label: "Modelagem Processos de Negócio" },
] as const;
export type TipoDemandaIMR = (typeof TIPOS_DEMANDA_IMR)[number]["value"];

export const TIPO_LABEL_MAP: Record<string, string> = Object.fromEntries(
  TIPOS_DEMANDA_IMR.map((t) => [t.value, t.label]),
);

// Legacy mapping
export function mapLegacyTipo(tipo: string): string {
  if (tipo === "corretiva") return "manutencao_corretiva";
  if (tipo === "evolutiva") return "evolutiva_pequeno_porte";
  return tipo;
}

export function getTipoLabel(tipo: string): string {
  return TIPO_LABEL_MAP[tipo] || TIPO_LABEL_MAP[mapLegacyTipo(tipo)] || tipo;
}

// ── Prazo Rules ──
export type UnidadePrazo = "hu" | "du" | "h";

export interface PrazoRegra {
  inicio: number;
  unidadeInicio: UnidadePrazo;
  solucao: number | "os"; // 'os' = defined in OS
  unidadeSolucao: UnidadePrazo | "os";
}

// Key format: tipo or tipo_regime_defeito for corretivas
export const PRAZOS_IMR: Record<string, PrazoRegra> = {
  // Manutenção Corretiva (values from IMR contract)
  manutencao_corretiva_padrao_impeditivo: { inicio: 4, unidadeInicio: "hu", solucao: 76, unidadeSolucao: "hu" },
  manutencao_corretiva_padrao_nao_impeditivo: { inicio: 8, unidadeInicio: "hu", solucao: 104, unidadeSolucao: "hu" },
  manutencao_corretiva_continuo_impeditivo: { inicio: 0.5, unidadeInicio: "h", solucao: 9.5, unidadeSolucao: "h" },
  manutencao_corretiva_continuo_nao_impeditivo: { inicio: 2, unidadeInicio: "h", solucao: 26, unidadeSolucao: "h" },
  // Demais tipos (inicio em du, solução em du ou N/D)
  analise_viabilidade: { inicio: 2, unidadeInicio: "du", solucao: 3, unidadeSolucao: "du" },
  apuracao_registro_simples: { inicio: 1, unidadeInicio: "du", solucao: 1, unidadeSolucao: "du" },
  apuracao_relatorio_bd: { inicio: 2, unidadeInicio: "du", solucao: 3, unidadeSolucao: "du" },
  apuracao_outras: { inicio: 2, unidadeInicio: "du", solucao: "os", unidadeSolucao: "os" },
  atendimento: { inicio: 1, unidadeInicio: "du", solucao: 2, unidadeSolucao: "du" },
  diagnostico: { inicio: 1, unidadeInicio: "du", solucao: 2, unidadeSolucao: "du" },
  manutencao_cosmetica: { inicio: 3, unidadeInicio: "du", solucao: 5, unidadeSolucao: "du" },
  evolutiva_pequeno_porte_emergencial: { inicio: 2, unidadeInicio: "du", solucao: "os", unidadeSolucao: "os" },
  evolutiva_pequeno_porte: { inicio: 5, unidadeInicio: "du", solucao: "os", unidadeSolucao: "os" },
  manutencao_preventiva: { inicio: 5, unidadeInicio: "du", solucao: "os", unidadeSolucao: "os" },
  homologacao_assistida: { inicio: 3, unidadeInicio: "du", solucao: "os", unidadeSolucao: "os" },
  documentacao_legado: { inicio: 5, unidadeInicio: "du", solucao: 60, unidadeSolucao: "du" },
  suporte_especialista: { inicio: 5, unidadeInicio: "du", solucao: 30, unidadeSolucao: "du" },
  suporte_especialista_consultor: { inicio: 5, unidadeInicio: "du", solucao: 30, unidadeSolucao: "du" },
  atualizacao_arquitetura: { inicio: 5, unidadeInicio: "du", solucao: 20, unidadeSolucao: "du" },
  testes_nao_funcionais: { inicio: 3, unidadeInicio: "du", solucao: 30, unidadeSolucao: "du" },
  apoio_operacional: { inicio: 10, unidadeInicio: "du", solucao: 30, unidadeSolucao: "du" },
  assessoria_ux_ui: { inicio: 10, unidadeInicio: "du", solucao: 30, unidadeSolucao: "du" },
  mapeamento_design_thinking: { inicio: 10, unidadeInicio: "du", solucao: "os", unidadeSolucao: "os" },
  modelagem_processos: { inicio: 10, unidadeInicio: "du", solucao: 30, unidadeSolucao: "du" },
  treinamento_usuarios: { inicio: 10, unidadeInicio: "du", solucao: 30, unidadeSolucao: "du" },
  planejamento_produto: { inicio: 15, unidadeInicio: "du", solucao: 30, unidadeSolucao: "du" },
  migracao_dados: { inicio: 0, unidadeInicio: "du", solucao: 30, unidadeSolucao: "du" },
};

export function getPrazoKey(tipo: string, regime?: string, tipoDefeito?: string): string {
  if (tipo === "manutencao_corretiva" && regime && tipoDefeito) {
    return `${tipo}_${regime}_${tipoDefeito}`;
  }
  return tipo;
}

export function getPrazoRegra(tipo: string, regime?: string, tipoDefeito?: string): PrazoRegra | null {
  const key = getPrazoKey(tipo, regime, tipoDefeito);
  return PRAZOS_IMR[key] || null;
}

export function isSolucaoDefinidaNaOS(tipo: string, regime?: string, tipoDefeito?: string): boolean {
  const regra = getPrazoRegra(tipo, regime, tipoDefeito);
  return regra?.solucao === "os";
}

// ── Business hours / days calculations ──
function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from);
  let added = 0;
  while (added < days) {
    result.setDate(result.getDate() + 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) added++;
  }
  return result;
}

function addBusinessHours(from: Date, hours: number): Date {
  // Business hours: 08:00-18:00 (10h/day)
  const WORK_START = 8,
    WORK_END = 18,
    HOURS_PER_DAY = 10;
  const result = new Date(from);
  let remaining = hours;

  // If starting outside business hours, move to next business day start
  let currentHour = result.getHours() + result.getMinutes() / 60;
  if (currentHour < WORK_START) currentHour = WORK_START;
  if (currentHour >= WORK_END || result.getDay() === 0 || result.getDay() === 6) {
    // Move to next business day
    while (result.getDay() === 0 || result.getDay() === 6) result.setDate(result.getDate() + 1);
    if (currentHour >= WORK_END) result.setDate(result.getDate() + 1);
    while (result.getDay() === 0 || result.getDay() === 6) result.setDate(result.getDate() + 1);
    result.setHours(WORK_START, 0, 0, 0);
    currentHour = WORK_START;
  }

  while (remaining > 0) {
    const hoursLeftToday = WORK_END - currentHour;
    if (remaining <= hoursLeftToday) {
      result.setHours(Math.floor(currentHour + remaining), Math.round(((currentHour + remaining) % 1) * 60), 0, 0);
      remaining = 0;
    } else {
      remaining -= hoursLeftToday;
      result.setDate(result.getDate() + 1);
      while (result.getDay() === 0 || result.getDay() === 6) result.setDate(result.getDate() + 1);
      result.setHours(WORK_START, 0, 0, 0);
      currentHour = WORK_START;
    }
  }
  return result;
}

function addContinuousHours(from: Date, hours: number): Date {
  return new Date(from.getTime() + hours * 60 * 60 * 1000);
}

export function calcPrazoInicio(from: Date, tipo: string, regime?: string, tipoDefeito?: string): Date | null {
  const regra = getPrazoRegra(tipo, regime, tipoDefeito);
  if (!regra) return null;
  if (regra.unidadeInicio === "du") return addBusinessDays(from, regra.inicio);
  if (regra.unidadeInicio === "hu") return addBusinessHours(from, regra.inicio);
  if (regra.unidadeInicio === "h") return addContinuousHours(from, regra.inicio);
  return null;
}

export function calcPrazoSolucao(from: Date, tipo: string, regime?: string, tipoDefeito?: string): Date | null {
  const regra = getPrazoRegra(tipo, regime, tipoDefeito);
  if (!regra || regra.solucao === "os") return null;
  if (regra.unidadeSolucao === "du") return addBusinessDays(from, regra.solucao as number);
  if (regra.unidadeSolucao === "hu") return addBusinessHours(from, regra.solucao as number);
  if (regra.unidadeSolucao === "h") return addContinuousHours(from, regra.solucao as number);
  return null;
}

// ── Eventos / Glosas ──
export interface EventoConfig {
  codigo: string;
  descricao: string;
  redutor: number;
  unidade: string;
  incidencia: "integral" | "limitada";
}

export const EVENTOS_CONFIG: EventoConfig[] = [
  {
    codigo: "E1",
    descricao: "Profissional inadequado/sem qualificação por reincidência",
    redutor: 0.1,
    unidade: "por dia útil",
    incidencia: "integral",
  },
  {
    codigo: "E2",
    descricao: "Vazamento de informações confidenciais",
    redutor: 3.0,
    unidade: "por ocorrência",
    incidencia: "integral",
  },
  {
    codigo: "E3",
    descricao: "Falha grosseira detectada apenas em produção",
    redutor: 0.5,
    unidade: "por ocorrência",
    incidencia: "integral",
  },
  {
    codigo: "E4",
    descricao: "Hard code de parâmetros importantes",
    redutor: 0.1,
    unidade: "por ocorrência",
    incidencia: "integral",
  },
  {
    codigo: "E5",
    descricao: "Artefatos não atualizados após manutenção",
    redutor: 0.1,
    unidade: "por ocorrência",
    incidencia: "limitada",
  },
  {
    codigo: "E6",
    descricao: "Demanda suspensa sem justificativa ou sem previsão",
    redutor: 0.1,
    unidade: "por ocorrência",
    incidencia: "limitada",
  },
  {
    codigo: "E7",
    descricao: "Reincidência de defeito impeditivo",
    redutor: 0.2,
    unidade: "por ocorrência",
    incidencia: "limitada",
  },
  {
    codigo: "E8",
    descricao: "SLA em atraso há mais de 60 dias corridos",
    redutor: 0.2,
    unidade: "por ocorrência",
    incidencia: "limitada",
  },
  {
    codigo: "E9",
    descricao: "Composição mínima de equipe não mantida",
    redutor: 0.1,
    unidade: "por dia útil após notificação",
    incidencia: "limitada",
  },
  {
    codigo: "E10",
    descricao: "Ausência de profissional causando prejuízo em OS",
    redutor: 0.05,
    unidade: "por dia útil",
    incidencia: "limitada",
  },
  {
    codigo: "E11",
    descricao: "Compartilhamento indevido de profissional entre equipes",
    redutor: 0.05,
    unidade: "por dia útil",
    incidencia: "limitada",
  },
  {
    codigo: "E13",
    descricao: "Atraso na alocação de equipe após abertura de OS",
    redutor: 0.2,
    unidade: "por dia de atraso",
    incidencia: "limitada",
  },
  {
    codigo: "E14",
    descricao: "Reincidência de defeito impeditivo de sprint anterior",
    redutor: 0.2,
    unidade: "por ocorrência",
    incidencia: "limitada",
  },
];

export function getEventoConfig(codigo: string): EventoConfig | undefined {
  return EVENTOS_CONFIG.find((e) => e.codigo === codigo);
}

// ── Indicadores Meta & Glosa ──
export interface IndicadorMeta {
  sigla: string;
  nome: string;
  meta: number;
  unidade: string;
  faixas: Array<{ limite: number; glosa: number; cor: "green" | "yellow" | "orange" | "red" }>;
}

export const INDICADORES_GRUPO2: IndicadorMeta[] = [
  {
    sigla: "IAP",
    nome: "Índice de Atendimento de Prazo",
    meta: 90,
    unidade: "%",
    faixas: [
      { limite: 90, glosa: 0, cor: "green" },
      { limite: 80, glosa: 10, cor: "yellow" },
      { limite: 70, glosa: 20, cor: "orange" },
      { limite: 0, glosa: 30, cor: "red" },
    ],
  },
  {
    sigla: "IQS",
    nome: "Índice de Qualidade de Serviço",
    meta: 90,
    unidade: "%",
    faixas: [
      { limite: 90, glosa: 0, cor: "green" },
      { limite: 80, glosa: 10, cor: "yellow" },
      { limite: 60, glosa: 20, cor: "orange" },
      { limite: 0, glosa: 30, cor: "red" },
    ],
  },
  {
    sigla: "ICT",
    nome: "Índice de Cobertura de Testes",
    meta: 100,
    unidade: "%",
    faixas: [
      { limite: 100, glosa: 0, cor: "green" },
      { limite: 90, glosa: 2, cor: "yellow" },
      { limite: 70, glosa: 5, cor: "orange" },
      { limite: 0, glosa: 10, cor: "red" },
    ],
  },
  {
    sigla: "ISS",
    nome: "Índice de Satisfação do Serviço",
    meta: 8,
    unidade: "",
    faixas: [
      { limite: 8, glosa: 0, cor: "green" },
      { limite: 7, glosa: 2, cor: "yellow" },
      { limite: 6, glosa: 5, cor: "orange" },
      { limite: 0, glosa: 10, cor: "red" },
    ],
  },
];

export function getIndicadorFaixa(indicador: IndicadorMeta, valor: number) {
  for (const faixa of indicador.faixas) {
    if (valor >= faixa.limite) return faixa;
  }
  return indicador.faixas[indicador.faixas.length - 1];
}

export function getSLAStatusDemanda(createdAt: string, prazoSolucao: string | null, situacao: string) {
  if (situacao === "aceite_final") return { status: "concluida" as const, cor: "green" as const, label: "Concluída" };
  if (situacao === "cancelada") return { status: "cancelada" as const, cor: "muted" as const, label: "Cancelada" };
  if (!prazoSolucao) return { status: "sem_prazo" as const, cor: "muted" as const, label: "Sem prazo definido" };

  const now = new Date();
  const prazo = new Date(prazoSolucao);
  const abertura = new Date(createdAt);
  const totalMs = prazo.getTime() - abertura.getTime();
  const elapsedMs = now.getTime() - abertura.getTime();
  const percentConsumed = totalMs > 0 ? (elapsedMs / totalMs) * 100 : 100;

  const diasAtraso = Math.floor((now.getTime() - prazo.getTime()) / (1000 * 60 * 60 * 24));

  if (diasAtraso > 60)
    return {
      status: "glosa_e8" as const,
      cor: "red" as const,
      label: `Glosa E8 — ${diasAtraso} dias de atraso`,
      percentConsumed,
      diasAtraso,
    };
  if (diasAtraso >= 45)
    return {
      status: "alerta_e8" as const,
      cor: "orange" as const,
      label: `Alerta preventivo — ${diasAtraso} dias de atraso`,
      percentConsumed,
      diasAtraso,
    };
  if (now > prazo)
    return { status: "excedido" as const, cor: "red" as const, label: "Prazo excedido", percentConsumed, diasAtraso };
  if (percentConsumed >= 75)
    return { status: "risco" as const, cor: "yellow" as const, label: `75% do prazo consumido`, percentConsumed };
  return { status: "dentro" as const, cor: "green" as const, label: "Dentro do prazo", percentConsumed };
}
