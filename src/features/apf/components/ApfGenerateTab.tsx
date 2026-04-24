import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, FileText, File, Upload, X, Download, Loader2, Sparkles, KeyRound, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import { supabase } from "@/integrations/supabase/client";
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

const BASELINE_FIELD: FileField = { label: "Baseline", description: "Planilha com colunas Item e Tipo", accept: ".xlsx", icon: FileSpreadsheet };
const HU_FIELD: FileField = { label: "HUs da Sprint", description: "Lista de HUs (pode anexar várias)", accept: ".docx,.pdf,.md,.txt", icon: FileText };
const MODEL_FIELD: FileField = { label: "Modelo de Contagem", description: "Template do documento de saída", accept: ".docx,.xlsx", icon: File };

type Provider = "lovable" | "openai" | "gemini" | "anthropic" | "perplexity";

const PROVIDERS: { value: Provider; label: string; needsKey: boolean; placeholder: string }[] = [
  { value: "lovable", label: "Lovable AI (Gemini/GPT) — recomendado", needsKey: false, placeholder: "" },
  { value: "openai", label: "OpenAI (GPT)", needsKey: true, placeholder: "sk-..." },
  { value: "gemini", label: "Google Gemini", needsKey: true, placeholder: "AIza..." },
  { value: "anthropic", label: "Anthropic (Claude)", needsKey: true, placeholder: "sk-ant-..." },
  { value: "perplexity", label: "Perplexity", needsKey: true, placeholder: "pplx-..." },
];

// Lê arquivo como texto bruto (UTF-8). Bons resultados para .md, .txt, .docx (XML interno) e .xlsx limitado.
async function readFileAsText(file: File): Promise<string> {
  try {
    const text = await file.text();
    return text.length > 50000 ? text.slice(0, 50000) + "\n[... conteúdo truncado ...]" : text;
  } catch {
    return `[Não foi possível ler o conteúdo de ${file.name}]`;
  }
}

function downloadDocxFromBase64(base64: string, filename: string) {
  const byteChars = atob(base64);
  const byteArr = new Uint8Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
  const blob = new Blob([byteArr], {
    type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

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
  const [baselineFile, setBaselineFile] = useState<File | null>(null);
  const [huFiles, setHuFiles] = useState<File[]>([]);
  const [modelFile, setModelFile] = useState<File | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generations, setGenerations] = useState<(ApfGeneration & { template_name?: string })[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [provider, setProvider] = useState<Provider>("lovable");
  const [apiKey, setApiKey] = useState("");
  // Cache do último DOCX gerado para download via histórico (in-memory por sessão)
  const [lastDocx, setLastDocx] = useState<{ base64: string; filename: string } | null>(null);

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
  const providerCfg = PROVIDERS.find((p) => p.value === provider)!;
  const apiKeyOk = !providerCfg.needsKey || apiKey.trim().length > 0;
  const canGenerate =
    !!selectedSprintId &&
    !!selectedTemplateId &&
    !!baselineFile &&
    huFiles.length > 0 &&
    !!modelFile &&
    apiKeyOk;

  const handleGenerate = async () => {
    if (!canGenerate || !currentTeamId || !user) return;
    setGenerating(true);
    try {
      const sprint = sprints.find((s) => s.id === selectedSprintId);
      const filename = `APF_${(sprint?.name ?? "Sprint").replace(/\s+/g, "_")}_${Date.now()}.docx`;

      // Lê todos os arquivos como texto para enviar como contexto (Baseline + várias HUs + Modelo)
      const allFiles: File[] = [baselineFile!, ...huFiles, modelFile!];
      const filePayload = await Promise.all(
        allFiles.map(async (f) => ({
          name: f.name,
          content: await readFileAsText(f),
        })),
      );

      const { data, error } = await supabase.functions.invoke("apf-generate", {
        body: {
          prompt: selectedTemplate!.prompt_content,
          provider,
          apiKey: providerCfg.needsKey ? apiKey.trim() : undefined,
          files: filePayload,
        },
      });

      if (error) throw new Error(error.message ?? "Erro ao chamar a IA");
      if (!data?.success || !data?.docxBase64) {
        throw new Error(data?.error ?? "A IA não retornou conteúdo");
      }

      // Faz download imediato
      downloadDocxFromBase64(data.docxBase64, filename);
      setLastDocx({ base64: data.docxBase64, filename });

      await createGeneration({
        team_id: currentTeamId,
        template_id: selectedTemplateId,
        sprint_id: selectedSprintId,
        generated_by: user.id,
        baseline_file: baselineFile!.name,
        hu_file: huFiles.map((f) => f.name).join(", "),
        model_file: modelFile!.name,
        output_filename: filename,
        status: "success",
      });
      toast.success("Documento gerado e baixado com sucesso!");
      // Refresh history
      const updated = await fetchGenerations(currentTeamId, selectedSprintId);
      setGenerations(updated);
    } catch (e: any) {
      console.error("Erro ao gerar APF:", e);
      toast.error(e?.message ?? "Erro ao gerar documento");
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
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Provedor de IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Escolha qual IA gerará o documento <span className="text-destructive">*</span></Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as Provider)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {providerCfg.needsKey ? (
              <div className="space-y-1.5">
                <Label className="text-xs flex items-center gap-1.5">
                  <KeyRound className="h-3.5 w-3.5" /> Sua API Key <span className="text-destructive">*</span>
                </Label>
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={providerCfg.placeholder}
                  autoComplete="off"
                />
                <p className="text-[11px] text-muted-foreground">
                  A chave é usada apenas para esta requisição e <strong>não é armazenada</strong>.
                </p>
              </div>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                ✅ Lovable AI já está configurado — sem necessidade de chave própria.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Arquivos de Entrada</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FileUploadField
              field={BASELINE_FIELD}
              file={baselineFile}
              onSelect={setBaselineFile}
              onRemove={() => setBaselineFile(null)}
            />

            {/* HUs — múltiplos arquivos */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {HU_FIELD.label} <span className="text-muted-foreground">({huFiles.length} anexada{huFiles.length === 1 ? "" : "s"})</span>
              </Label>

              {huFiles.length > 0 && (
                <div className="space-y-1.5">
                  {huFiles.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground truncate flex-1">{f.name}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => setHuFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <label
                className="flex flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border hover:border-primary/50 transition-colors cursor-pointer py-4"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files);
                  if (dropped.length) setHuFiles((prev) => [...prev, ...dropped]);
                }}
              >
                {huFiles.length === 0 ? (
                  <>
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{HU_FIELD.description}</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Adicionar mais HUs</span>
                  </>
                )}
                <span className="text-[10px] text-muted-foreground/60">{HU_FIELD.accept}</span>
                <input
                  type="file"
                  multiple
                  accept={HU_FIELD.accept}
                  className="hidden"
                  onChange={(e) => {
                    const selected = Array.from(e.target.files ?? []);
                    if (selected.length) setHuFiles((prev) => [...prev, ...selected]);
                    e.target.value = "";
                  }}
                />
              </label>
            </div>

            <FileUploadField
              field={MODEL_FIELD}
              file={modelFile}
              onSelect={setModelFile}
              onRemove={() => setModelFile(null)}
            />
          </CardContent>
        </Card>

        <Button
          className="w-full"
          size="lg"
          disabled={!canGenerate || generating}
          onClick={handleGenerate}
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando com IA...</>
          ) : (
            "Gerar Documento DOCX"
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
                      {g.status === "success" && lastDocx?.filename === g.output_filename && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs w-full mt-1"
                          onClick={() => downloadDocxFromBase64(lastDocx.base64, lastDocx.filename)}
                        >
                          <Download className="h-3 w-3 mr-1" /> Baixar novamente
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