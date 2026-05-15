import { supabase } from "@/integrations/supabase/client";
import * as XLSX from "xlsx";

export interface ApfTemplate {
  id: string;
  team_id: string;
  name: string;
  description: string | null;
  output_type: "docx" | "xlsx";
  prompt_content: string;
  version: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApfGeneration {
  id: string;
  team_id: string;
  template_id: string | null;
  sprint_id: string | null;
  generated_by: string | null;
  baseline_file: string | null;
  hu_file: string | null;
  model_file: string | null;
  output_filename: string | null;
  status: "pending" | "success" | "error";
  error_message: string | null;
  pf_total?: number | null;
  pf_breakdown?: Record<string, number> | null;
  created_at: string;
}

// ─── Limites ───
const MAX_TEXT_CHARS = 80_000; // ~20 K tokens por arquivo

// ─── Helpers de extração ───

function isXlsx(file: File): boolean {
  return (
    file.name.toLowerCase().endsWith(".xlsx") ||
    file.name.toLowerCase().endsWith(".xls") ||
    file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    file.type === "application/vnd.ms-excel"
  );
}

function isTextFile(file: File): boolean {
  const name = file.name.toLowerCase();
  const textExts = [".md", ".txt", ".csv", ".json", ".xml", ".html", ".htm"];
  return textExts.some((e) => name.endsWith(e)) || file.type.startsWith("text/");
}

/**
 * Extrai texto de arquivo .xlsx/.xls usando SheetJS.
 * Cada planilha vira uma seção de texto com os dados em formato CSV simples.
 */
async function extractXlsx(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const parts: string[] = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });
    const trimmed = csv.trim();
    if (trimmed) {
      parts.push(`=== Planilha: ${sheetName} ===\n${trimmed}`);
    }
  }

  const result = parts.join("\n\n");
  return result || "[Arquivo xlsx sem conteúdo legível]"; 
}

/**
 * Converte um arquivo para payload { name, content } para a Edge Function.
 *
 * Prioridade de extração:
 * 1. .xlsx/.xls  → SheetJS (CSV por planilha)
 * 2. texto puro  → file.text() truncado
 * 3. demais      → aviso descritivo (sem base64)
 */
async function fileToPayload(file: File): Promise<{ name: string; content: string }> {
  try {
    if (isXlsx(file)) {
      const raw = await extractXlsx(file);
      const content =
        raw.length > MAX_TEXT_CHARS
          ? raw.slice(0, MAX_TEXT_CHARS) + `\n\n[... truncado — ${(file.size / 1024).toFixed(0)} KB total ...]`
          : raw;
      return { name: file.name, content };
    }

    if (isTextFile(file)) {
      const raw = await file.text();
      const content =
        raw.length > MAX_TEXT_CHARS
          ? raw.slice(0, MAX_TEXT_CHARS) + `\n\n[... truncado — ${(file.size / 1024).toFixed(0)} KB total ...]`
          : raw;
      return { name: file.name, content };
    }

    // .docx, .pdf e outros binários — não extraímos por ora
    return {
      name: file.name,
      content:
        `[Arquivo binário: ${file.name} (${file.type || "tipo desconhecido"}, ` +
        `${(file.size / 1024).toFixed(1)} KB). ` +
        `Conteúdo não pôde ser extraído automaticamente. ` +
        `Utilize as informações dos demais arquivos e as instruções do template para gerar o documento.]`,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { name: file.name, content: `[Erro ao processar ${file.name}: ${msg}]` };
  }
}

/**
 * Prepara todos os arquivos para envio à Edge Function.
 * Exportado para uso no hook useApfGenerate.
 */
export async function prepareFilesForEdgeFunction(
  files: File[],
): Promise<Array<{ name: string; content: string }>> {
  return Promise.all(files.map(fileToPayload));
}

/**
 * Verifica se pelo menos um arquivo tem conteúdo real extraível.
 * Retorna o nome dos arquivos sem conteúdo para exibir no toast.
 */
export function validateFilePayloads(
  payloads: Array<{ name: string; content: string }>,
): { valid: boolean; emptyFiles: string[] } {
  const PLACEHOLDER_RE = /^\[Arquivo binário:|^\[Erro ao processar|^\[Arquivo xlsx sem/;
  const emptyFiles = payloads
    .filter((p) => PLACEHOLDER_RE.test(p.content.trim()) || p.content.trim().length < 20)
    .map((p) => p.name);
  return { valid: emptyFiles.length < payloads.length, emptyFiles };
}

export async function fetchTemplates(teamId: string): Promise<ApfTemplate[]> {
  const { data, error } = await supabase
    .from("apf_templates")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ApfTemplate[];
}

export async function fetchActiveTemplates(teamId: string): Promise<ApfTemplate[]> {
  const { data, error } = await supabase
    .from("apf_templates")
    .select("*")
    .eq("team_id", teamId)
    .eq("is_active", true)
    .order("name");
  if (error) throw error;
  return (data ?? []) as ApfTemplate[];
}

export async function createTemplate(
  teamId: string,
  userId: string,
  payload: { name: string; description?: string; output_type: string; prompt_content: string }
): Promise<ApfTemplate> {
  const { data, error } = await supabase
    .from("apf_templates")
    .insert({ ...payload, team_id: teamId, created_by: userId })
    .select()
    .single();
  if (error) throw error;
  return data as ApfTemplate;
}

export async function updateTemplate(
  id: string,
  currentVersion: number,
  payload: { name: string; description?: string; output_type: string; prompt_content: string }
): Promise<ApfTemplate> {
  const { data, error } = await supabase
    .from("apf_templates")
    .update({ ...payload, version: currentVersion + 1 })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as ApfTemplate;
}

export async function duplicateTemplate(template: ApfTemplate): Promise<ApfTemplate> {
  const { data, error } = await supabase
    .from("apf_templates")
    .insert({
      team_id: template.team_id,
      name: `${template.name} (cópia)`,
      description: template.description,
      output_type: template.output_type,
      prompt_content: template.prompt_content,
      created_by: template.created_by,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ApfTemplate;
}

export async function toggleTemplateActive(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from("apf_templates")
    .update({ is_active: !isActive })
    .eq("id", id);
  if (error) throw error;
}

export async function fetchGenerations(
  teamId: string,
  sprintId: string,
): Promise<(ApfGeneration & { template_name?: string })[]> {
  const { data, error } = await supabase
    .from("apf_generations")
    .select("*, apf_templates(name)")
    .eq("team_id", teamId)
    .eq("sprint_id", sprintId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((g: any) => ({
    ...g,
    template_name: g.apf_templates?.name ?? "Template removido",
  }));
}

export async function createGeneration(payload: {
  team_id: string;
  template_id: string;
  sprint_id: string;
  generated_by: string;
  baseline_file: string;
  hu_file: string;
  model_file: string;
  output_filename: string;
  status: string;
}): Promise<ApfGeneration> {
  const { data, error } = await supabase
    .from("apf_generations")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as ApfGeneration;
}

export async function invokeApfGeneration(body: {
  prompt: string;
  provider: string;
  apiKey?: string;
  files: Array<{ name: string; content: string }>;
  generationId?: string;
}): Promise<{
  docxBase64: string;
  markdown: string;
  pfTotal: number | null;
  pfBreakdown: Record<string, number>;
}> {
  const { data, error } = await supabase.functions.invoke("apf-generate", { body });
  if (error) throw new Error(error.message ?? "Erro ao chamar a IA");
  if (!data?.success || !data?.docxBase64) {
    throw new Error(data?.error ?? "A IA não retornou conteúdo");
  }
  return {
    docxBase64:  data.docxBase64,
    markdown:    data.markdown ?? "",
    pfTotal:     data.pfTotal  ?? null,
    pfBreakdown: data.pfBreakdown ?? {},
  };
}
