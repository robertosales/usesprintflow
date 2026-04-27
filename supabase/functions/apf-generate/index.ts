// deno-lint-ignore-file no-explicit-any
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  ShadingType,
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

REGRA — TABELAS:
- Sempre que precisar apresentar dados estruturados (Dados do atendimento, Funcionalidades Impactadas, Banco de Dados, etc.), use tabelas em formato Markdown padrão com pipes e linha separadora:
  | Cabeçalho 1 | Cabeçalho 2 | Cabeçalho 3 |
  | --- | --- | --- |
  | valor | valor | valor |
- A primeira linha é sempre o cabeçalho. NÃO inclua a tabela dentro de bloco de código.
- Para tabelas verticais "chave/valor" (como "Dados do atendimento"), use duas colunas: a primeira com o rótulo (Nº do REDMINE, Sistema, Release, Sprint, Tipo de Manutenção, Analista) e a segunda com o valor (pode ficar vazia se não houver informação).

REGRA CRÍTICA — PERGUNTAS NO PROMPT:
- NÃO inclua perguntas literais (ex.: "Houve alteração em banco de dados? (Sim/Não)") no documento gerado.
- Se houver uma seção "=== RESPOSTAS DO USUÁRIO ===" abaixo, considere essas respostas como dados já confirmados e incorpore-as naturalmente ao texto do documento (em parágrafos descritivos), em vez de listar perguntas e respostas.
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

// ── Estilo das tabelas (alinhado às imagens de referência) ──
// Cabeçalho azul escuro com texto branco; primeira coluna (vertical key/value) cinza claro.
const HEADER_FILL = "1F4E78"; // azul corporativo
const KEY_FILL = "D9D9D9"; // cinza claro
const BORDER_COLOR = "9DB2BF";

const cellBorder = { style: BorderStyle.SINGLE, size: 6, color: BORDER_COLOR };
const cellBorders = {
  top: cellBorder,
  bottom: cellBorder,
  left: cellBorder,
  right: cellBorder,
};

function makeCell(
  text: string,
  opts: { header?: boolean; keyCol?: boolean; width: number } = { width: 4680 },
): TableCell {
  const isBold = !!opts.header || !!opts.keyCol;
  const fill = opts.header ? HEADER_FILL : opts.keyCol ? KEY_FILL : undefined;
  const color = opts.header ? "FFFFFF" : "000000";
  return new TableCell({
    borders: cellBorders,
    width: { size: opts.width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [
      new Paragraph({
        children: [
          new TextRun({ text: text || "", bold: isBold, color, size: 20 }),
        ],
      }),
    ],
  });
}

function parseMarkdownRow(line: string): string[] {
  // Remove pipes externas e divide em colunas, preservando texto
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((c) => c.trim());
}

function isSeparatorRow(line: string): boolean {
  // Linha tipo: | --- | :---: | ---: |
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}

function buildTable(headerCells: string[], rows: string[][]): Table {
  const TOTAL_WIDTH = 9360; // US Letter content width with 1" margins
  const colCount = Math.max(headerCells.length, ...rows.map((r) => r.length), 1);
  const colWidth = Math.floor(TOTAL_WIDTH / colCount);
  const columnWidths = Array(colCount).fill(colWidth);

  // Detecta se é tabela "chave/valor" (2 colunas, cabeçalho vazio ou genérico)
  const isKeyValue =
    colCount === 2 &&
    headerCells.every((h) => !h || /^(campo|chave|item|atributo)$/i.test(h));

  const trs: TableRow[] = [];

  if (!isKeyValue) {
    trs.push(
      new TableRow({
        tableHeader: true,
        children: headerCells
          .concat(Array(colCount - headerCells.length).fill(""))
          .map((h) => makeCell(h, { header: true, width: colWidth })),
      }),
    );
  }

  for (const r of rows) {
    const padded = r.concat(Array(colCount - r.length).fill(""));
    trs.push(
      new TableRow({
        children: padded.map((cellText, idx) =>
          makeCell(cellText, { keyCol: isKeyValue && idx === 0, width: colWidth }),
        ),
      }),
    );
  }

  return new Table({
    width: { size: TOTAL_WIDTH, type: WidthType.DXA },
    columnWidths,
    rows: trs,
  });
}

function textToDocxBlocks(text: string): (Paragraph | Table)[] {
  const lines = text.split(/\r?\n/);
  const blocks: (Paragraph | Table)[] = [];
  let i = 0;

  const pushParagraph = (p: Paragraph) => blocks.push(p);

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // ── Detecta tabela markdown ──
    if (line.trim().startsWith("|") && i + 1 < lines.length && isSeparatorRow(lines[i + 1])) {
      const header = parseMarkdownRow(line);
      i += 2; // pula header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(parseMarkdownRow(lines[i]));
        i++;
      }
      blocks.push(buildTable(header, rows));
      // Espaço após a tabela
      blocks.push(new Paragraph({ children: [new TextRun("")] }));
      continue;
    }

    if (!line.trim()) {
      pushParagraph(new Paragraph({ children: [new TextRun("")] }));
    } else if (line.startsWith("# ")) {
      pushParagraph(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: line.slice(2), bold: true, size: 32 })],
          spacing: { before: 240, after: 160 },
        }),
      );
    } else if (line.startsWith("## ")) {
      pushParagraph(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: line.slice(3), bold: true, size: 28 })],
          spacing: { before: 200, after: 120 },
        }),
      );
    } else if (line.startsWith("### ")) {
      pushParagraph(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [new TextRun({ text: line.slice(4), bold: true, size: 24 })],
          spacing: { before: 160, after: 100 },
        }),
      );
    } else if (line.startsWith("- ") || line.startsWith("* ")) {
      pushParagraph(
        new Paragraph({
          children: [new TextRun(line.slice(2))],
          bullet: { level: 0 },
        }),
      );
    } else {
      pushParagraph(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          children: [new TextRun(line)],
          spacing: { after: 120 },
        }),
      );
    }
    i++;
  }

  return blocks;
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
        children: textToDocxBlocks(text),
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
      JSON.stringify({ success: true, docxBase64, markdown: aiText, charCount: aiText.length }),
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