// deno-lint-ignore-file no-explicit-any
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from "https://esm.sh/docx@8.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, " +
    "x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type Provider = "lovable" | "openai" | "gemini" | "anthropic" | "perplexity";

interface FileInput   { name: string; content: string; }
interface RequestBody {
  prompt: string;
  provider: Provider;
  apiKey?: string;
  model?: string;
  files?: FileInput[];
  generationId?: string;
}

// ─── Limites de contexto ───
const MAX_CHARS_PER_FILE  =  60_000; // ~15 K tokens por arquivo
const MAX_CHARS_TOTAL_CTX = 600_000; // ~150 K tokens total

// Regex que identifica conteúdo placeholder (não-real)
const PLACEHOLDER_RE = /^\[Arquivo bin[aá]rio:|^\[Erro ao processar|^\[Arquivo xlsx sem/;

/**
 * CAMADA 3 — guardrail na Edge Function.
 * Sanitiza base64 residual, trunca por arquivo e por total,
 * e lança erro se TODOS os arquivos forem placeholder (sem conteúdo real).
 */
function sanitizeAndGuard(files: FileInput[]): FileInput[] {
  const result: FileInput[] = [];
  let totalChars = 0;

  for (const f of files) {
    let content = f.content ?? "";

    // Descarta base64 residual (não deveria chegar mais, mas por segurança)
    if (/^data:[^;]+;base64,/.test(content)) {
      content = `[Arquivo binário: ${f.name} — conteúdo não extraível no servidor.]`;
    }

    // Trunca por arquivo
    if (content.length > MAX_CHARS_PER_FILE) {
      content = content.slice(0, MAX_CHARS_PER_FILE) + "\n[... truncado ...]";
    }

    // Trunca total
    if (totalChars + content.length > MAX_CHARS_TOTAL_CTX) {
      const rem = MAX_CHARS_TOTAL_CTX - totalChars;
      if (rem <= 0) break;
      content = content.slice(0, rem) + "\n[... contexto total atingiu o limite ...]";
    }

    totalChars += content.length;
    result.push({ name: f.name, content });
  }

  // ── Guardrail: verifica se há pelo menos 1 arquivo com conteúdo real ──
  const hasRealContent = result.some(
    (f) => !PLACEHOLDER_RE.test(f.content.trim()) && f.content.trim().length >= 20
  );
  if (!hasRealContent) {
    throw new Error(
      "Nenhum dos arquivos enviados possui conteúdo legível. " +
      "Verifique se os arquivos estão no formato correto (.xlsx, .xls, .txt, .md, .csv). " +
      "Arquivos .docx e .pdf precisam ser convertidos para .txt ou .xlsx antes de enviar."
    );
  }

  return result;
}

function buildFullPrompt(prompt: string, files: FileInput[]): string {
  const sanitized = sanitizeAndGuard(files);
  const ctx = sanitized.length > 0
    ? `\n\n=== ARQUIVOS DE CONTEXTO ===\n${
        sanitized.map((f) => `--- ${f.name} ---\n${f.content}`).join("\n\n")
      }\n=== FIM DOS ARQUIVOS ===\n`
    : "";

  return `Você é um especialista em Análise de Pontos de Função (APF) e geração de documentação técnica.

Siga estritamente as instruções abaixo. A resposta deve ser apenas o conteúdo do documento, em texto puro, sem comentários adicionais, sem prefácio e sem markdown de bloco de código.

Use parágrafos separados por linhas em branco. Para títulos use linhas iniciadas com "# " (H1) ou "## " (H2). Para listas use "- " no início da linha.

REGRA — TABELAS:
- Sempre que precisar apresentar dados estruturados, use tabelas Markdown com pipes:
  | Cabeçalho 1 | Cabeçalho 2 |
  | --- | --- |
  | valor | valor |
- NÃO inclua tabelas dentro de blocos de código.
- Para tabelas chave/valor ("Dados do atendimento"), use 2 colunas: rótulo e valor.

REGRA CRÍTICA — NÃO INCLUA PERGUNTAS NO DOCUMENTO GERADO.
- Se houver uma seção "=== RESPOSTAS DO USUÁRIO ===", incorpore as respostas como dados confirmados em parágrafos descritivos.
- NUNCA escreva frases como "É necessário informar a baseline" ou "Informe as HUs" — você JÁ tem os dados abaixo.
${ctx}
=== INSTRUÇÕES DO USUÁRIO ===
${prompt}`;
}

// ─── Providers ───
async function callLovable(p: string, k: string, m = "google/gemini-2.5-flash") {
  const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: m, messages: [{ role: "user", content: p }] }),
  });
  if (!r.ok) throw new Error(`Lovable AI [${r.status}]: ${await r.text()}`);
  return (await r.json()).choices?.[0]?.message?.content ?? "";
}
async function callOpenAI(p: string, k: string, m = "gpt-4o-mini") {
  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: m, messages: [{ role: "user", content: p }] }),
  });
  if (!r.ok) throw new Error(`OpenAI [${r.status}]: ${await r.text()}`);
  return (await r.json()).choices?.[0]?.message?.content ?? "";
}
async function callGemini(p: string, k: string, m = "gemini-1.5-flash") {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${k}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: p }] }] }),
  });
  if (!r.ok) throw new Error(`Gemini [${r.status}]: ${await r.text()}`);
  return (await r.json()).candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}
async function callAnthropic(p: string, k: string, m = "claude-3-5-sonnet-20241022") {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": k, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({ model: m, max_tokens: 8000, messages: [{ role: "user", content: p }] }),
  });
  if (!r.ok) throw new Error(`Anthropic [${r.status}]: ${await r.text()}`);
  return (await r.json()).content?.[0]?.text ?? "";
}
async function callPerplexity(p: string, k: string, m = "sonar") {
  const r = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${k}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: m, messages: [{ role: "user", content: p }] }),
  });
  if (!r.ok) throw new Error(`Perplexity [${r.status}]: ${await r.text()}`);
  return (await r.json()).choices?.[0]?.message?.content ?? "";
}

// ─── DOCX helpers ───
const HEADER_FILL  = "1F4E78";
const KEY_FILL     = "D9D9D9";
const BORDER_COLOR = "9DB2BF";
const cb           = { style: BorderStyle.SINGLE, size: 6, color: BORDER_COLOR };
const cbs          = { top: cb, bottom: cb, left: cb, right: cb };

function makeCell(text: string, opts: { header?: boolean; keyCol?: boolean; width: number } = { width: 4680 }): TableCell {
  const bold  = !!opts.header || !!opts.keyCol;
  const fill  = opts.header ? HEADER_FILL : opts.keyCol ? KEY_FILL : undefined;
  const color = opts.header ? "FFFFFF" : "000000";
  return new TableCell({
    borders: cbs,
    width: { size: opts.width, type: WidthType.DXA },
    shading: fill ? { fill, type: ShadingType.CLEAR, color: "auto" } : undefined,
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({ children: [new TextRun({ text: text || "", bold, color, size: 20 })] })],
  });
}
function parseRow(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}
function isSep(line: string) {
  return /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)+\|?\s*$/.test(line);
}
function buildTable(hdr: string[], rows: string[][]): Table {
  const W = 9360, n = Math.max(hdr.length, ...rows.map((r) => r.length), 1), w = Math.floor(W / n);
  const isKV = n === 2 && hdr.every((h) => !h || /^(campo|chave|item|atributo)$/i.test(h));
  const trs: TableRow[] = [];
  if (!isKV) trs.push(new TableRow({ tableHeader: true, children: hdr.concat(Array(n - hdr.length).fill("")).map((h) => makeCell(h, { header: true, width: w })) }));
  for (const r of rows) {
    const p = r.concat(Array(n - r.length).fill(""));
    trs.push(new TableRow({ children: p.map((t, i) => makeCell(t, { keyCol: isKV && i === 0, width: w })) }));
  }
  return new Table({ width: { size: W, type: WidthType.DXA }, columnWidths: Array(n).fill(w), rows: trs });
}
function textToBlocks(text: string): (Paragraph | Table)[] {
  const lines = text.split(/\r?\n/), blocks: (Paragraph | Table)[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();
    if (line.trim().startsWith("|") && i + 1 < lines.length && isSep(lines[i + 1])) {
      const hdr = parseRow(line); i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { rows.push(parseRow(lines[i])); i++; }
      blocks.push(buildTable(hdr, rows), new Paragraph({ children: [new TextRun("")] }));
      continue;
    }
    if (!line.trim())                            blocks.push(new Paragraph({ children: [new TextRun("")] }));
    else if (line.startsWith("# "))              blocks.push(new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: line.slice(2),  bold: true, size: 32 })], spacing: { before: 240, after: 160 } }));
    else if (line.startsWith("## "))             blocks.push(new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: line.slice(3),  bold: true, size: 28 })], spacing: { before: 200, after: 120 } }));
    else if (line.startsWith("### "))            blocks.push(new Paragraph({ heading: HeadingLevel.HEADING_3, children: [new TextRun({ text: line.slice(4),  bold: true, size: 24 })], spacing: { before: 160, after: 100 } }));
    else if (/^[\-\*] /.test(line))              blocks.push(new Paragraph({ children: [new TextRun(line.slice(2))], bullet: { level: 0 } }));
    else                                         blocks.push(new Paragraph({ alignment: AlignmentType.JUSTIFIED, children: [new TextRun(line)], spacing: { after: 120 } }));
    i++;
  }
  return blocks;
}
async function toDocxBase64(text: string): Promise<string> {
  const buf = await Packer.toBuffer(new Document({
    sections: [{ properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } }, children: textToBlocks(text) }],
  }));
  const bytes = new Uint8Array(buf);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + 0x8000)) as any);
  return btoa(bin);
}

// ─── Handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = (await req.json()) as RequestBody;
    const { prompt, provider, apiKey, model, files } = body;

    if (!prompt?.trim())
      return new Response(JSON.stringify({ error: "Prompt é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // buildFullPrompt já chama sanitizeAndGuard (lança erro se sem conteúdo real)
    const fullPrompt = buildFullPrompt(prompt, files ?? []);
    let aiText = "";

    switch (provider) {
      case "lovable":   { const k = apiKey?.trim() || Deno.env.get("LOVABLE_API_KEY") || ""; if (!k) throw new Error("LOVABLE_API_KEY não configurado"); aiText = await callLovable(fullPrompt, k, model);    break; }
      case "openai":    { if (!apiKey) throw new Error("API key da OpenAI é obrigatória");     aiText = await callOpenAI(fullPrompt, apiKey, model);    break; }
      case "gemini":    { if (!apiKey) throw new Error("API key do Gemini é obrigatória");     aiText = await callGemini(fullPrompt, apiKey, model);    break; }
      case "anthropic": { if (!apiKey) throw new Error("API key do Claude é obrigatória");     aiText = await callAnthropic(fullPrompt, apiKey, model); break; }
      case "perplexity":{ if (!apiKey) throw new Error("API key do Perplexity é obrigatória"); aiText = await callPerplexity(fullPrompt, apiKey, model);break; }
      default: throw new Error(`Provider inválido: ${provider}`);
    }

    if (!aiText.trim()) throw new Error("A IA retornou conteúdo vazio");

    const docxBase64 = await toDocxBase64(aiText);
    return new Response(
      JSON.stringify({ success: true, docxBase64, markdown: aiText, charCount: aiText.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("apf-generate error:", e);
    const raw = e?.message ?? "Erro desconhecido";
    let msg = raw;
    if (/Nenhum dos arquivos/i.test(raw))                          msg = raw; // já é amigável
    else if (/context length|maximum context|token/i.test(raw))   msg = "Os arquivos enviados são grandes demais. Reduza o tamanho ou divida as HUs em grupos menores.";
    else if (/credit balance is too low/i.test(raw))               msg = "Conta sem créditos. Adicione créditos ou selecione outro provedor.";
    else if (/invalid.*api.?key|incorrect.*api.?key/i.test(raw))  msg = "Chave de API inválida. Verifique e tente novamente.";
    else if (/rate limit|429/i.test(raw))                          msg = "Limite de requisições atingido. Aguarde e tente novamente.";
    return new Response(JSON.stringify({ error: msg, raw }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
