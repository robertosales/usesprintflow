/**
 * Configuração centralizada de cabeçalhos e títulos de relatórios do sistema.
 * Todos os relatórios devem consumir títulos daqui para manter consistência.
 */

export interface ReportConfig {
  /** Título exibido no cabeçalho do relatório em tela */
  titulo: string;
  /** Título usado no arquivo exportado (CSV, PDF, Excel, Markdown) */
  tituloExportacao: string;
  /** Subtítulo / descrição curta */
  subtitulo: string;
  /** Módulo ao qual o relatório pertence */
  modulo: string;
}

export const REPORT_CONFIGS: Record<string, ReportConfig> = {
  // ── Sustentação ──
  tempo_medio: { titulo: 'Relatório — Tempo Médio', tituloExportacao: 'Relatório de Tempo Médio', subtitulo: 'MTTR / TMA / TMR / MTTA por período e analista', modulo: 'Sustentação' },
  sla_compliance: { titulo: 'Relatório — SLA Compliance', tituloExportacao: 'Relatório de SLA Compliance', subtitulo: 'Auditoria de cumprimento de SLA', modulo: 'Sustentação' },
  produtividade: { titulo: 'Relatório — Produtividade da Equipe', tituloExportacao: 'Relatório de Produtividade da Equipe', subtitulo: 'Capacidade de entrega individual e coletiva', modulo: 'Sustentação' },
  sustentacao_imr: { titulo: 'Relatório — Indicadores IMR (Grupo 2)', tituloExportacao: 'Relatório de Indicadores IMR Grupo 2', subtitulo: 'IAP, IQS, ICT, ISS e Eventos de Glosa', modulo: 'Sustentação' },
  // ── Sala Ágil ──
  agil_desempenho_individual: { titulo: 'Relatório — Desempenho Individual', tituloExportacao: 'Relatório de Desempenho Individual', subtitulo: 'Atividades, horas e eficiência por membro do time', modulo: 'Sala Ágil' },
  agil_desempenho_time: { titulo: 'Relatório — Desempenho do Time', tituloExportacao: 'Relatório de Desempenho do Time', subtitulo: 'Velocity, Story Points e métricas de sprint', modulo: 'Sala Ágil' },
  agil_qualidade: { titulo: 'Relatório — Qualidade', tituloExportacao: 'Relatório de Qualidade', subtitulo: 'Bugs, impedimentos e taxa de reabertura', modulo: 'Sala Ágil' },
  agil_releases: { titulo: 'Relatório — Releases', tituloExportacao: 'Relatório de Releases', subtitulo: 'Histórico de versões publicadas', modulo: 'Sala Ágil' },
};

export function getReportConfig(key: string): ReportConfig {
  return REPORT_CONFIGS[key] || {
    titulo: 'Relatório',
    tituloExportacao: 'Relatório',
    subtitulo: '',
    modulo: 'Sistema',
  };
}
