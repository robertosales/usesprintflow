import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import {
  fetchActiveTemplates,
  fetchGenerations,
  createGeneration,
  invokeApfGeneration,
  prepareFilesForEdgeFunction,
  type ApfTemplate,
  type ApfGeneration,
} from "../services/apf.service";
import { supabase } from "@/integrations/supabase/client";

export type Provider = "lovable" | "openai" | "gemini" | "anthropic" | "perplexity";
export type OutputFormat = "docx" | "markdown";

export type ProgressStep =
  | "idle"
  | "reading_files"
  | "calling_ai"
  | "saving"
  | "done";

export const PROGRESS_LABELS: Record<ProgressStep, string> = {
  idle: "",
  reading_files: "Lendo arquivos (Baseline + Modelo)...",
  calling_ai: "Gerando documento com IA...",
  saving: "Salvando resultado...",
  done: "Concluído!",
};

export const PROVIDERS: { value: Provider; label: string; needsKey: boolean; placeholder: string }[] = [
  { value: "lovable",     label: "Lovable AI (Gemini/GPT) — recomendado", needsKey: false, placeholder: "" },
  { value: "openai",      label: "OpenAI (GPT)",      needsKey: true, placeholder: "sk-..." },
  { value: "gemini",      label: "Google Gemini",     needsKey: true, placeholder: "AIza..." },
  { value: "anthropic",   label: "Anthropic (Claude)",needsKey: true, placeholder: "sk-ant-..." },
  { value: "perplexity",  label: "Perplexity",        needsKey: true, placeholder: "pplx-..." },
];

export type InteractiveQuestion = {
  id: string;
  text: string;
  kind: "yesno" | "open";
  followUp?: string;
};

export const YESNO_REGEX =
  /\(\s*(sim|s)\s*\/\s*(n[ãa]o|n)\s*\)|\[\s*(sim|s)\s*\/\s*(n[ãa]o|n)\s*\]/i;

export function detectInteractiveQuestions(prompt: string): InteractiveQuestion[] {
  if (!prompt) return [];
  const lines = prompt.split(/\r?\n/);
  const questions: InteractiveQuestion[] = [];
  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) return;
    if (YESNO_REGEX.test(line) && /\?/.test(line)) {
      const next = (lines[idx + 1] ?? "").trim();
      const followUp =
        /^se\s+sim/i.test(next) || /descreva|informe|detalhe/i.test(next)
          ? next
          : "Descreva o que foi alterado";
      questions.push({ id: `q_${idx}`, text: line, kind: "yesno", followUp });
      return;
    }
    const open = line.match(/\{\{\s*pergunta\s*:\s*(.+?)\s*\}\}/i);
    if (open) questions.push({ id: `q_${idx}`, text: open[1], kind: "open" });
  });
  return questions;
}

export function applyAnswersToPrompt(
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
  const stripped = prompt
    .split(/\r?\n/)
    .filter((l) => !YESNO_REGEX.test(l) && !/\{\{\s*pergunta\s*:/i.test(l))
    .join("\n");
  return `${stripped}\n\n=== RESPOSTAS DO USUÁRIO ===\n${summary}\n=== FIM DAS RESPOSTAS ===\n\nIMPORTANTE: Use as respostas acima como dados confirmados pelo usuário. NÃO repita as perguntas no documento — incorpore as respostas naturalmente no conteúdo gerado.`;
}

export function useApfGenerate() {
  const { currentTeamId, user } = useAuth();
  const { sprints } = useSprint();

  const [selectedSprintId, setSelectedSprintId]     = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templates, setTemplates]                   = useState<ApfTemplate[]>([]);
  const [baselineFile, setBaselineFile]             = useState<File | null>(null);
  const [huFiles, setHuFiles]                       = useState<File[]>([]);
  const [modelFile, setModelFile]                   = useState<File | null>(null);
  const [generating, setGenerating]                 = useState(false);
  const [progressStep, setProgressStep]             = useState<ProgressStep>("idle");
  const [generations, setGenerations]               = useState<(ApfGeneration & { template_name?: string })[]>([]);
  const [loadingHistory, setLoadingHistory]         = useState(false);
  const [provider, setProvider]                     = useState<Provider>("lovable");
  const [apiKey, setApiKey]                         = useState("");
  const [outputFormat, setOutputFormat]             = useState<OutputFormat>("docx");
  const [lastResult, setLastResult] = useState<{
    base64: string;
    markdown: string;
    baseFilename: string;
    pfBreakdown: Record<string, number>;
    pfTotal: number | null;
  } | null>(null);
  const [showPreview, setShowPreview]   = useState(false);
  const [questions, setQuestions]       = useState<InteractiveQuestion[]>([]);
  const [answers, setAnswers]           = useState<Record<string, { value: string; detail?: string }>>({});
  const [showQuestions, setShowQuestions] = useState(false);

  // ─── Refs para sempre ler o valor mais recente (evita stale closure) ───
  const baselineFileRef      = useRef(baselineFile);
  const huFilesRef           = useRef(huFiles);
  const modelFileRef         = useRef(modelFile);
  const selectedSprintIdRef  = useRef(selectedSprintId);
  const selectedTemplateIdRef= useRef(selectedTemplateId);
  const selectedTemplateRef  = useRef<ApfTemplate | undefined>(undefined);
  const questionsRef         = useRef(questions);
  const answersRef           = useRef(answers);
  const providerRef          = useRef(provider);
  const apiKeyRef            = useRef(apiKey);
  const outputFormatRef      = useRef(outputFormat);

  useEffect(() => { baselineFileRef.current      = baselineFile; },      [baselineFile]);
  useEffect(() => { huFilesRef.current           = huFiles; },           [huFiles]);
  useEffect(() => { modelFileRef.current         = modelFile; },         [modelFile]);
  useEffect(() => { selectedSprintIdRef.current  = selectedSprintId; },  [selectedSprintId]);
  useEffect(() => { selectedTemplateIdRef.current= selectedTemplateId; },[selectedTemplateId]);
  useEffect(() => { questionsRef.current         = questions; },         [questions]);
  useEffect(() => { answersRef.current           = answers; },           [answers]);
  useEffect(() => { providerRef.current          = provider; },          [provider]);
  useEffect(() => { apiKeyRef.current            = apiKey; },            [apiKey]);
  useEffect(() => { outputFormatRef.current      = outputFormat; },      [outputFormat]);

  // ─── Carregar templates ───
  useEffect(() => {
    if (!currentTeamId) return;
    fetchActiveTemplates(currentTeamId).then(setTemplates).catch(() => {});
  }, [currentTeamId]);

  // ─── Histórico ───
  useEffect(() => {
    if (!currentTeamId || !selectedSprintId) { setGenerations([]); return; }
    setLoadingHistory(true);
    fetchGenerations(currentTeamId, selectedSprintId)
      .then(setGenerations)
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [currentTeamId, selectedSprintId]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

  useEffect(() => {
    selectedTemplateRef.current = selectedTemplate;
  }, [selectedTemplate]);

  useEffect(() => {
    if (!selectedTemplate) { setQuestions([]); setAnswers({}); return; }
    setQuestions(detectInteractiveQuestions(selectedTemplate.prompt_content));
    setAnswers({});
  }, [selectedTemplate]);

  const providerCfg = PROVIDERS.find((p) => p.value === provider)!;
  const apiKeyOk    = !providerCfg.needsKey || apiKey.trim().length > 0;

  // canGenerate lê sempre do estado (usado só para desabilitar o botão na UI)
  const canGenerate = !!selectedSprintId && !!selectedTemplateId && !!baselineFile && huFiles.length > 0 && !!modelFile && apiKeyOk;

  const allQuestionsAnswered = questions.every((q) => {
    const a = answers[q.id];
    if (!a || !a.value) return false;
    if (q.kind === "yesno" && a.value === "sim" && !a.detail?.trim()) return false;
    return true;
  });

  // ─── runGeneration lê SEMPRE via refs — nunca fica stale ───
  const runGeneration = useCallback(async () => {
    if (!currentTeamId || !user) { toast.error("Sessão inválida. Faça login novamente."); return; }

    // Lê valores atuais via refs
    const _baseline   = baselineFileRef.current;
    const _huFiles    = huFilesRef.current;
    const _modelFile  = modelFileRef.current;
    const _sprintId   = selectedSprintIdRef.current;
    const _templateId = selectedTemplateIdRef.current;
    const _template   = selectedTemplateRef.current;
    const _questions  = questionsRef.current;
    const _answers    = answersRef.current;
    const _provider   = providerRef.current;
    const _apiKey     = apiKeyRef.current;
    const _format     = outputFormatRef.current;
    const _providerCfg = PROVIDERS.find((p) => p.value === _provider)!;
    const _apiKeyOk   = !_providerCfg.needsKey || _apiKey.trim().length > 0;

    const missing: string[] = [];
    if (!_sprintId)         missing.push("Sprint");
    if (!_templateId)       missing.push("Template");
    if (!_baseline)         missing.push("Baseline");
    if (_huFiles.length === 0) missing.push("HUs da Sprint");
    if (!_modelFile)        missing.push("Modelo de Contagem");
    if (!_apiKeyOk)         missing.push("API Key do provedor");
    if (missing.length > 0) { toast.error(`Preencha antes de gerar: ${missing.join(", ")}`); return; }

    setGenerating(true);
    let generationId: string | undefined;

    try {
      const sprint       = sprints.find((s) => s.id === _sprintId);
      const baseFilename = `APF_${(sprint?.name ?? "Sprint").replace(/\s+/g, "_")}_${Date.now()}`;
      const filename     = `${baseFilename}.${_format === "docx" ? "docx" : "md"}`;

      const gen = await createGeneration({
        team_id:         currentTeamId,
        template_id:     _templateId,
        sprint_id:       _sprintId,
        generated_by:    user.id,
        baseline_file:   _baseline!.name,
        hu_file:         _huFiles.map((f) => f.name).join(", "),
        model_file:      _modelFile!.name,
        output_filename: filename,
        status:          "pending",
      });
      generationId = gen.id;

      setProgressStep("reading_files");
      const allFiles    = [_baseline!, ..._huFiles, _modelFile!];
      const filePayload = await prepareFilesForEdgeFunction(allFiles);

      const finalPrompt = applyAnswersToPrompt(
        _template!.prompt_content,
        _questions,
        _answers,
      );

      setProgressStep("calling_ai");
      const result = await invokeApfGeneration({
        prompt:       finalPrompt,
        provider:     _provider,
        apiKey:       _providerCfg.needsKey ? _apiKey.trim() : undefined,
        files:        filePayload,
        generationId,
      });

      setProgressStep("saving");
      setLastResult({
        base64:      result.docxBase64,
        markdown:    result.markdown,
        baseFilename,
        pfBreakdown: result.pfBreakdown,
        pfTotal:     result.pfTotal,
      });
      setShowPreview(true);

      const updated = await fetchGenerations(currentTeamId, _sprintId);
      setGenerations(updated);

      setProgressStep("done");
      toast.success("Documento gerado! Visualize e baixe no formato desejado.");
    } catch (e: any) {
      console.error("Erro ao gerar APF:", e);
      if (generationId) {
        await supabase
          .from("apf_generations")
          .update({ status: "error", error_message: e?.message ?? "Erro desconhecido" })
          .eq("id", generationId)
          .catch(() => {});
        const updated = await fetchGenerations(currentTeamId!, selectedSprintIdRef.current);
        setGenerations(updated);
      }
      toast.error(e?.message ?? "Erro ao gerar documento");
    } finally {
      setGenerating(false);
      setShowQuestions(false);
      setTimeout(() => setProgressStep("idle"), 2000);
    }
  // Deps mínimas — tudo mais é lido via ref
  }, [currentTeamId, user, sprints]);

  const handleGenerateClick = useCallback(() => {
    // Lê canGenerate na hora (não da closure)
    const _baseline  = baselineFileRef.current;
    const _huFiles   = huFilesRef.current;
    const _modelFile = modelFileRef.current;
    const _sprintId  = selectedSprintIdRef.current;
    const _templateId= selectedTemplateIdRef.current;
    const _provider  = providerRef.current;
    const _apiKey    = apiKeyRef.current;
    const _providerCfg = PROVIDERS.find((p) => p.value === _provider)!;
    const _apiKeyOk  = !_providerCfg.needsKey || _apiKey.trim().length > 0;
    const _canGenerate = !!_sprintId && !!_templateId && !!_baseline && _huFiles.length > 0 && !!_modelFile && _apiKeyOk;

    if (!_canGenerate) return;

    const _questions = questionsRef.current;
    const _answers   = answersRef.current;
    const _allAnswered = _questions.every((q) => {
      const a = _answers[q.id];
      if (!a || !a.value) return false;
      if (q.kind === "yesno" && a.value === "sim" && !a.detail?.trim()) return false;
      return true;
    });

    if (_questions.length > 0 && !_allAnswered) { setShowQuestions(true); return; }
    void runGeneration();
  }, [runGeneration]);

  return {
    sprints,
    selectedSprintId, setSelectedSprintId,
    selectedTemplateId, setSelectedTemplateId,
    templates, selectedTemplate,
    baselineFile, setBaselineFile,
    huFiles, setHuFiles,
    modelFile, setModelFile,
    provider, setProvider, providerCfg,
    apiKey, setApiKey, apiKeyOk,
    outputFormat, setOutputFormat,
    generating, canGenerate,
    progressStep,
    handleGenerateClick, runGeneration,
    generations, loadingHistory,
    lastResult, showPreview, setShowPreview,
    questions, answers, setAnswers,
    showQuestions, setShowQuestions,
    allQuestionsAnswered,
  };
}
