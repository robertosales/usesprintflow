import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import {
  fetchActiveTemplates,
  fetchGenerations,
  createGeneration,
  invokeApfGeneration,
  type ApfTemplate,
  type ApfGeneration
} from "../services/apf.service";
import { listAIProviders, type AIProvider, type ProviderType } from "@/features/admin/services/aiProviders.service";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { baselineFileToMarkdown } from "../utils/baselineXlsxToMd";
import { fetchSprintHusAsMarkdown } from "../utils/husToMarkdown";

export type ProgressStep = "idle" | "collecting" | "calling_ai" | "saving" | "done";
export type OutputFormat = "docx" | "md";
export type Provider = ProviderType | "manus";

export type InteractiveQuestion = {
  id: string;
  text: string;
  kind: "yesno" | "open";
  followUp?: string;
  allowSqlFiles?: boolean;
};

const DEFAULT_DB_CHANGE_QUESTION: InteractiveQuestion = {
  id: "q_db_changes",
  text: "Houve alteração de banco de dados?",
  kind: "yesno",
  followUp: "Descreva as alterações de banco e anexe os scripts SQL Server, se houver.",
  allowSqlFiles: true,
};

const INLINE_AI_PROVIDERS: AIProvider[] = [
  { id: "inline:lovable", name: "Lovable AI (Gratuita) — recomendada", provider_type: "lovable", model: "google/gemini-2.0-flash", is_recommended: true, is_active: true, has_key: true, created_at: "", updated_at: "" },
];

export const YESNO_REGEX =
  /\(\s*(sim|s)\s*\/\s*(n[\u00e3a]o|n)\s*\)|\[\s*(sim|s)\s*\/\s*(n[\u00e3a]o|n)\s*\]/i;

export function detectInteractiveQuestions(prompt: string): InteractiveQuestion[] {
  if (!prompt) return [DEFAULT_DB_CHANGE_QUESTION];
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
      questions.push({ id: `q_${idx}`, text: line, kind: "yesno", followUp, allowSqlFiles: /banco|database|sql|dados/i.test(`${line} ${next}`) });
      return;
    }
    const open = line.match(/\{\{\s*pergunta\s*:\s*(.+?)\s*\}\}/i);
    if (open) questions.push({ id: `q_${idx}`, text: open[1], kind: "open" });
  });
  const hasDbChangeQuestion = questions.some((q) => /banco|dados|database|sql/i.test(q.text));
  if (!hasDbChangeQuestion) questions.push(DEFAULT_DB_CHANGE_QUESTION);
  return questions;
}

export function applyAnswersToPrompt(
  prompt: string,
  questions: InteractiveQuestion[],
  answers: Record<string, { value: string; detail?: string }>,
  sqlFileNames: string[] = [],
): string {
  if (questions.length === 0) return prompt;
  const summary = questions
    .map((q) => {
      const a = answers[q.id];
      if (!a) return `- ${q.text}\n  Resposta: (não informada)`;
      if (q.kind === "yesno") {
        const isYes = a.value === "sim";
        const detail = isYes && a.detail?.trim() ? `\n  Detalhes: ${a.detail.trim()}` : "";
        const scripts = isYes && q.allowSqlFiles && sqlFileNames.length > 0
          ? `\n  Scripts SQL Server anexados: ${sqlFileNames.join(", ")}`
          : "";
        return `- ${q.text}\n  Resposta: ${isYes ? "Sim" : "Não"}${detail}${scripts}`;
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
  const [generating, setGenerating]                 = useState(false);
  const [progressStep, setProgressStep]             = useState<ProgressStep>("idle");
  const [generations, setGenerations]               = useState<(ApfGeneration & { template_name?: string })[]>([]);
  const [loadingHistory, setLoadingHistory]         = useState(false);
  const [aiProviders, setAiProviders]               = useState<AIProvider[]>([]);
  const [selectedProviderId, setSelectedProviderId] = useState<string>("");
  const [apiKey, setApiKey]                         = useState("");
  const [outputFormat, setOutputFormat]             = useState<OutputFormat>("docx");
  const [sqlFiles, setSqlFiles]                     = useState<File[]>([]);

  const [lastResult, setLastResult] = useState<{
    markdown: string;
    baseFilename: string;
    pfBreakdown: Record<string, number>;
    pfTotal: number | null;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [questions, setQuestions]       = useState<InteractiveQuestion[]>([]);
  const [answers, setAnswers]           = useState<Record<string, { value: string; detail?: string }>>({});
  const [showQuestions, setShowQuestions] = useState(false);

  // Load templates
  useEffect(() => {
    if (!currentTeamId) return;
    fetchActiveTemplates(currentTeamId).then(setTemplates).catch(() => {});
  }, [currentTeamId]);

  // Load providers
  useEffect(() => {
    listAIProviders({ onlyActive: true })
      .then((list) => {
        const freeFromDb = list.filter((p) => p.provider_type === "lovable");
        const merged = [
          ...freeFromDb,
          ...INLINE_AI_PROVIDERS.filter((inline) => !freeFromDb.some((p) => p.provider_type === inline.provider_type)),
        ];
        setAiProviders(merged);
        if (merged.length > 0) {
          const recommended = merged.find((p) => p.is_recommended) ?? merged[0];
          setSelectedProviderId((cur) => cur || recommended.id);
        }
      })
      .catch(() => {
        setAiProviders(INLINE_AI_PROVIDERS);
        setSelectedProviderId((cur) => cur || INLINE_AI_PROVIDERS[0].id);
      });
  }, []);

  // Load history
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

  const selectedProvider = useMemo(
    () => aiProviders.find((p) => p.id === selectedProviderId) ?? null,
    [aiProviders, selectedProviderId],
  );

  const providerCfg = useMemo(() => {
    if (!selectedProvider) return { needsKey: false, placeholder: "" };
    const isLovable = selectedProvider.provider_type === "lovable";
    const needsKey = !isLovable && !selectedProvider.has_key;
    const placeholderByType: Record<string, string> = {
      openai: "sk-...", gemini: "AIza...", anthropic: "sk-ant-...", lovable: "", manus: "api-...",
    };
    return { needsKey, placeholder: placeholderByType[selectedProvider.provider_type] ?? "Cole sua API key" };
  }, [selectedProvider]);

  useEffect(() => {
    if (!selectedTemplate) { setQuestions([]); setAnswers({}); return; }
    setQuestions(detectInteractiveQuestions(selectedTemplate.prompt_content));
    setAnswers({});
  }, [selectedTemplate]);

  // Reset API key when provider changes
  useEffect(() => {
    if (providerCfg.needsKey) setApiKey("");
  }, [selectedProviderId, providerCfg.needsKey]);

  const canGenerate = !!selectedSprintId && !!selectedTemplateId && !!selectedProviderId
    && (!providerCfg.needsKey || apiKey.trim().length >= 10);

  const allQuestionsAnswered = questions.every((q) => {
    const a = answers[q.id];
    if (!a || !a.value) return false;
    if (q.kind === "yesno" && a.value === "sim" && !a.detail?.trim() && !(q.allowSqlFiles && sqlFiles.length > 0)) return false;
    return true;
  });

  const runGeneration = useCallback(async () => {
    if (!currentTeamId || !user) { toast.error("Sessão inválida. Faça login novamente."); return; }

    const missing: string[] = [];
    if (!selectedSprintId)    missing.push("Sprint");
    if (!selectedTemplateId)  missing.push("Template");
    if (!selectedProviderId)  missing.push("Provedor de IA");
    if (missing.length > 0) { toast.error(`Preencha antes de gerar: ${missing.join(", ")}`); return; }

    setGenerating(true);
    let generationId: string | undefined;

    try {
      const sprint       = sprints.find((s) => s.id === selectedSprintId);
      const baseFilename = `APF_${(sprint?.name ?? "Sprint").replace(/\s+/g, "_")}_${Date.now()}`;
      const filename     = `${baseFilename}.${outputFormat === "docx" ? "docx" : "md"}`;

      setProgressStep("collecting");
      const { markdown: husMd, count: huCount } = await fetchSprintHusAsMarkdown(selectedSprintId);

      let baselineMd: string | null = null;
      if (baselineFile) {
        baselineMd = await baselineFileToMarkdown(baselineFile);
      }
      const templateMd = selectedTemplate!.prompt_content;

      const gen = await createGeneration({
        team_id:       currentTeamId,
        template_id:   selectedTemplateId,
        sprint_id:     selectedSprintId,
        generated_by:  user.id,
        baseline_file: baselineFile?.name ?? "(banco)",
        hu_file:       `(${huCount} HU(s) da sprint)`,
        model_file:    "(template do banco)",
        output_filename: filename,
        status: "pending",
      });
      generationId = gen.id;

      const promptWithAnswers = applyAnswersToPrompt(
        templateMd, questions, answers, sqlFiles.map((file) => file.name),
      );
      const finalPrompt = [
        promptWithAnswers,
        "",
        "=== HUs DA SPRINT (extraídas do banco) ===",
        husMd,
        "=== FIM DAS HUs ===",
        baselineMd ? `\n=== BASELINE APF (tabela enxuta) ===\n${baselineMd}\n=== FIM DA BASELINE ===` : "",
      ].join("\n");

      setProgressStep("calling_ai");
      const isInlineProvider = selectedProviderId.startsWith("inline:");
      const result = await invokeApfGeneration({
        prompt:       finalPrompt,
        providerId:   isInlineProvider ? undefined : selectedProviderId,
        provider:     isInlineProvider ? (selectedProvider?.provider_type as Provider) : undefined,
        files:        [],
        generationId,
        apiKey:       providerCfg.needsKey ? apiKey.trim() : undefined,
        skipDocx:     true,
      });

      setProgressStep("saving");
      setLastResult({
        markdown:    result.markdown,
        baseFilename,
        pfBreakdown: result.pfBreakdown,
        pfTotal:     result.pfTotal,
      });
      setShowPreview(true);

      const updated = await fetchGenerations(currentTeamId, selectedSprintId);
      setGenerations(updated);

      setProgressStep("done");
      toast.success("Documento gerado!");
    } catch (e: unknown) {
      console.error("Erro ao gerar APF:", e);
      if (generationId) {
        const errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
        await supabase.from("apf_generations").update({ status: "error", error_message: errorMsg }).eq("id", generationId);
        const updated = await fetchGenerations(currentTeamId!, selectedSprintId);
        setGenerations(updated);
      }
      toast.error(e instanceof Error ? e.message : "Erro ao gerar documento");
    } finally {
      setGenerating(false);
      setShowQuestions(false);
      setTimeout(() => setProgressStep("idle"), 2000);
    }
  }, [
    currentTeamId, user,
    selectedSprintId, selectedTemplateId,
    baselineFile,
    sprints, outputFormat,
    selectedTemplate, questions, answers,
    selectedProviderId, selectedProvider?.provider_type, apiKey, providerCfg.needsKey, sqlFiles,
  ]);

  const generateGeneric = async (prompt: string, baseFilename: string) => {
    if (!currentTeamId || !user) throw new Error("Sessão inválida");

    setGenerating(true);
    setProgressStep("calling_ai");

    try {
      const isInlineProvider = selectedProviderId.startsWith("inline:");
      const result = await invokeApfGeneration({
        prompt,
        providerId: isInlineProvider ? undefined : selectedProviderId,
        provider: isInlineProvider ? (selectedProvider?.provider_type as Provider) : undefined,
        apiKey: providerCfg.needsKey ? apiKey.trim() : undefined,
        files: [],
        skipDocx: true,
      });

      setLastResult({
        markdown: result.markdown,
        baseFilename,
        pfBreakdown: result.pfBreakdown,
        pfTotal: result.pfTotal,
      });
      setShowPreview(true);
      setProgressStep("done");
      return result;
    } finally {
      setGenerating(false);
      setTimeout(() => setProgressStep("idle"), 2000);
    }
  };

  const handleGenerateClick = useCallback(() => {
    if (!canGenerate) return;
    if (questions.length > 0 && !allQuestionsAnswered) { setShowQuestions(true); return; }
    void runGeneration();
  }, [canGenerate, allQuestionsAnswered, runGeneration, questions.length]);

  return {
    sprints,
    selectedSprintId, setSelectedSprintId,
    selectedTemplateId, setSelectedTemplateId,
    templates, selectedTemplate,
    baselineFile, setBaselineFile,
    providerCfg,
    aiProviders, selectedProviderId, setSelectedProviderId,
    apiKey, setApiKey,
    outputFormat, setOutputFormat,
    generating, canGenerate,
    progressStep,
    handleGenerateClick, runGeneration,
    generations, loadingHistory,
    lastResult, setLastResult,
    showPreview, setShowPreview,
    questions, answers, setAnswers,
    sqlFiles, setSqlFiles,
    showQuestions, setShowQuestions,
    allQuestionsAnswered,
    generateGeneric
  };
}
