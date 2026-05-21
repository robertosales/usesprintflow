import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Demanda } from "../../../types/demanda";
import { TIPOS_DEMANDA_IMR } from "../../../types/imr";
import { formatPersonName, getInitials } from "@/lib/personName";
import { getTipoLabel } from "../../../types/imr";

interface DetailsTabProps {
  demanda: Demanda & {
    demandante?: string | null;
    tipo_defeito?: string | null;
    originada_diagnostico?: boolean;
    prazo_inicio_atendimento?: string | null;
    prazo_solucao?: string | null;
    data_previsao_encerramento?: string | null;
    contador_rejeicoes?: number;
  };
  editing: boolean;
  editForm: any;
  setEditForm: (val: any) => void;
  projetos: any[];
  demandanteProfile: string | null;
  slaStatus: any;
  responsaveis: any[];
}

const SLA_COR_CLASS: Record<string, string> = {
  green: "bg-emerald-100 text-emerald-800 border-emerald-200",
  yellow: "bg-yellow-100 text-yellow-800 border-yellow-200",
  orange: "bg-orange-100 text-orange-800 border-orange-200",
  red: "bg-destructive/10 text-destructive border-destructive/30",
  muted: "bg-muted text-muted-foreground",
};

export function DetailsTab({
  demanda,
  editing,
  editForm,
  setEditForm,
  projetos,
  demandanteProfile,
  slaStatus,
  responsaveis,
}: DetailsTabProps) {
  if (editing) {
    return (
      <div className="grid md:grid-cols-2 gap-5 mt-5">
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">#</Label>
            <Input value={editForm.rhm} onChange={(e) => setEditForm((p: any) => ({ ...p, rhm: e.target.value.replace(/\D/g, "") }))} className="mt-1" inputMode="numeric" />
          </div>
          <div>
            <Label className="text-sm font-medium">Projeto</Label>
            <Select value={editForm.projeto || "_none"} onValueChange={(v) => setEditForm((p: any) => ({ ...p, projeto: v === "_none" ? "" : v }))}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Selecione</SelectItem>
                {projetos.map((p) => <SelectItem key={p.id} value={p.nome}>{p.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Tipo</Label>
            <Select value={editForm.tipo} onValueChange={(v) => setEditForm((p: any) => ({ ...p, tipo: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>{TIPOS_DEMANDA_IMR.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Regime (SLA)</Label>
            <Select value={editForm.sla} onValueChange={(v) => setEditForm((p: any) => ({ ...p, sla: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="padrao">Padrão</SelectItem>
                <SelectItem value="continuo">Contínuo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Defeito Impeditivo</Label>
            <Select value={editForm.tipo_defeito || ""} onValueChange={(v) => setEditForm((p: any) => ({ ...p, tipo_defeito: v }))}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sim">Sim</SelectItem>
                <SelectItem value="nao">Não</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-medium">Previsão de Encerramento</Label>
            <Input type="date" value={editForm.data_previsao_encerramento || ""} onChange={(e) => setEditForm((p: any) => ({ ...p, data_previsao_encerramento: e.target.value || null }))} className="mt-1" />
          </div>
        </div>
        <div>
          <Label className="text-sm font-medium">Título</Label>
          <Textarea value={editForm.descricao} onChange={(e) => setEditForm((p: any) => ({ ...p, descricao: e.target.value }))} rows={6} className="mt-1" />
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-6 mt-5">
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">Título</p>
          <p className="text-sm text-muted-foreground leading-relaxed">{demanda.descricao || "Sem descrição informada."}</p>
        </div>
        <Card className="border-dashed">
          <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold text-foreground">Informações</CardTitle></CardHeader>
          <CardContent className="px-4 pb-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground shrink-0">Projeto</dt><dd className="font-medium text-right">{demanda.projeto}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground shrink-0">Tipo</dt><dd className="font-medium text-right">{getTipoLabel(demanda.tipo)}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground shrink-0">Regime</dt><dd className="font-medium text-right">{String(demanda.sla) === "continuo" || String(demanda.sla) === "24x7" ? "Contínuo" : "Padrão"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground shrink-0">Criado em</dt><dd className="font-medium text-right">{new Date(demanda.created_at).toLocaleString("pt-BR")}</dd></div>
              {demandanteProfile && <div className="flex justify-between gap-2"><dt className="text-muted-foreground shrink-0">Autor</dt><dd className="font-medium text-right">{demandanteProfile}</dd></div>}
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground shrink-0">Prazo Máx. Início</dt><dd className="font-medium text-right">{demanda.originada_diagnostico ? "IMEDIATO" : demanda.prazo_inicio_atendimento ? new Date(demanda.prazo_inicio_atendimento).toLocaleString("pt-BR") : "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground shrink-0">Prazo Máx. Solução</dt><dd className="font-medium text-right">{demanda.prazo_solucao ? new Date(demanda.prazo_solucao).toLocaleString("pt-BR") : "Definido na OS"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground shrink-0">Previsão Encerramento</dt><dd className="font-medium text-right">{demanda.data_previsao_encerramento ? new Date(demanda.data_previsao_encerramento).toLocaleDateString("pt-BR") : "—"}</dd></div>
              <div className="flex justify-between gap-2"><dt className="text-muted-foreground shrink-0">Atualizada em</dt><dd className="font-medium text-right">{new Date(demanda.updated_at).toLocaleDateString("pt-BR")}</dd></div>
              {(demanda.contador_rejeicoes ?? 0) > 0 && <div className="flex justify-between gap-2"><dt className="text-muted-foreground shrink-0">Rejeições</dt><dd className="font-medium text-right text-rose-600">{demanda.contador_rejeicoes}x</dd></div>}
            </dl>
          </CardContent>
        </Card>
      </div>
      <div className="space-y-4">
        {slaStatus.status !== "concluida" && slaStatus.status !== "sem_prazo" && (
          <Card className={`border ${SLA_COR_CLASS[slaStatus.cor]}`}>
            <CardContent className="px-4 py-3 space-y-2">
              <p className="text-sm font-semibold">{slaStatus.label}</p>
              {"percentConsumed" in slaStatus && <p className="text-xs">{(slaStatus.percentConsumed as number).toFixed(0)}% consumido</p>}
              {"percentConsumed" in slaStatus && (
                <div className="h-1.5 rounded-full bg-current/20">
                  <div className="h-1.5 rounded-full bg-current transition-all" style={{ width: `${Math.min(slaStatus.percentConsumed as number, 100)}%` }} />
                </div>
              )}
            </CardContent>
          </Card>
        )}
        {responsaveis.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm font-semibold">Equipe Vinculada</CardTitle></CardHeader>
            <CardContent className="px-4 pb-4 space-y-2">
              {responsaveis.map((r) => (
                <div key={r.id} className="flex items-center gap-2">
                  <div className="h-7 w-7 rounded-full bg-info/20 flex items-center justify-center text-xs font-semibold text-info">{getInitials(r.profile?.display_name)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{formatPersonName(r.profile?.display_name)}</p>
                    <p className="text-xs text-muted-foreground capitalize">{r.papel}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
