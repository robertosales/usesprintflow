// deno-lint-ignore-file no-explicit-any
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
} from "https://esm.sh/docx@8.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Provider = "lovable" | "openai" | "gemini" | "anthropic" | "perplexity";

interface FileInput {
  name: string;
  content: string; // texto extraído ou conteúdo bruto
}

interface RequestBody {
  prompt: string;
  provider: Provider;
  apiKey?: string; // opcional - se não vier, usa LOVABLE_API_KEY (apenas para 'lovable')
  model?: string;
  files?: FileInput[];
}

function buildFullPrompt(prompt: string, files: FileInput[] = []) {
  const ctx =
    files.length > 0
      ? `\n\n=== ARQUIVOS DE CONTEXTO ===\n${files
          .map((f) => `--- ${f.name} ---\n${f.content}`)
          .join("\n\n")}\n=== FIM DOS ARQUIVOS ===\n`
      : "";

  return `Você é um especialista em Análise de Pontos de Função (APF) e geração de documentação técnica.

Siga estritamente as instruções abaixo. A resposta deve ser apenas o conteúdo do documento, em texto puro, sem comentários adicionais, sem prefácio e sem markdown de bloco de código.

Use parágrafos separados por linhas em branco. Para títulos use linhas iniciadas com "# " (H1) ou "## " (H2). Para listas use "- " no início da linha.
${ctx}
=== INSTRUÇÕES DO USUÁRIO ===
${prompt}`;
}

async function callLovable(fullPrompt: string, apiKey: string, model = "google/gemini-2.5-flash") {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: fullPrompt }],
    }),
  });
  if (!r.ok) throw new Error(`Lovable AI [${r.status}]: ${await r.text()}`);
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callOpenAI(fullPrompt: string, apiKey: string, model = "gpt-4o-mini") {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: fullPrompt }] }),
  });
  if (!r.ok) throw new Error(`OpenAI [${r.status}]: ${await r.text()}`);
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "";
}

async function callGemini(fullPrompt: string, apiKey: string, model = "gemini-1.5-flash") {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] }),
  });
  if (!r.ok) throw new Error(`Gemini [${r.status}]: ${await r.text()}`);
  const data = await r.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callAnthropic(fullPrompt: string, apiKey: string, model = "claude-3-5-sonnet-20241022") {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      messages: [{ role: "user", content: fullPrompt }],
    }),
  });
  if (!r.ok) throw new Error(`Anthropic [${r.status}]: ${await r.text()}`);
  const data = await r.json();
  return data.content?.[0]?.text ?? "";
}

async function callPerplexity(fullPrompt: string, apiKey: string, model = "sonar") {
  const r = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: fullPrompt }] }),
  });
  if (!r.ok) throw new Error(`Perplexity [${r.status}]: ${await r.text()}`);
  const data = await r.json();
  return data.choices?.[0]?.message?.content ?? "";
}

function textToDocxParagraphs(text: string): Paragraph[] {
  const lines = text.split(/\r?\n/);
  const paragraphs: Paragraph[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      paragraphs.push(new Paragraph({ children: [new TextRun("")] }));
      continue;
    }
    if (line.startsWith("# ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: line.slice(2), bold: true, size: 32 })],
          spacing: { before: 240, after: 160 },
        }),
      );
    } else if (line.startsWith("## ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: line.slice(3), bold: true, size: 28 })],
          spacing: { before: 200, after: 120 },
        }),
      );
    } else if (line.startsWith("### ")) {
      paragraphs.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: line.slice(4), bold: true, size: 24 })],
          spacing: { before: 160, after: 100 },
        }),
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      paragraphs.push(
        new Paragraph({
          children: [new TextRun(line.slice(2))],
          bullet: { level: 0 },
        }),
      );
    } else {
      paragraphs.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun(line)],
          spacing: { after: 120 },
        }),
      );
    }
  }

  return paragraphs;
}

async function generateDocxBase64(text: string): Promise<string> {
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: textToDocxParagraphs(text),
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  // Convert Uint8Array to base64
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)) as any);
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = (await req.json()) as RequestBody;
    const { prompt, provider, apiKey, model, files } = body;

    if (!prompt || !prompt.trim()) {
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const fullPrompt = buildFullPrompt(prompt, files ?? []);
    let aiText = "";

    switch (provider) {
      case "lovable": {
        const key = apiKey?.trim() || Deno.env.get("LOVABLE_API_KEY") || "";
        if (!key) throw new Error("LOVABLE_API_KEY não configurado");
        aiText = await callLovable(fullPrompt, key, model);
        break;
      }
      case "openai": {
        if (!apiKey) throw new Error("API key da OpenAI é obrigatória");
        aiText = await callOpenAI(fullPrompt, apiKey, model);
        break;
      }
      case "gemini": {
        if (!apiKey) throw new Error("API key do Gemini é obrigatória");
        aiText = await callGemini(fullPrompt, apiKey, model);
        break;
      }
      case "anthropic": {
        if (!apiKey) throw new Error("API key do Claude é obrigatória");
        aiText = await callAnthropic(fullPrompt, apiKey, model);
        break;
      }
      case "perplexity": {
        if (!apiKey) throw new Error("API key do Perplexity é obrigatória");
        aiText = await callPerplexity(fullPrompt, apiKey, model);
        break;
      }
      default:
        throw new Error(`Provider inválido: ${provider}`);
    }

    if (!aiText.trim()) throw new Error("A IA retornou conteúdo vazio");

    const docxBase64 = await generateDocxBase64(aiText);

    return new Response(
      JSON.stringify({ success: true, docxBase64, charCount: aiText.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("apf-generate error:", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});