import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheet, FileText, File, Upload, X, Download, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import { toast } from "sonner";
import {
  fetchActiveTemplates,
  fetchGenerations,
  createGeneration,
  type ApfTemplate,
  type ApfGeneration,
} from "../services/apf.service";

interface FileField {
  label: string;
  description: string;
  accept: string;
  icon: React.ElementType;
}

const FILE_FIELDS: FileField[] = [
  { label: "Baseline", description: "Planilha com colunas Item e Tipo", accept: ".xlsx", icon: FileSpreadsheet },
  { label: "HUs da Sprint", description: "Lista de HUs com código, título e descrição", accept: ".docx,.pdf,.md", icon: FileText },
  { label: "Modelo de Contagem", description: "Template do documento de saída", accept: ".docx,.xlsx", icon: File },
];

function FileUploadField({
  field,
  file,
  onSelect,
  onRemove,
}: {
  field: FileField;
  file: File | null;
  onSelect: (f: File) => void;
  onRemove: () => void;
}) {
  const Icon = field.icon;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f) onSelect(f);
  };

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{field.label}</Label>
      {file ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
          <span className="text-xs text-foreground truncate flex-1">{file.name}</span>
          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onRemove}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <label
          className="flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer py-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
        >
          <Upload className="h-5 w-5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">{field.description}</span>
          <span className="text-[10px] text-muted-foreground/60">{field.accept}</span>
          <input
            type="file"
            accept={field.accept}
            className="hidden"
            onChange={(e) => e.target.files?.[0] && onSelect(e.target.files[0])}
          />
        </label>
      )}
    </div>
  );
}

export function ApfGenerateTab() {
  const { currentTeamId, user } = useAuth();
  const { sprints } = useSprint();
  const [selectedSprintId, setSelectedSprintId] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templates, setTemplates] = useState<ApfTemplate[]>([]);
  const [files, setFiles] = useState<(File | null)[]>([null, null, null]);
  const [generating, setGenerating] = useState(false);
  const [generations, setGenerations] = useState<(ApfGeneration & { template_name?: string })[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load templates
  useEffect(() => {
    if (!currentTeamId) return;
    fetchActiveTemplates(currentTeamId).then(setTemplates).catch(() => {});
  }, [currentTeamId]);

  // Load history when sprint changes
  useEffect(() => {
    if (!currentTeamId || !selectedSprintId) {
      setGenerations([]);
      return;
    }
    setLoadingHistory(true);
    fetchGenerations(currentTeamId, selectedSprintId)
      .then(setGenerations)
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [currentTeamId, selectedSprintId]);

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  const canGenerate = selectedSprintId && selectedTemplateId && files.every(Boolean);

  const handleGenerate = async () => {
    if (!canGenerate || !currentTeamId || !user) return;
    setGenerating(true);
    try {
      // Simulate 2s processing
      await new Promise((r) => setTimeout(r, 2000));
      const sprint = sprints.find((s) => s.id === selectedSprintId);
      await createGeneration({
        team_id: currentTeamId,
        template_id: selectedTemplateId,
        sprint_id: selectedSprintId,
        generated_by: user.id,
        baseline_file: files[0]!.name,
        hu_file: files[1]!.name,
        model_file: files[2]!.name,
        output_filename: `APF_${sprint?.name ?? "Sprint"}_${Date.now()}.${selectedTemplate?.output_type ?? "docx"}`,
        status: "success",
      });
      toast.success("Documento gerado com sucesso!");
      // Refresh history
      const updated = await fetchGenerations(currentTeamId, selectedSprintId);
      setGenerations(updated);
    } catch {
      toast.error("Erro ao gerar documento");
    } finally {
      setGenerating(false);
    }
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "success": return <Badge className="bg-green-600/20 text-green-400 border-green-600/30 text-[10px]">Concluído</Badge>;
      case "error": return <Badge variant="destructive" className="text-[10px]">Erro</Badge>;
      default: return <Badge className="bg-yellow-600/20 text-yellow-400 border-yellow-600/30 text-[10px]">Processando</Badge>;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
      {/* Left Panel - Configuration */}
      <div className="lg:col-span-3 space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Seleção</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Sprint <span className="text-destructive">*</span></Label>
              <Select value={selectedSprintId} onValueChange={setSelectedSprintId}>
                <SelectTrigger><SelectValue placeholder="Selecione uma sprint" /></SelectTrigger>
                <SelectContent>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Template <span className="text-destructive">*</span></Label>
              <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Selecione um template" /></SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedTemplate && (
              <div className="rounded-md bg-muted/50 border border-border p-3 max-h-[150px] overflow-y-auto">
                <pre className="text-[11px] font-mono text-muted-foreground whitespace-pre-wrap break-words">
                  {selectedTemplate.prompt_content}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Arquivos de Entrada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {FILE_FIELDS.map((field, i) => (
              <FileUploadField
                key={field.label}
                field={field}
                file={files[i]}
                onSelect={(f) => setFiles((prev) => { const n = [...prev]; n[i] = f; return n; })}
                onRemove={() => setFiles((prev) => { const n = [...prev]; n[i] = null; return n; })}
              />
            ))}
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          disabled={!canGenerate || generating}
          onClick={handleGenerate}
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
          ) : (
            "Gerar Documento"
          )}
        </Button>
      </div>

      {/* Right Panel - History */}
      <div className="lg:col-span-2">
        <Card className="h-full">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Histórico desta Sprint</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedSprintId ? (
              <p className="text-xs text-muted-foreground text-center py-8">Selecione uma sprint para ver o histórico</p>
            ) : loadingHistory ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : generations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma geração para esta sprint ainda</p>
            ) : (
              <ScrollArea className="max-h-[500px]">
                <div className="space-y-3">
                  {generations.map((g) => (
                    <div key={g.id} className="rounded-md border border-border p-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-medium text-foreground">{g.template_name}</p>
                        {statusBadge(g.status)}
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(g.created_at).toLocaleString("pt-BR")}
                      </p>
                      {g.status === "success" && (
                        <Button variant="outline" size="sm" className="h-7 text-xs w-full mt-1" disabled>
                          <Download className="h-3 w-3 mr-1" /> Baixar
                        </Button>
                      )}
                      {g.status === "error" && g.error_message && (
                        <p className="text-[10px] text-destructive">{g.error_message}</p>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}