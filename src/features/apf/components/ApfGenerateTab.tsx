import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, FileText, File, Upload, X, Download, Loader2, Sparkles, KeyRound, Plus, HelpCircle } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
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

// ============================================================
// Detector de perguntas interativas dentro do prompt do template
// Suporta os padrões mais comuns:
//   - "Houve alteração em banco de dados? (Sim/Não)"
//   - "Algo mudou? (S/N)"
//   - "Pergunta? [Sim/Não]"
// Também trata perguntas abertas marcadas como "{{pergunta: ...}}"
// ============================================================
type InteractiveQuestion = {
  id: string;            // chave única (linha exata da pergunta)
  text: string;          // texto da pergunta a exibir
  kind: "yesno" | "open";
  followUp?: string;     // ex.: "Informe o que foi alterado"
};

const YESNO_REGEX = /\(\s*(sim|s)\s*\/\s*(n[ãa]o|n)\s*\)|\[\s*(sim|s)\s*\/\s*(n[ãa]o|n)\s*\]/i;

function detectInteractiveQuestions(prompt: string): InteractiveQuestion[] {
  if (!prompt) return [];
  const lines = prompt.split(/\r?\n/);
  const questions: InteractiveQuestion[] = [];

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) return;

    // Padrão 1: pergunta Sim/Não
    if (YESNO_REGEX.test(line) && /\?/.test(line)) {
      // tenta capturar uma instrução de follow-up logo abaixo (ex.: "Se sim, descreva...")
      const next = (lines[idx + 1] ?? "").trim();
      const followUp =
        /^se\s+sim/i.test(next) || /descreva|informe|detalhe/i.test(next)
          ? next
          : "Descreva o que foi alterado";
      questions.push({
        id: `q_${idx}`,
        text: line,
        kind: "yesno",
        followUp,
      });
      return;
    }

    // Padrão 2: marcador {{pergunta: ...}}
    const open = line.match(/\{\{\s*pergunta\s*:\s*(.+?)\s*\}\}/i);
    if (open) {
      questions.push({
        id: `q_${idx}`,
        text: open[1],
        kind: "open",
      });
    }
  });

  return questions;
}

function applyAnswersToPrompt(
  prompt: string,
  questions: InteractiveQuestion[],
  answers: Record<string, { value: string; detail?: string }>,
): string {
  if (questions.length === 0) return prompt;

  const summary = questions
    .map((q) => {
      const a = answers[q.id];
      if (!a) return `- ${q.text}\n  Resposta: (não informada)`;
      if (q.kind === "yesno") {
        const isYes = a.value === "sim";
        const detail = isYes && a.detail?.trim() ? `\n  Detalhes: ${a.detail.trim()}` : "";
        return `- ${q.text}\n  Resposta: ${isYes ? "Sim" : "Não"}${detail}`;
      }
      return `- ${q.text}\n  Resposta: ${a.value || "(vazio)"}`;
    })
    .join("\n");

  // Remove as linhas das perguntas Sim/Não originais para evitar duplicidade no documento
  const stripped = prompt
    .split(/\r?\n/)
    .filter((l) => !YESNO_REGEX.test(l) && !/\{\{\s*pergunta\s*:/i.test(l))
    .join("\n");

  return `${stripped}\n\n=== RESPOSTAS DO USUÁRIO ===\n${summary}\n=== FIM DAS RESPOSTAS ===\n\nIMPORTANTE: Use as respostas acima como dados confirmados pelo usuário. NÃO repita as perguntas no documento — incorpore as respostas naturalmente no conteúdo gerado.`;
}
// ============================================================

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

  // Perguntas interativas detectadas no prompt + modal de respostas
  const [questions, setQuestions] = useState<InteractiveQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, { value: string; detail?: string }>>({});
  const [showQuestions, setShowQuestions] = useState(false);

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

  // Re-detecta perguntas sempre que o template mudar
  useEffect(() => {
    if (!selectedTemplate) {
      setQuestions([]);
      setAnswers({});
      return;
    }
    const detected = detectInteractiveQuestions(selectedTemplate.prompt_content);
    setQuestions(detected);
    setAnswers({});
  }, [selectedTemplateId]);

  const providerCfg = PROVIDERS.find((p) => p.value === provider)!;
  const apiKeyOk = !providerCfg.needsKey || apiKey.trim().length > 0;
  const canGenerate =
    !!selectedSprintId &&
    !!selectedTemplateId &&
    !!baselineFile &&
    huFiles.length > 0 &&
    !!modelFile &&
    apiKeyOk;

  const allQuestionsAnswered = questions.every((q) => {
    const a = answers[q.id];
    if (!a || !a.value) return false;
    if (q.kind === "yesno" && a.value === "sim" && !a.detail?.trim()) return false;
    return true;
  });

  // Quando o usuário clica em "Gerar": se houver perguntas, abre o modal antes
  const handleGenerateClick = () => {
    if (!canGenerate) return;
    if (questions.length > 0 && !allQuestionsAnswered) {
      setShowQuestions(true);
      return;
    }
    void runGeneration();
  };

  const runGeneration = async () => {
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

      // Aplica as respostas das perguntas interativas ao prompt final
      const finalPrompt = applyAnswersToPrompt(
        selectedTemplate!.prompt_content,
        questions,
        answers,
      );

      const { data, error } = await supabase.functions.invoke("apf-generate", {
        body: {
          prompt: finalPrompt,
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
      setShowQuestions(false);
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
          onClick={handleGenerateClick}
        >
          {generating ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando com IA...</>
          ) : questions.length > 0 && !allQuestionsAnswered ? (
            <><HelpCircle className="h-4 w-4 mr-2" /> Responder {questions.length} pergunta{questions.length > 1 ? "s" : ""} e gerar</>
          ) : (
            "Gerar Documento DOCX"
          )}
        </Button>

        {questions.length > 0 && (
          <p className="text-[11px] text-muted-foreground -mt-3 px-1">
            ⓘ Este template contém {questions.length} pergunta{questions.length > 1 ? "s" : ""} interativa{questions.length > 1 ? "s" : ""} que você precisa responder antes da geração.
          </p>
        )}
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

      {/* Modal de perguntas interativas */}
      <Dialog open={showQuestions} onOpenChange={setShowQuestions}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-primary" />
              Responda antes de gerar
            </DialogTitle>
            <DialogDescription>
              O template selecionado contém perguntas. Suas respostas serão enviadas à IA para gerar o documento — as perguntas <strong>não</strong> aparecerão no arquivo final.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 max-h-[55vh] overflow-y-auto pr-1">
            {questions.map((q) => {
              const a = answers[q.id];
              if (q.kind === "yesno") {
                return (
                  <div key={q.id} className="space-y-2">
                    <Label className="text-xs font-medium leading-relaxed">
                      {q.text.replace(YESNO_REGEX, "").replace(/\?$/, "?").trim()}
                    </Label>
                    <RadioGroup
                      value={a?.value ?? ""}
                      onValueChange={(v) =>
                        setAnswers((prev) => ({
                          ...prev,
                          [q.id]: { value: v, detail: prev[q.id]?.detail ?? "" },
                        }))
                      }
                      className="flex gap-4"
                    >
                      <label className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="sim" id={`${q.id}-sim`} />
                        <span className="text-sm">Sim</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <RadioGroupItem value="nao" id={`${q.id}-nao`} />
                        <span className="text-sm">Não</span>
                      </label>
                    </RadioGroup>

                    {a?.value === "sim" && (
                      <div className="space-y-1.5 pl-1 pt-1 border-l-2 border-primary/40 pl-3">
                        <Label className="text-[11px] text-muted-foreground">
                          {q.followUp ?? "Descreva os detalhes"} <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          rows={3}
                          placeholder="Informe aqui o que foi alterado..."
                          value={a.detail ?? ""}
                          onChange={(e) =>
                            setAnswers((prev) => ({
                              ...prev,
                              [q.id]: { value: "sim", detail: e.target.value },
                            }))
                          }
                        />
                      </div>
                    )}
                  </div>
                );
              }
              // Pergunta aberta
              return (
                <div key={q.id} className="space-y-1.5">
                  <Label className="text-xs font-medium">{q.text}</Label>
                  <Textarea
                    rows={3}
                    value={a?.value ?? ""}
                    onChange={(e) =>
                      setAnswers((prev) => ({
                        ...prev,
                        [q.id]: { value: e.target.value },
                      }))
                    }
                  />
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowQuestions(false)} disabled={generating}>
              Cancelar
            </Button>
            <Button
              onClick={runGeneration}
              disabled={!allQuestionsAnswered || generating}
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Gerando...</>
              ) : (
                "Confirmar e gerar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}