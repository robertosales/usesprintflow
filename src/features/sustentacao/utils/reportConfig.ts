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
  tempo_medio: {
    titulo: 'Relatório — Tempo Médio',
    tituloExportacao: 'Relatório de Tempo Médio',
    subtitulo: 'MTTR / TMA / TMR / MTTA por período e analista',
    modulo: 'Sustentação',
  },
  sla_compliance: {
    titulo: 'Relatório — SLA Compliance',
    tituloExportacao: 'Relatório de SLA Compliance',
    subtitulo: 'Auditoria de cumprimento de SLA',
    modulo: 'Sustentação',
  },
  produtividade: {
    titulo: 'Relatório — Produtividade da Equipe',
    tituloExportacao: 'Relatório de Produtividade da Equipe',
    subtitulo: 'Capacidade de entrega individual e coletiva',
    modulo: 'Sustentação',
  },
};

export function getReportConfig(key: string): ReportConfig {
  return REPORT_CONFIGS[key] || {
    titulo: 'Relatório',
    tituloExportacao: 'Relatório',
    subtitulo: '',
    modulo: 'Sistema',
  };
}
