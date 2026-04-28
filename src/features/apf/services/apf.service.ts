import { supabase } from "@/integrations/supabase/client";

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
  created_at: string;
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
  const { error } = await supabase.from("apf_templates").update({ is_active: !isActive }).eq("id", id);
  if (error) throw error;
}

export async function fetchGenerations(teamId: string, sprintId: string): Promise<(ApfGeneration & { template_name?: string })[]> {
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

/**
 * Invokes the `apf-generate` edge function. Encapsulates the Supabase call
 * so UI components don't depend on the supabase client directly.
 */
export async function invokeApfGeneration(body: {
  prompt: string;
  provider: string;
  apiKey?: string;
  files: Array<{ name: string; content: string }>;
}): Promise<{ docxBase64: string; markdown: string }> {
  const { data, error } = await supabase.functions.invoke("apf-generate", { body });
  if (error) throw new Error(error.message ?? "Erro ao chamar a IA");
  if (!data?.success || !data?.docxBase64) {
    throw new Error(data?.error ?? "A IA não retornou conteúdo");
  }
  return { docxBase64: data.docxBase64, markdown: data.markdown ?? "" };
}