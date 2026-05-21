import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Plus, Link2, FileText, Eye, Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";
import * as evidSvc from "../../../services/evidencias.service";

interface EvidenceTabProps {
  pendingTarget?: string;
  resolveLabel: (s: string) => string;
  hasEvidence: boolean;
  onMoveTo: (status: string) => Promise<void>;
  evidForm: any;
  setEvidForm: (val: any) => void;
  allowedEvidFases: string[];
  evidenciaFaseLabels: Record<string, string>;
  setEvidFile: (file: File | null) => void;
  handleAddEvidencia: () => Promise<void>;
  evidenciaFases: string[];
  evidenciasByFase: Record<string, any[]>;
  evidLoading: boolean;
  setDeleteEvidId: (id: string) => void;
  evidFile: File | null;
}

export function EvidenceTab({
  pendingTarget,
  resolveLabel,
  hasEvidence,
  onMoveTo,
  evidForm,
  setEvidForm,
  allowedEvidFases,
  evidenciaFaseLabels,
  setEvidFile,
  handleAddEvidencia,
  evidenciaFases,
  evidenciasByFase,
  evidLoading,
  setDeleteEvidId,
}: EvidenceTabProps) {
  return (
    <div className="mt-5 space-y-5">
      {pendingTarget && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <p className="font-medium text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Para avançar para "{resolveLabel(pendingTarget)}", cadastre ao menos uma evidência desta etapa e tente mover novamente.
          </p>
          {hasEvidence && (
            <div className="mt-2 flex items-center gap-3">
              <p className="text-emerald-700 text-xs">✅ Evidência registrada. Você já pode avançar.</p>
              <Button size="sm" className="bg-info hover:bg-info/90 text-info-foreground h-7 text-xs" onClick={() => onMoveTo(pendingTarget)}>Avançar agora</Button>
            </div>
          )}
        </div>
      )}
      <Card>
        <CardHeader className="pb-2 pt-4 px-4"><CardTitle className="text-sm">Adicionar Evidência</CardTitle></CardHeader>
        <CardContent className="px-4 pb-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Fase</Label>
              <Select value={evidForm.fase} onValueChange={(v) => setEvidForm((p: any) => ({ ...p, fase: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{allowedEvidFases.map((f) => <SelectItem key={f} value={f}>{evidenciaFaseLabels[f] || f}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={evidForm.tipo} onValueChange={(v) => setEvidForm((p: any) => ({ ...p, tipo: v }))}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="arquivo">Arquivo</SelectItem>
                  <SelectItem value="link">Link externo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-xs">Título</Label>
            <Input value={evidForm.titulo} onChange={(e) => setEvidForm((p: any) => ({ ...p, titulo: e.target.value }))} placeholder="Título da evidência" className="mt-1" />
          </div>
          {evidForm.tipo === "arquivo" ? (
            <div><Label className="text-xs">Arquivo</Label><Input type="file" onChange={(e) => setEvidFile(e.target.files?.[0] || null)} className="mt-1" /></div>
          ) : (
            <div><Label className="text-xs">URL Externa</Label><Input value={evidForm.url_externa} onChange={(e) => setEvidForm((p: any) => ({ ...p, url_externa: e.target.value }))} placeholder="https://..." className="mt-1" /></div>
          )}
          <div>
            <Label className="text-xs">Descrição (opcional)</Label>
            <Textarea value={evidForm.descricao} onChange={(e) => setEvidForm((p: any) => ({ ...p, descricao: e.target.value }))} rows={2} className="mt-1" />
          </div>
          <Button size="sm" className="gap-1.5" onClick={handleAddEvidencia}>
            <Plus className="h-4 w-4" />Adicionar
          </Button>
        </CardContent>
      </Card>
      {evidenciaFases.map((fase) => {
        const items = evidenciasByFase[fase] || [];
        if (items.length === 0) return null;
        return (
          <div key={fase}>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{evidenciaFaseLabels[fase] || fase}</p>
            <div className="space-y-2">
              {items.map((e) => (
                <div key={e.id} className="flex items-center gap-3 rounded-lg border px-4 py-3 bg-card">
                  {e.tipo === "link" ? <Link2 className="h-4 w-4 text-info shrink-0" /> : <FileText className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{e.titulo}</p>
                    <p className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString("pt-BR")}{e.descricao ? ` — ${e.descricao}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {e.tipo === "link" && e.url_externa && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-info hover:text-info/80" onClick={() => window.open(e.url_externa!, "_blank")}><Eye className="h-3.5 w-3.5" /></Button>
                    )}
                    {e.tipo === "arquivo" && e.file_path && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-info hover:text-info/80" onClick={async () => {
                        try { const url = await evidSvc.getEvidenciaSignedUrl(e.file_path!); window.open(url, "_blank"); } catch { toast.error("Erro ao abrir arquivo"); }
                      }}><Upload className="h-3.5 w-3.5" /></Button>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive" onClick={() => setDeleteEvidId(e.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
      {Object.values(evidenciasByFase).flat().length === 0 && !evidLoading && <p className="text-sm text-muted-foreground">Nenhuma evidência registrada.</p>}
    </div>
  );
}
