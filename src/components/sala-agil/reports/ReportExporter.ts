import { ReportConfig } from './types';

// ─── Tipos internos de dados que cada relatório consome
export interface ActivityRow {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  hours: number;
  huCode: string;
  huTitle?: string;
  developerName: string;
  developerRole: string;
}

export interface ReportData {
  sprintName: string;
  sprintStart?: string;
  sprintEnd?: string;
  periodStart: string;
  periodEnd: string;
  teamName: string;
  activities: ActivityRow[];
  developers: { id: string; name: string; role: string }[];
}

// ─── Helper: agrupar atividades por HU
function groupByHU(acts: ActivityRow[]) {
  const map = new Map<string, { huCode: string; huTitle: string; acts: ActivityRow[]; subtotal: number }>();
  for (const a of acts) {
    const key = a.huCode || 'SEM-HU';
    if (!map.has(key)) map.set(key, { huCode: a.huCode || '—', huTitle: a.huTitle || '', acts: [], subtotal: 0 });
    const g = map.get(key)!;
    g.acts.push(a);
    g.subtotal += Number(a.hours) || 0;
  }
  return [...map.values()];
}

// ─── Helper: carrega logo Axion como base64 para embed no PDF
async function loadLogoBase64(): Promise<string | null> {
  try {
    const res = await fetch('/axion-logo.png');
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ─── Gerador de CSV (sem coluna Tipo, agrupado por HU)
function buildCSV(data: ReportData, scope: string): string {
  const headers = ['Membro', 'Cargo', 'Código', 'Título da Atividade', 'Status', 'Início', 'Fim', 'Horas', 'HU'];
  const devs = scope === 'all'
    ? data.developers
    : data.developers.filter(d => d.id === scope);

  const rows: string[][] = [];
  for (const dev of devs) {
    const acts = data.activities.filter(a => a.developerName === dev.name);
    const groups = groupByHU(acts);
    let devTotal = 0;
    for (const g of groups) {
      if (g.huCode !== '—') rows.push([dev.name, dev.role, '', `=== ${g.huCode}${g.huTitle ? ' — ' + g.huTitle : ''} ===`, '', '', '', '', g.huCode]);
      for (const a of g.acts) {
        rows.push([dev.name, dev.role, a.code, a.title, a.status, a.startDate, a.endDate, String(a.hours), a.huCode]);
      }
      rows.push([dev.name, '', `SUBTOTAL ${g.huCode}`, '', '', '', '', String(g.subtotal), '']);
      devTotal += g.subtotal;
    }
    rows.push([dev.name, '', 'TOTAL', '', '', '', '', String(devTotal), '']);
  }

  const escape = (s: string) => s.includes(',') || s.includes('"') ? `"${s.replace(/"/g, '""')}"` : s;
  return [headers.join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
}

// ─── Gerador de XLSX (1 aba por membro, sem Tipo, agrupado por HU)
async function buildXLSX(data: ReportData, scope: string, sprintName: string) {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const devs = scope === 'all'
    ? data.developers
    : data.developers.filter(d => d.id === scope);

  for (const dev of devs) {
    const acts = data.activities.filter(a => a.developerName === dev.name);
    const groups = groupByHU(acts);
    const headers = ['Código', 'Título da Atividade', 'Status', 'Início', 'Fim', 'Horas', 'HU'];
    const rows: (string | number)[][] = [];
    let devTotal = 0;
    for (const g of groups) {
      if (g.huCode !== '—') rows.push(['', `─── ${g.huCode}${g.huTitle ? ' — ' + g.huTitle : ''} ───`, '', '', '', '', g.huCode]);
      for (const a of g.acts) rows.push([a.code, a.title, a.status, a.startDate, a.endDate, a.hours, a.huCode]);
      rows.push([`SUBTOTAL ${g.huCode}`, '', '', '', '', g.subtotal, '']);
      devTotal += g.subtotal;
    }
    rows.push(['TOTAL', '', '', '', '', devTotal, '']);

    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws['!cols'] = headers.map((h, i) => ({ wch: i === 1 ? 50 : Math.max(h.length, 14) }));
    const sheetName = dev.name.split(' ').slice(0, 2).join(' ').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }
  XLSX.writeFile(wb, `Produtividade_Faturamento_${sprintName}.xlsx`);
}

// ─── Gerador de PDF com logo Axion, sem Tipo, agrupado por HU
async function buildPDF(
  data: ReportData,
  scope: string,
  sprintName: string,
  emittedBy: string,
  reportTitle = 'Relatório de Produtividade Individual — Faturamento',
  restrictLabel = 'Uso restrito — Setor de Faturamento',
) {
  const { default: jsPDF } = await import('jspdf');
  const autoTable = (await import('jspdf-autotable')).default;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const devs = scope === 'all'
    ? data.developers
    : data.developers.filter(d => d.id === scope);

  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR');
  const timeStr = now.toLocaleTimeString('pt-BR');
  const periodStart = data.sprintStart || data.periodStart;
  const periodEnd   = data.sprintEnd   || data.periodEnd;

  // Carrega logo
  const logoBase64 = await loadLogoBase64();

  devs.forEach((dev, idx) => {
    if (idx > 0) doc.addPage();

    // ── Faixa de cabeçalho institucional
    doc.setFillColor(79, 70, 229);
    doc.rect(0, 0, 297, 26, 'F');

    // Logo Axion no cabeçalho (fundo transparente sobre o roxo)
    if (logoBase64) {
      try {
        // Altura fixa de 18mm, largura proporcional (~18mm)
        doc.addImage(logoBase64, 'PNG', 8, 4, 18, 18);
      } catch { /* ignora erro de imagem */ }
    }

    // Textos do cabeçalho
    const textX = logoBase64 ? 30 : 10;
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('Axion — Operações & Fluxo Ágil', textX, 10);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.text(reportTitle, textX, 17);
    doc.setFontSize(8);
    doc.text(`Emitido em: ${dateStr} às ${timeStr}  ·  Por: ${emittedBy}`, 160, 10, { align: 'left' });
    doc.text(restrictLabel, 160, 17, { align: 'left' });

    // ── Sub-header do membro
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text(dev.name, 10, 36);
    doc.setFontSize(9); doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    const metaLine = [dev.role, sprintName, periodStart && periodEnd ? `${periodStart} → ${periodEnd}` : '', data.teamName ? `Time: ${data.teamName}` : '']
      .filter(Boolean).join('  ·  ');
    doc.text(metaLine, 10, 42);
    doc.setDrawColor(226, 232, 240);
    doc.line(10, 45, 287, 45);

    // ── Tabela agrupada por HU
    const acts = data.activities.filter(a => a.developerName === dev.name);
    const groups = groupByHU(acts);
    const totalH = acts.reduce((s, a) => s + (Number(a.hours) || 0), 0);

    const body: any[][] = [];
    for (const g of groups) {
      if (g.huCode !== '—') {
        body.push([{
          content: `${g.huCode}${g.huTitle ? '  —  ' + g.huTitle : ''}`,
          colSpan: 6,
          styles: { fillColor: [237, 233, 254], textColor: [55, 48, 163], fontStyle: 'bold', fontSize: 8 },
        }]);
      }
      for (const a of g.acts) {
        body.push([a.code, a.title, a.status, a.startDate, a.endDate, `${a.hours}h`]);
      }
      if (groups.length > 1 || g.huCode !== '—') {
        body.push([{
          content: `SUBTOTAL ${g.huCode}`,
          colSpan: 5,
          styles: { fillColor: [241, 245, 249], textColor: [100, 116, 139], fontStyle: 'bold', fontSize: 8 },
        }, {
          content: `${g.subtotal}h`,
          styles: { fillColor: [241, 245, 249], textColor: [79, 70, 229], fontStyle: 'bold', fontSize: 8 },
        }]);
      }
    }

    autoTable(doc, {
      head: [['Código', 'Título da Atividade', 'Status', 'Início', 'Fim', 'Horas']],
      body,
      startY: 49,
      styles: { fontSize: 8, cellPadding: 2.5, lineColor: [226, 232, 240], lineWidth: 0.1 },
      headStyles: { fillColor: [79, 70, 229], textColor: 255, fontStyle: 'bold', fontSize: 8 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 110 },
        2: { cellWidth: 28 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 18, fontStyle: 'bold', textColor: [79, 70, 229], halign: 'center' },
      },
    });

    // Rodapé
    const pageH = doc.internal.pageSize.height;
    doc.setFontSize(8); doc.setTextColor(148, 163, 184);
    doc.text(`Total: ${totalH}h lançadas  ·  ${acts.length} atividades`, 10, pageH - 8);
    doc.text('Assinatura: _______________________________', 187, pageH - 8);
  });

  doc.save(`Produtividade_Faturamento_${sprintName}.pdf`);
}

// ─── Entry point principal
export async function generateReport(
  config: ReportConfig,
  data: ReportData,
  emittedBy: string,
  preview = false,
  reportTitle?: string,
  restrictLabel?: string,
) {
  const sprint = data.sprintName;
  if (config.format === 'csv') {
    const csv = buildCSV(data, config.memberScope);
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Produtividade_Faturamento_${sprint}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } else if (config.format === 'xlsx') {
    await buildXLSX(data, config.memberScope, sprint);
  } else {
    await buildPDF(data, config.memberScope, sprint, emittedBy, reportTitle, restrictLabel);
  }
}
