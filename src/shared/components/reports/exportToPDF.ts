/**
 * exportToPDF — gera PDF profissional com layout Axion.
 * Usa apenas APIs nativas do browser (print via iframe oculto).
 *
 * Estrutura:
 *  - Cabeçalho: logo texto + título + metadados (emitido em, por, uso restrito)
 *  - Seção por membro (ou única seção)
 *    - Sub-header: nome, role, sprint, período, time
 *    - Tabela agrupada por HU (sem coluna Tipo)
 *    - Subtotal por HU
 *    - Total geral + linha de assinatura
 */

export interface PDFActivity {
  code: string;
  title: string;
  status: string;
  startDate: string;
  endDate: string;
  hours: number;
  huCode: string;
  huTitle?: string;
}

export interface PDFMemberSection {
  name: string;
  role: string;
  sprintName: string;
  sprintStart: string;
  sprintEnd: string;
  teamName: string;
  activities: PDFActivity[];
}

export interface ExportPDFOptions {
  reportTitle: string;
  reportSubtitle?: string;
  orgName?: string;
  orgSubtitle?: string;
  emittedBy: string;
  restrictLabel?: string;
  sections: PDFMemberSection[];
  filename: string;
}

function fmtDate(d: string) {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function fmtHours(h: number) {
  return h % 1 === 0 ? `${h}h` : `${h}h`;
}

function buildMemberHTML(section: PDFMemberSection, pageBreak: boolean): string {
  // Agrupar atividades por HU
  const huMap = new Map<string, { huCode: string; huTitle: string; activities: PDFActivity[]; subtotal: number }>();
  for (const act of section.activities) {
    const key = act.huCode || "SEM-HU";
    if (!huMap.has(key)) {
      huMap.set(key, { huCode: act.huCode || "—", huTitle: act.huTitle || "", activities: [], subtotal: 0 });
    }
    const group = huMap.get(key)!;
    group.activities.push(act);
    group.subtotal += Number(act.hours) || 0;
  }

  const totalHours = section.activities.reduce((s, a) => s + (Number(a.hours) || 0), 0);

  let rows = "";
  for (const [, group] of huMap) {
    // Linha de HU (agrupadora)
    if (group.huCode !== "SEM-HU") {
      rows += `
        <tr class="hu-row">
          <td colspan="6" class="hu-label">
            <span class="hu-badge">${group.huCode}</span>
            ${group.huTitle ? `<span class="hu-title">${group.huTitle}</span>` : ""}
          </td>
        </tr>`;
    }
    // Linhas de atividades
    for (const act of group.activities) {
      const statusClass = act.status === "Concluída" ? "status-done" : "status-open";
      rows += `
        <tr>
          <td class="code">${act.code}</td>
          <td class="title-cell">${act.title}</td>
          <td class="center ${statusClass}">${act.status}</td>
          <td class="center">${fmtDate(act.startDate)}</td>
          <td class="center">${fmtDate(act.endDate)}</td>
          <td class="center hours">${fmtHours(act.hours)}</td>
        </tr>`;
    }
    // Subtotal por HU
    if (huMap.size > 1 || group.huCode !== "SEM-HU") {
      rows += `
        <tr class="subtotal-row">
          <td colspan="5" class="subtotal-label">SUBTOTAL ${group.huCode}</td>
          <td class="center hours subtotal-hours">${fmtHours(group.subtotal)}</td>
        </tr>`;
    }
  }

  const period = section.sprintStart && section.sprintEnd
    ? `${fmtDate(section.sprintStart)} → ${fmtDate(section.sprintEnd)}`
    : "";

  return `
    <div class="member-section${pageBreak ? " page-break" : ""}">
      <div class="member-header">
        <div class="member-name">${section.name}</div>
        <div class="member-meta">
          <span>${section.role}</span>
          ${section.sprintName ? `<span class="sep">·</span><span>${section.sprintName}</span>` : ""}
          ${period ? `<span class="sep">·</span><span>${period}</span>` : ""}
          ${section.teamName ? `<span class="sep">·</span><span>Time: ${section.teamName}</span>` : ""}
        </div>
      </div>

      <table class="act-table">
        <thead>
          <tr>
            <th class="col-code">Código</th>
            <th class="col-title">Título da Atividade</th>
            <th class="col-status center">Status</th>
            <th class="col-date center">Início</th>
            <th class="col-date center">Fim</th>
            <th class="col-hours center">Horas</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="total-row">
            <td colspan="4" class="total-label">Total: ${fmtHours(totalHours)} lançadas · ${section.activities.length} atividades</td>
            <td colspan="2" class="total-sig">Assinatura: _______________________________</td>
          </tr>
        </tbody>
      </table>
    </div>`;
}

const PDF_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    font-size: 11px;
    color: #1e293b;
    background: #fff;
    padding: 0;
  }
  .page { padding: 32px 40px 24px; }

  /* ── Cabeçalho ── */
  .report-header {
    background: linear-gradient(135deg, #4f46e5 0%, #6366f1 100%);
    color: #fff;
    padding: 18px 40px 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
  }
  .org-name { font-size: 16px; font-weight: 700; letter-spacing: -0.3px; }
  .org-sub { font-size: 10px; opacity: 0.85; margin-top: 2px; }
  .report-title { font-size: 11px; font-weight: 600; margin-top: 4px; opacity: 0.95; }
  .header-right { text-align: right; font-size: 10px; opacity: 0.9; line-height: 1.7; }
  .header-right .restrict { font-weight: 600; color: #fde68a; }

  /* ── Membro ── */
  .member-section { margin-top: 28px; }
  .page-break { page-break-before: always; margin-top: 0; padding-top: 20px; }
  .member-header { margin-bottom: 10px; }
  .member-name { font-size: 14px; font-weight: 700; color: #1e293b; }
  .member-meta {
    font-size: 10px; color: #64748b;
    letter-spacing: 0.05em; text-transform: uppercase; margin-top: 3px;
  }
  .member-meta .sep { margin: 0 6px; }

  /* ── Tabela ── */
  .act-table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  .act-table thead tr { background: #4f46e5; color: #fff; }
  .act-table thead th {
    padding: 7px 10px; font-size: 10px; font-weight: 600;
    letter-spacing: 0.04em; text-transform: uppercase;
  }
  .act-table tbody tr { border-bottom: 1px solid #e2e8f0; }
  .act-table tbody tr:nth-child(even):not(.hu-row):not(.subtotal-row):not(.total-row) {
    background: #f8fafc;
  }
  .act-table td { padding: 6px 10px; vertical-align: middle; }

  /* ── HU agrupadora ── */
  .hu-row td { background: #ede9fe !important; padding: 5px 10px; }
  .hu-badge {
    display: inline-block; background: #4f46e5; color: #fff;
    font-size: 9px; font-weight: 700; padding: 1px 6px;
    border-radius: 3px; margin-right: 6px; letter-spacing: 0.05em;
  }
  .hu-title { color: #3730a3; font-weight: 600; font-size: 10px; }

  /* ── Subtotal / Total ── */
  .subtotal-row td { background: #f1f5f9 !important; }
  .subtotal-label { font-size: 10px; font-weight: 600; color: #64748b; padding: 5px 10px; }
  .subtotal-hours { font-weight: 700; color: #4f46e5; }
  .total-row td { background: #f8fafc; border-top: 2px solid #e2e8f0; }
  .total-label { font-size: 10px; font-weight: 600; color: #475569; padding: 8px 10px; }
  .total-sig { font-size: 10px; color: #94a3b8; text-align: right; padding: 8px 10px; }

  /* ── Células ── */
  .code { font-family: monospace; font-size: 10px; color: #64748b; white-space: nowrap; }
  .title-cell { max-width: 280px; }
  .center { text-align: center; }
  .hours { font-weight: 700; color: #4f46e5; }
  .status-done { color: #16a34a; font-weight: 600; }
  .status-open { color: #d97706; font-weight: 600; }
  .col-code { width: 80px; }
  .col-title { min-width: 180px; }
  .col-status { width: 90px; }
  .col-date { width: 90px; }
  .col-hours { width: 60px; }

  @media print {
    .page { padding: 0; }
    .report-header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .act-table thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .hu-row td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
`;

export function exportToPDF(options: ExportPDFOptions) {
  const {
    reportTitle, reportSubtitle,
    orgName = "Axion — Operações & Fluxo Ágil",
    orgSubtitle = "",
    emittedBy, restrictLabel,
    sections, filename,
  } = options;

  const now = new Date();
  const emittedAt = now.toLocaleDateString("pt-BR") + " às " + now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

  const sectionsHTML = sections
    .map((s, i) => buildMemberHTML(s, i > 0))
    .join("");

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>${reportTitle}</title>
  <style>${PDF_STYLES}</style>
</head>
<body>
  <div class="report-header">
    <div>
      <div class="org-name">${orgName}</div>
      ${orgSubtitle ? `<div class="org-sub">${orgSubtitle}</div>` : ""}
      <div class="report-title">${reportTitle}${reportSubtitle ? " — " + reportSubtitle : ""}</div>
    </div>
    <div class="header-right">
      Emitido em: ${emittedAt} · Por: ${emittedBy}<br/>
      ${restrictLabel ? `<span class="restrict">${restrictLabel}</span>` : ""}
    </div>
  </div>
  <div class="page">
    ${sectionsHTML}
  </div>
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:none;";
  document.body.appendChild(iframe);
  const doc = iframe.contentWindow?.document;
  if (!doc) { document.body.removeChild(iframe); return; }
  doc.open();
  doc.write(html);
  doc.close();

  // Aguarda imagens/fontes (mínimo para garantir render)
  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => document.body.removeChild(iframe), 2000);
    }
  }, 600);
}
