import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useSprint } from "@/contexts/SprintContext";
import {
  fetchActiveTemplates,
  fetchGenerations,
  createGeneration,
  invokeApfGeneration,
  type ApfTemplate,
  type ApfGeneration,
} from "../services/apf.service";

export type Provider = "lovable" | "openai" | "gemini" | "anthropic" | "perplexity";
export type OutputFormat = "docx" | "markdown";

export const PROVIDERS: { value: Provider; label: string; needsKey: boolean; placeholder: string }[] = [
  { value: "lovable", label: "Lovable AI (Gemini/GPT) — recomendado", needsKey: false, placeholder: "" },
  { value: "openai", label: "OpenAI (GPT)", needsKey: true, placeholder: "sk-..." },
  { value: "gemini", label: "Google Gemini", needsKey: true, placeholder: "AIza..." },
  { value: "anthropic", label: "Anthropic (Claude)", needsKey: true, placeholder: "sk-ant-..." },
  { value: "perplexity", label: "Perplexity", needsKey: true, placeholder: "pplx-..." },
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
    if (open) {
      questions.push({ id: `q_${idx}`, text: open[1], kind: "open" });
    }
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

const TEXT_EXTENSIONS = [".md", ".txt", ".csv", ".json", ".xml", ".html", ".htm"];

function isTextFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (TEXT_EXTENSIONS.some((ext) => name.endsWith(ext))) return true;
  if (file.type.startsWith("text/")) return true;
  return false;
}

async function readFileAsText(file: File): Promise<string> {
  if (!isTextFile(file)) {
    return `[Arquivo binário anexado: ${file.name} — tipo ${file.type || "desconhecido"}, ${(file.size / 1024).toFixed(1)} KB. Considere o conteúdo deste arquivo como parte do contexto fornecido pelo usuário.]`;
  }
  try {
    const text = await file.text();
    return text.length > 50000 ? text.slice(0, 50000) + "\n[... conteúdo truncado ...]" : text;
  } catch {
    return `[Não foi possível ler o conteúdo de ${file.name}]`;
  }
}

export function useApfGenerate() {
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
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("docx");
  const [lastResult, setLastResult] = useState<{
    base64: string;
    markdown: string;
    baseFilename: string;
  } | null>(null);
  const [showPreview, setShowPreview] = useState(false);

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

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [templates, selectedTemplateId],
  );

  // Re-detect questions on template change
  useEffect(() => {
    if (!selectedTemplate) {
      setQuestions([]);
      setAnswers({});
      return;
    }
    setQuestions(detectInteractiveQuestions(selectedTemplate.prompt_content));
    setAnswers({});
  }, [selectedTemplate]);

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

  const runGeneration = useCallback(async () => {
    if (!currentTeamId || !user) {
      toast.error("Sessão inválida. Faça login novamente.");
      return;
    }
    const missing: string[] = [];
    if (!selectedSprintId) missing.push("Sprint");
    if (!selectedTemplateId) missing.push("Template");
    if (!baselineFile) missing.push("Baseline");
    if (huFiles.length === 0) missing.push("HUs da Sprint");
    if (!modelFile) missing.push("Modelo de Contagem");
    if (!apiKeyOk) missing.push("API Key do provedor");
    if (missing.length > 0) {
      toast.error(`Preencha antes de gerar: ${missing.join(", ")}`);
      return;
    }
    setGenerating(true);
    try {
      const sprint = sprints.find((s) => s.id === selectedSprintId);
      const baseFilename = `APF_${(sprint?.name ?? "Sprint").replace(/\s+/g, "_")}_${Date.now()}`;
      const filename = `${baseFilename}.${outputFormat === "docx" ? "docx" : "md"}`;

      const allFiles: File[] = [baselineFile!, ...huFiles, modelFile!];
      const filePayload = await Promise.all(
        allFiles.map(async (f) => ({ name: f.name, content: await readFileAsText(f) })),
      );

      const finalPrompt = applyAnswersToPrompt(
        selectedTemplate!.prompt_content,
        questions,
        answers,
      );

      const { docxBase64, markdown } = await invokeApfGeneration({
        prompt: finalPrompt,
        provider,
        apiKey: providerCfg.needsKey ? apiKey.trim() : undefined,
        files: filePayload,
      });

      setLastResult({ base64: docxBase64, markdown, baseFilename });
      setShowPreview(true);

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
      toast.success("Documento gerado! Visualize e baixe no formato desejado.");
      const updated = await fetchGenerations(currentTeamId, selectedSprintId);
      setGenerations(updated);
    } catch (e: any) {
      console.error("Erro ao gerar APF:", e);
      toast.error(e?.message ?? "Erro ao gerar documento");
    } finally {
      setGenerating(false);
      setShowQuestions(false);
    }
  }, [
    currentTeamId,
    user,
    selectedSprintId,
    selectedTemplateId,
    baselineFile,
    huFiles,
    modelFile,
    apiKeyOk,
    sprints,
    outputFormat,
    selectedTemplate,
    questions,
    answers,
    provider,
    providerCfg.needsKey,
    apiKey,
  ]);

  const handleGenerateClick = useCallback(() => {
    if (!canGenerate) return;
    if (questions.length > 0 && !allQuestionsAnswered) {
      setShowQuestions(true);
      return;
    }
    void runGeneration();
  }, [canGenerate, questions.length, allQuestionsAnswered, runGeneration]);

  return {
    // context-derived
    sprints,
    // selection
    selectedSprintId, setSelectedSprintId,
    selectedTemplateId, setSelectedTemplateId,
    templates, selectedTemplate,
    // files
    baselineFile, setBaselineFile,
    huFiles, setHuFiles,
    modelFile, setModelFile,
    // provider/output
    provider, setProvider, providerCfg,
    apiKey, setApiKey, apiKeyOk,
    outputFormat, setOutputFormat,
    // generation
    generating, canGenerate,
    handleGenerateClick, runGeneration,
    // history
    generations, loadingHistory,
    // result/preview
    lastResult, showPreview, setShowPreview,
    // interactive questions
    questions, answers, setAnswers,
    showQuestions, setShowQuestions,
    allQuestionsAnswered,
  };
}