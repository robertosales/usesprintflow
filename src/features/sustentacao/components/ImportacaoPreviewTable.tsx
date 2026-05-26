import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface PreviewRow {
  /** Índice único dentro do lote (para o estado de seleção) */
  idx: number;
  rhm: string;
  projeto: string;
  teamId: string;
  tipo: string;
  data_inicio: Date;
  situacao?: string;
  sla?: string;
  tipo_defeito?: string;
  originada_diagnostico?: boolean;
  descricao?: string;
  data_previsao_encerramento?: string;
  prazo_inicio_atendimento?: string;
  prazo_solucao?: string;
}

/** Dados mínimos da demanda já existente no banco */
export interface ExistingDemanda {
  rhm: string;
  situacao: string;
  projeto: string;
}

type RowStatus = "novo" | "atualizar" | "sem_alteracao";

function getStatus(row: PreviewRow, existing: ExistingDemanda | undefined): RowStatus {
  if (!existing) return "novo";
  if (
    existing.situacao === row.situacao &&
    existing.projeto === row.projeto
  ) return "sem_alteracao";
  return "atualizar";
}

const STATUS_CONFIG: Record<RowStatus, { label: string; className: string }> = {
  novo:           { label: "Novo",             className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  atualizar:      { label: "Atualizar",        className: "bg-blue-100 text-blue-800 border-blue-200" },
  sem_alteracao:  { label: "Sem alteração",   className: "bg-gray-100 text-gray-500 border-gray-200" },
};

const SITUACAO_LABELS: Record<string, string> = {
  fila_atendimento:         "Fila Atendimento",
  planejamento_elaboracao:  "Em Elaboração",
  planejamento_ag_aprovacao:"Ag. Aprovação",
  planejamento_aprovada:    "Aprovada p/ Exec",
  em_execucao:              "Em Execução",
  bloqueada:                "Bloqueada",
  hom_ag_homologacao:       "Ag. Homologação",
  hom_homologada:           "Homologada",
  rejeitada:                "Rejeitada",
  fila_producao:            "Fila Produção",
  ag_aceite_final:          "Ag. Aceite Final",
  cancelada:                "Cancelada",
};

interface Props {
  rows: PreviewRow[];
  /** Mapa de RHM (string) → ExistingDemanda buscado no BD antes de exibir a tabela */
  existingByRhm: Map<string, ExistingDemanda>;
  selectedIdxs: Set<number>;
  onToggle: (idx: number) => void;
  onToggleAll: (selectAll: boolean) => void;
}

export function ImportacaoPreviewTable({
  rows,
  existingByRhm,
  selectedIdxs,
  onToggle,
  onToggleAll,
}: Props) {
  const allSelected = rows.length > 0 && selectedIdxs.size === rows.length;
  const someSelected = selectedIdxs.size > 0 && !allSelected;

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto max-h-72 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/60 sticky top-0 z-10">
            <tr>
              <th className="w-8 px-2 py-2 text-center">
                <Checkbox
                  checked={allSelected}
                  // indeterminate visual via data-state
                  data-state={someSelected ? "indeterminate" : allSelected ? "checked" : "unchecked"}
                  onCheckedChange={(v) => onToggleAll(!!v)}
                  aria-label="Selecionar todos"
                  className="h-3.5 w-3.5"
                />
              </th>
              <th className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">#</th>
              <th className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Projeto</th>
              <th className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Tipo</th>
              <th className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Situação Planilha</th>
              <th className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Situação Atual</th>
              <th className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Previsão</th>
              <th className="px-2 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => {
              const existing = existingByRhm.get(row.rhm);
              const status = getStatus(row, existing);
              const cfg = STATUS_CONFIG[status];
              const isSelected = selectedIdxs.has(row.idx);
              const rowCls = isSelected ? "bg-blue-50/60" : "hover:bg-muted/30";

              return (
                <tr key={row.idx} className={`transition-colors ${rowCls}`}>
                  <td className="px-2 py-1.5 text-center">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onToggle(row.idx)}
                      className="h-3.5 w-3.5"
                    />
                  </td>
                  <td className="px-2 py-1.5 font-mono font-medium whitespace-nowrap">{row.rhm}</td>
                  <td className="px-2 py-1.5 max-w-[140px] truncate" title={row.projeto}>{row.projeto}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">{row.tipo}</td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {SITUACAO_LABELS[row.situacao ?? ""] ?? row.situacao ?? "—"}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {existing
                      ? SITUACAO_LABELS[existing.situacao] ?? existing.situacao
                      : <span className="text-muted-foreground italic">—</span>}
                  </td>
                  <td className="px-2 py-1.5 whitespace-nowrap">
                    {row.data_previsao_encerramento
                      ? format(new Date(row.data_previsao_encerramento + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                      : "—"}
                  </td>
                  <td className="px-2 py-1.5">
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-1.5 py-0 font-medium ${cfg.className}`}
                    >
                      {cfg.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
